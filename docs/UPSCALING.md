# Artwork upscaling: what was done, and what it is not

**Date:** 2026-11-14 · **Cost:** $0 · **Where it ran:** this PC (RTX 3060), nothing uploaded anywhere

## Summary

The 201 owner-supplied frames are 854×480. Stretched across a desktop screen they were being enlarged
2–4×, which is why v1 looked blurry. They are now AI-upscaled to **3840×2160 masters** and delivered
at five widths.

**Be clear about what this is.** It is AI upscaling: a neural network redraws the lines that are
already in each 854×480 frame with clean, sharp edges at a higher pixel count. It does **not** recover
detail the source never had, and it is not a re-render of the original artwork. Line edges are now
crisp at 4K; very fine texture (the speckle inside the dense scribble of the first frames) is
smoothed into cleaner shapes instead of gaining real detail. A true 4K result would need the original
artwork or video at a higher resolution.

## How it was chosen

Five models were run on ten representative frames (1, 2, 30, 48, 95, 96, 97, 150, 190, 201) and
compared against plain Lanczos interpolation, as 4× crops and at delivery scale.

| Model | Result | Verdict |
| --- | --- | --- |
| Lanczos (plain interpolation) | Soft, blurry edges | Baseline only. Not "restored detail". |
| Real-ESRGAN `realesr-animevideov3` | Clean lines, paper tone and line weight preserved, no invented texture | **Chosen** |
| Real-ESRGAN `realesrgan-x4plus` | Invents crackle and hair texture inside shapes | Rejected: artificial detail |
| Real-ESRGAN `realesrgan-x4plus-anime` | Very crisp, but bleaches the paper toward white and rims blurred shapes | Rejected: changes the look |
| Real-CUGAN (conservative, no-denoise) | White halos around lines | Rejected: halos |

**Temporal stability** (does it flicker between frames?), measured as mean absolute change between
consecutive frames, relative to the same change in the source:

- Sample pairs: `animevideov3` ×1.13–1.16, `x4plus-anime` ×1.16–1.19, `x4plus` ×1.22–1.31, Real-CUGAN ×1.37–1.41.
- Two near-identical source frames (001→002, change 0.01 of 255): `animevideov3` 0.03, others 0.05–0.14.
- **Whole sequence, final masters** (all 200 pairs, measured at 960 px): moving pairs change on
  average ×1.08 as much as the source (max ×1.28); the 4 near-still pairs stay near-still
  (0.13 vs 0.08 of 255). No outlier frames. Sharper edges account for the small increase.

## The method (`scripts/upscale-frames.mjs`)

1. **Soft pass:** one 4× pass. Faithful, keeps the footage's depth-of-field blur.
2. **Crisp pass:** a 2× pass then a 3× pass (6×, 5124×2880), which is then *downsampled* to 3840×2160.
   This gives visibly crisper in-focus edges than enlarging the 4× result, but on its own it turns
   the intentionally blurred foreground strands of the closing frames into hard shapes with a faint rim.
3. **Per-pixel mix by source sharpness:** a mask is computed from each *source* frame (local edge
   gradient, dilated and blurred). In-focus lines take the crisp pass; out-of-focus areas keep the
   soft pass. So what was sharp gets sharper and what was blurred stays blurred.

Runtime: about 4 minutes for all 201 frames (GPU passes ~1.5 min, mixing ~1.3 min). Output:
`assets-master/f001..f201.png`, 1.9 GB, not committed and not served directly.

## Delivery (`scripts/build-frames.mjs`)

| Width | AVIF total (201 frames) | Used by |
| --- | --- | --- |
| 960 | 5.1 MB | Data Saver / 2G–3G (every second frame only: about 2.6 MB) |
| 1440 | 6.8 MB | Phones, tablets, small laptops |
| 1920 | 8.2 MB | Most desktops |
| 2560 | 10.4 MB | Large or high-density desktop screens |
| 3840 | 15.2 MB on disk | Never streamed: one frame at a time, when scrolling rests on a big high-density screen |

For comparison, v1 sent every device the same 6.8 MB of 854×480 WebP. AVIF was chosen over WebP
after measuring: about 45% smaller for this line art at the same visual quality, and the same decode
time in Edge (13.5 ms vs 12.6 ms for a 1920×1080 frame). WebP copies exist at 960 and 1920 for
browsers without AVIF.

## Reproducing it

```bash
# 1. Get the free, open-source upscaler (BSD-3-Clause), unpack to .tools/realesrgan/
#    https://github.com/xinntao/Real-ESRGAN/releases  (realesrgan-ncnn-vulkan, Windows build)
npm run upscale     # 854x480 PNGs -> assets-master/ (3840x2160)
npm run frames      # assets-master/ -> public/sequence/w*/ + src/sequence/manifest.json  (~1 hour: AVIF encoding)
```

## Known limits

- Fine speckle texture in frames ~001–040 is simplified, as described above.
- Frames 005–007 are colour-inverted in the source; they are upscaled like the rest and still skipped
  in playback (see `src/sequence/config.ts`).
- Around frames 165–180 the source itself jumps every fourth frame (large change between
  consecutive frames); that stepping is in the supplied footage, not introduced here.
- Commercial-use rights to the artwork are still unverified. Upscaling does not change that.
