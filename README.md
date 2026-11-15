# Lumora — landing page (local, not deployed)

Marketing landing page for **Lumora** (a *working name*), an AI app builder in early development.
Vite + React + TypeScript. Runs locally only: nothing is deployed, there is no backend, no analytics,
no forms and no third-party requests (fonts are self-hosted).

The hero is a scroll-driven playback of the owner-supplied 201-frame ink-line sequence, AI-upscaled
from 854×480 to 3840×2160 and delivered at the resolution each device needs.

## Run it

Requires Node 20.19+ (built and tested with Node 24.13.1). Browser tests use the installed Microsoft Edge.

```bash
npm ci --ignore-scripts   # exact pinned dependencies, no install scripts
npm run dev               # http://127.0.0.1:5180  (client-rendered; fine for development)
npm run build             # type-check + production build + prerender into dist/index.html
npm run preview           # serve dist/ at http://127.0.0.1:4180
npm test                  # unit tests + build + Playwright/Edge end-to-end suite
npm run screenshots       # with `npm run preview` running: docs/screenshots/*.png + index.html
```

Ports 5180/4180 are used so this project never collides with other local Vite servers.

## What's where

| Path | What it is |
| --- | --- |
| `src/content.ts` | **All page copy**, in one place, so every claim can be reviewed. |
| `src/components/ScrollSequence.tsx` | Hero: pinned stage, poster, canvas, headline, deck, chapters. |
| `src/components/Problem.tsx` | "As demoed / as tested" illustration with four marked findings. |
| `src/components/Approach.tsx` | Planned workflow as one line: tangle → five checkpoints, loop, project memory. |
| `src/components/Workspace.tsx` | Tabbed **concept sketches** of the intended workspace (labelled, example data). |
| `src/components/Sections.tsx` | Status band, closing, footer. |
| `src/sequence/frameMath.ts`, `tiers.ts` | Pure scroll → frame math and resolution-tier selection (unit-tested). |
| `src/sequence/FrameCache.ts` | Progressive fetching, off-thread decoding, bounded decoded-frame cache. |
| `src/sequence/SequenceEngine.ts` | Drives the canvas from scroll: smoothing, drawing, full-bleed glide, rest-frame sharpening. |
| `src/sequence/config.ts` | Sequence settings, incl. `SKIPPED_FRAMES`. |
| `src/sequence/manifest.json` | Generated: frame count, widths, sizes and each frame's backdrop colour. |
| `src/entry-server.tsx`, `scripts/prerender.mjs` | Build-time render of the page into `dist/index.html`. |
| `public/sequence/w<width>/` | Generated frames: AVIF at 960/1440/1920/2560/3840, WebP fallback at 960/1920 (72 MB on disk). |
| `assets-master/` | Generated 3840×2160 PNG masters (1.9 GB, git-ignored). |
| `scripts/upscale-frames.mjs`, `build-frames.mjs` | The artwork pipeline (see below). |
| `tests/unit/`, `tests/e2e/` | Node test runner; Playwright + axe in Edge (desktop 1440×900, phone 390×844). |
| `docs/HANDOFF.md` | Session handoff: state, evidence, open decisions, next steps. |
| `docs/UPSCALING.md` | How the artwork was upscaled, what was tested, and its honest limits. |
| `docs/screenshots/`, `docs/screenshots-v1/` | Current review screenshots, and the v1 set for comparison. |
| `backups/` | Tarball of the v1 source (git-ignored). |

## Artwork pipeline

```
owner's 854×480 PNGs ──npm run upscale──▶ assets-master/ (3840×2160) ──npm run frames──▶ public/sequence/w*/
```

- `npm run upscale` needs the free Real-ESRGAN ncnn-vulkan binary unpacked at `.tools/realesrgan/`
  (see `docs/UPSCALING.md`). About 4 minutes on an RTX 3060. The source PNGs are never modified.
- `npm run frames` re-encodes the masters (about an hour: AVIF encoding is slow).
- Neither step is part of `npm run build`; the generated frames in `public/sequence` are what ships.

## How the scroll sequence works

- **First paint without JavaScript:** the whole page, including frame 001 as a real `<img>` with
  `srcset`, is prerendered into `index.html`, and the page colour matches the frame's backdrop.
- **Motion is opt-in by CSS class:** an inline script adds `html.motion` before first paint unless the
  visitor prefers reduced motion. Without it (reduced motion, or no JavaScript) nothing is pinned:
  a still first screen, captions in normal flow, and no frame downloads.
- **Mapping:** a tall track holds a sticky stage. Progress = scrolled distance / track length, clamped
  to 0–1; 0 is exactly frame 001, 1 is exactly frame 201. Scrolling up reverses through the same frames.
- **One resolution per device** (`tiers.ts`): chosen from the artwork's on-screen size, pixel density,
  memory and connection. Phones 1440 (960 on Data Saver/2G–3G, every second frame), most desktops
  1920, large or high-density desktops 2560.
- **Rest frame:** when scrolling stops, that one frame is redrawn from a sharper file (up to 3840 on
  big high-density screens). 4K frames are never part of the scrolling download.
- **Never blank, never backwards:** the canvas only redraws when the frame changes and never clears
  without drawing. If the exact frame isn't decoded yet, the engine holds what is on screen; it never
  shows a frame from beyond the target and then steps back.
- **Loading plan:** poster first, then every 8th frame once idle, then the rest coarse-to-fine on the
  first interaction (or after 4 s). Frames near the current position jump the queue.
- **Memory:** decoded frames are bounded by a byte budget (about 150 MB desktop, 72 MB phones), not a
  fixed count, so bigger frames mean a smaller window.
- **Layout:** in landscape the headline runs across the bottom, difference-blended over the artwork
  (black on paper, paper-coloured over ink), with the deck in a right column. Midway the image goes
  full-bleed with no extra zoom, and the dark next section rises over the closing frames. In portrait
  the image is pinned on top and the copy scrolls under it.
- **No animation library:** native sticky + `requestAnimationFrame`.

## Honesty rules (from the handoff)

No invented users, customers, testimonials, metrics, prices, dates, partners, waitlists, sign-ups or
campaigns. The build → test → repair workflow is labelled **planned / not built**. The workspace
views are labelled **concept sketches with made-up example data**, and the booking screen in the
problem section is labelled an **illustration**. "Lumora" is a working name.
`tests/e2e/quality.spec.ts` guards the copy against the obvious violations.

## Asset provenance

The 201 PNGs were supplied by the product owner (reportedly a Rawpixel-labelled export). **The licence
has not been independently verified, and upscaling does not change that.** Public use needs a licence
review first. Fonts: Instrument Serif, Instrument Sans, Geist Mono (all OFL, self-hosted).
