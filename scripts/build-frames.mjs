// Derives the web-ready scroll sequence from the 3840x2160 masters.
//
//   npm run frames
//
// Input : assets-master/f001..f201.png  (made by `npm run upscale` from the owner-supplied 854x480 PNGs)
// Output: public/sequence/w<width>/f001..f201.avif for each delivery width (AVIF: ~45% smaller than
//         WebP for this line art, same decode speed), WebP copies at two widths for browsers
//         without AVIF, plus
//         src/sequence/manifest.json (bundled: frame count, widths, sizes, per-frame backdrop colour).
//
// Each visitor downloads ONE width, chosen in the browser from the size of the artwork on their
// screen, pixel density, memory and connection (src/sequence/tiers.ts). 3840 is only ever fetched
// one frame at a time, to sharpen the frame a large high-density screen comes to rest on.

import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_DIR = path.join(root, 'assets-master');
const SOURCE_DIR = path.join(root, 'Lumora_Landing_Page_Claude_Code_Handoff', 'lumora-landing-handoff', 'assets', 'frames');
const OUT_DIR = path.join(root, 'public', 'sequence');
const MANIFEST = path.join(root, 'src', 'sequence', 'manifest.json');
const EXPECTED_FRAMES = 201;
const MASTER = { width: 3840, height: 2160 };

/** Delivery widths (16:9). `avif` = quality; `webp` = fallback quality where a fallback is built. */
const TIERS = [
  { width: 960, avif: 50, webp: 64 },
  { width: 1440, avif: 46 },
  { width: 1920, avif: 44, webp: 60 },
  { width: 2560, avif: 42 },
  { width: 3840, avif: 40 },
];

if (!existsSync(MASTER_DIR)) {
  console.error('assets-master/ not found. Run `npm run upscale` first (see README: "Artwork pipeline").');
  process.exit(1);
}
const files = (await readdir(MASTER_DIR)).filter((f) => /^f\d{3}\.png$/.test(f)).sort();
if (files.length !== EXPECTED_FRAMES) throw new Error(`Expected ${EXPECTED_FRAMES} masters in assets-master/, found ${files.length}`);
files.forEach((f, i) => {
  if (Number(f.slice(1, 4)) !== i + 1) throw new Error(`Frame order gap at ${f}`);
});

await rm(OUT_DIR, { recursive: true, force: true });
for (const t of TIERS) await mkdir(path.join(OUT_DIR, `w${t.width}`), { recursive: true });

/** Median colour of the brighter pixels in a band around the frame edge (ignores the black strands). */
async function borderBackdrop(file) {
  const W = 120;
  const H = 68;
  const data = await sharp(file).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const band = 7;
  const px = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x >= band && x < W - band && y >= band && y < H - band) continue;
      const i = (y * W + x) * 3;
      px.push({ r: data[i], g: data[i + 1], b: data[i + 2], l: 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] });
    }
  }
  px.sort((a, b) => a.l - b.l);
  const slice = px.slice(Math.floor(px.length * 0.6), Math.floor(px.length * 0.92));
  const med = (k) => slice.map((p) => p[k]).sort((a, b) => a - b)[Math.floor(slice.length / 2)];
  return `#${[med('r'), med('g'), med('b')].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const bytes = Object.fromEntries(TIERS.map((t) => [t.width, 0]));
const webpBytes = Object.fromEntries(TIERS.filter((t) => t.webp).map((t) => [t.width, 0]));
const backdrops = new Array(files.length);
const t0 = Date.now();
let done = 0;
sharp.concurrency(2);
const queue = files.map((f, i) => [f, i]);
const worker = async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const [f, i] = job;
    const src = path.join(MASTER_DIR, f);
    const meta = await sharp(src).metadata();
    if (meta.width !== MASTER.width || meta.height !== MASTER.height) throw new Error(`${f} is ${meta.width}x${meta.height}, expected 3840x2160`);
    const base = f.replace('.png', '');
    for (const t of TIERS) {
      const resized = () => {
        const img = sharp(src);
        return t.width === MASTER.width ? img : img.resize(t.width, Math.round((t.width * 9) / 16), { kernel: 'lanczos3' });
      };
      const dir = path.join(OUT_DIR, `w${t.width}`);
      // Sizes are read back from disk: sharp's reported size is not reliable for AVIF.
      await resized().avif({ quality: t.avif, effort: 5 }).toFile(path.join(dir, `${base}.avif`));
      bytes[t.width] += (await stat(path.join(dir, `${base}.avif`))).size;
      if (t.webp) {
        await resized().webp({ quality: t.webp, effort: 5, smartSubsample: true }).toFile(path.join(dir, `${base}.webp`));
        webpBytes[t.width] += (await stat(path.join(dir, `${base}.webp`))).size;
      }
    }
    // Backdrop is sampled from the untouched source frame so page colour matches the original footage.
    backdrops[i] = await borderBackdrop(path.join(SOURCE_DIR, `ezgif-frame-${f.slice(1, 4)}.png`));
    if (++done % 25 === 0 || done === files.length) console.log(`  ${done}/${files.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
};
await Promise.all(Array.from({ length: Math.max(2, Math.min(4, os.cpus().length >> 2)) }, worker));

const manifest = {
  version: 2,
  source: 'Owner-supplied 201-frame 854x480 PNG sequence, AI-upscaled locally to 3840x2160 (Real-ESRGAN animevideov3) and re-encoded. No reframing.',
  count: files.length,
  aspect: [16, 9],
  tiers: TIERS.map((t) => ({ width: t.width, height: Math.round((t.width * 9) / 16), bytes: bytes[t.width] })),
  /** Widths that also exist as WebP, for browsers that cannot decode AVIF. */
  fallback: TIERS.filter((t) => t.webp).map((t) => ({ width: t.width, height: Math.round((t.width * 9) / 16), bytes: webpBytes[t.width] })),
  pattern: 'w{WIDTH}/f{NNN}.{avif|webp}',
  backdrops,
};
await mkdir(path.dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

for (const t of TIERS) {
  const fb = t.webp ? ` | webp fallback ${(webpBytes[t.width] / 1048576).toFixed(1)} MB` : '';
  console.log(`  ${String(t.width).padStart(4)}px avif: ${(bytes[t.width] / 1048576).toFixed(1)} MB total, avg ${(bytes[t.width] / files.length / 1024).toFixed(0)} KB/frame${fb}`);
}
console.log(`Backdrop: frame 1 ${backdrops[0]}, frame 100 ${backdrops[99]}, frame 201 ${backdrops[200]}`);
