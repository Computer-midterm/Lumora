// Builds the 3840x2160 master sequence from the owner-supplied 854x480 frames.
//
//   npm run upscale            (needs the Real-ESRGAN ncnn-vulkan binary, see README; GPU, ~20 min)
//
// What this is, honestly: AI upscaling (Real-ESRGAN "realesr-animevideov3", BSD-3-Clause, run locally).
// It redraws the existing lines with clean, sharp edges at a higher pixel count. It does NOT recover
// detail that the 854x480 source never contained, and it is not a re-render of the original artwork.
//
// Method (chosen after testing 5 models on sample frames; see docs/UPSCALING.md):
//   1. "soft"  = one 4x pass                    -> faithful, keeps the footage's depth-of-field blur
//   2. "crisp" = a 2x pass then a 3x pass (6x)  -> supersampled, crisper in-focus line edges
//   3. Both are resampled to 3840x2160 and mixed per pixel by how sharp the SOURCE is at that spot:
//      in-focus lines take "crisp"; blurred foreground strands keep "soft" (so the blur stays a blur).
//
// Input  (never modified): <handoff>/assets/frames/ezgif-frame-001..201.png
// Output: assets-master/f001..f201.png (3840x2160, not served directly; `npm run frames` derives web sizes)

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'Lumora_Landing_Page_Claude_Code_Handoff', 'lumora-landing-handoff', 'assets', 'frames');
const OUT = path.join(root, 'assets-master');
const WORK = path.join(root, '.tools', 'work');
const EXE = process.env.REALESRGAN ?? path.join(root, '.tools', 'realesrgan', 'realesrgan-ncnn-vulkan.exe');
const MODEL = 'realesr-animevideov3';
const W = 3840;
const H = 2160;
const SW = 854;
const SH = 480;

// Optional: `node scripts/upscale-frames.mjs 1 12` processes only frames 1..12 (for trials).
const from = Number(process.argv[2] ?? 1);
const to = Number(process.argv[3] ?? 201);

if (!existsSync(EXE)) {
  console.error(`Real-ESRGAN not found at ${EXE}.\nDownload realesrgan-ncnn-vulkan (github.com/xinntao/Real-ESRGAN releases) and unpack it to .tools/realesrgan, or set REALESRGAN=<path to exe>.`);
  process.exit(1);
}

const names = (await readdir(SRC))
  .filter((f) => /^ezgif-frame-\d{3}\.png$/.test(f))
  .sort()
  .filter((f) => {
    const n = Number(f.match(/(\d{3})/)[1]);
    return n >= from && n <= to;
  });
if (!names.length) throw new Error('No source frames found');

const dirs = { in: path.join(WORK, 'in'), x4: path.join(WORK, 'x4'), x2: path.join(WORK, 'x2'), x6: path.join(WORK, 'x6') };
await rm(WORK, { recursive: true, force: true });
for (const d of Object.values(dirs)) await mkdir(d, { recursive: true });
await mkdir(OUT, { recursive: true });
for (const f of names) await copyFile(path.join(SRC, f), path.join(dirs.in, `f${f.match(/(\d{3})/)[1]}.png`));

const esrgan = async (input, output, scale) => {
  const t = Date.now();
  await run(EXE, ['-i', input, '-o', output, '-n', MODEL, '-s', String(scale), '-f', 'png'], { cwd: path.dirname(EXE), maxBuffer: 1 << 26 });
  console.log(`  ${path.basename(input)} -> ${path.basename(output)} (x${scale}) in ${((Date.now() - t) / 1000).toFixed(0)}s`);
};

console.log(`Upscaling ${names.length} frames with ${MODEL} ...`);
await esrgan(dirs.in, dirs.x4, 4);
await esrgan(dirs.in, dirs.x2, 2);
await esrgan(dirs.x2, dirs.x6, 3);
await rm(dirs.x2, { recursive: true, force: true });

/**
 * Sharpness mask from the source frame: 0 where edges are soft (out of focus), 1 where they are crisp.
 * Local gradient magnitude -> dilate -> blur -> smoothstep, then upsampled to the master size.
 */
async function sharpnessMask(srcFile) {
  const g = await sharp(srcFile).greyscale().raw().toBuffer();
  const grad = Buffer.alloc(SW * SH);
  for (let y = 1; y < SH - 1; y++) {
    for (let x = 1; x < SW - 1; x++) {
      const i = y * SW + x;
      const gx = (g[i + 1] - g[i - 1]) / 2;
      const gy = (g[i + SW] - g[i - SW]) / 2;
      grad[i] = Math.min(255, Math.hypot(gx, gy) * 2); // x2 for headroom in 8 bits
    }
  }
  // A crisp ink edge in the source measures ~100+ per px here; a depth-of-field edge ~10-40.
  const LO = 44;
  const HI = 96;
  const dilated = await sharp(grad, { raw: { width: SW, height: SH, channels: 1 } })
    .dilate(2)
    .blur(2.2)
    .raw()
    .toBuffer();
  for (let i = 0; i < dilated.length; i++) {
    const t = Math.min(1, Math.max(0, (dilated[i] - LO) / (HI - LO)));
    dilated[i] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return sharp(dilated, { raw: { width: SW, height: SH, channels: 1 } }).resize(W, H, { kernel: 'cubic' }).raw().toBuffer();
}

console.log('Combining into 3840x2160 masters ...');
const t0 = Date.now();
let done = 0;
const queue = [...names];
const worker = async () => {
  for (let f = queue.shift(); f; f = queue.shift()) {
    const id = `f${f.match(/(\d{3})/)[1]}`;
    const [soft, crisp, mask] = await Promise.all([
      sharp(path.join(dirs.x4, `${id}.png`)).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).raw().toBuffer(),
      sharp(path.join(dirs.x6, `${id}.png`)).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).raw().toBuffer(),
      sharpnessMask(path.join(SRC, f)),
    ]);
    const out = Buffer.allocUnsafe(soft.length);
    for (let p = 0, i = 0; p < mask.length; p++, i += 3) {
      const m = mask[p];
      const k = 255 - m;
      out[i] = (soft[i] * k + crisp[i] * m + 127) / 255;
      out[i + 1] = (soft[i + 1] * k + crisp[i + 1] * m + 127) / 255;
      out[i + 2] = (soft[i + 2] * k + crisp[i + 2] * m + 127) / 255;
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 6 }).toFile(path.join(OUT, `${id}.png`));
    await rm(path.join(dirs.x4, `${id}.png`), { force: true });
    await rm(path.join(dirs.x6, `${id}.png`), { force: true });
    if (++done % 20 === 0 || done === names.length) console.log(`  ${done}/${names.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
};
await Promise.all([worker(), worker(), worker()]);
await rm(WORK, { recursive: true, force: true });
console.log(`Done: ${names.length} masters in assets-master/ (${W}x${H}).`);
