# Lumora landing page — session handoff

**Updated:** 2026-11-14 (session 1: first implementation)
**Project folder:** `C:\Users\lmeza\Downloads\Lumora` (owner instruction: work **only** here; do not use or
modify `Downloads\Lumora_Browser_Frontend_Context_v3\verifiable-app-builder` or any other checkout)
**Deployment:** none · **Spending:** $0 · **Git:** this folder is not a git repository (nothing committed or pushed)

## What exists now

- A new, self-contained Vite 8.3.5 + React 19.3.1 + TypeScript 7.0.2 project at the folder root. The
  handoff folder `Lumora_Landing_Page_Claude_Code_Handoff/` is untouched.
- Landing page: pinned scroll-driven hero playing the supplied frames, two captions, an ink-rise
  transition into **The problem**, **Planned workflow** (6 steps, labelled *Not built yet*), **Current
  progress** (status ledger) and a **Closing** section using frame 096 as a still. Header with section
  links (phone: menu), footer.
- Frame pipeline: 201 source PNGs (56.5 MB) → 201 WebP files at the native 854×480 (6.83 MB, poster
  37 KB) plus a manifest with each frame's backdrop colour (`npm run frames`).
- Tests: 20 unit tests (`node --test`) and 36 Playwright/Edge tests (34 run, 2 project-specific skips).
- Review screenshots: `docs/screenshots/index.html` (23 images: desktop, laptop, tablet, phone, 320 px,
  reduced motion, open menu).

## Verification (Windows 11, Node 24.13.1, Microsoft Edge 157 via Playwright channel `msedge`, headless)

| Check | Result |
| --- | --- |
| `npm test` (unit → type-check → build → e2e) | PASS: 20/20 unit · build OK · 34 passed, 2 skipped (desktop nav on phone / phone menu on desktop) |
| `npm audit` | 0 vulnerabilities |
| First paint (JS disabled) | frame 001 visible from HTML alone |
| Load (throttled ~9 Mbps) | FCP 208 ms; **LCP = frame-001 poster, 228 ms**; CLS 0.0015 |
| Poster → canvas hand-off | mean pixel diff 0.32 (a 1 px shift = 10.3) → no shift, no flash |
| Scroll down / up | monotonic forward to 201, reverse to 001, holds 001 at top (desktop wheel + phone touch) |
| Fast fling, cold cache | no blank / hidden canvas sample, no backwards step, frame 001 held at the top |
| Reload mid-sequence / anchor + Back | same frame restored without replaying; back to top shows 001 |
| Frame-time (headless, CPU raster) | median 17.5 ms, p95 ≤ 18.7 ms; 0–2 frames > 34 ms even at 4× CPU throttle |
| Memory | decoded bitmaps capped at 62 (desktop) / 38 (phone); JS heap 4–5 MB |
| Network | before interaction: poster + 25 keyframes; after: all frames, < 8 MB total, WebP only |
| Accessibility | axe WCAG 2.0–2.2 A/AA: 0 serious/critical at 5 scroll positions; skip link; focus ring; menu Esc + focus return |
| Layout | no horizontal overflow at 1440/1280/1024/820/768/390/320 |
| Dev server | `npm run dev` checked in Edge: loads, scrubs to 201, no console problems |

Defects found and fixed during this session: right-edge strip from the reserved scrollbar gutter;
"Problem" link landing on the empty lead-in; phone captions covering the animation (now they pass
*under* the image and dissolve into a paper backplate); captions mixing with the image's faded edge;
reduced motion overlapping the dark section; closing still cut off at the section edge; brand-link
accessible-name mismatch (WCAG 2.5.3); scroll-cue contrast; a backwards micro-step while frames were
still decoding; replay from frame 001 after a reload; `playwright-core@1.65.1` (published the same day)
pulled in by axe, pinned to 1.64.1 with an npm override.

## Decisions waiting for the owner

1. **Frames 005–007 are skipped in playback** (`src/sequence/config.ts` → `SKIPPED_FRAMES`). They are
   colour-inverted in the source (dark grey backdrop, white figure) and read as a dark flash right
   when scrolling starts, which conflicts with "never flash". Order is unchanged; files still exist.
   Set `SKIPPED_FRAMES = []` to play all 201 exactly as supplied.
2. **"Workspace interface: Early prototype" row** in Current progress. It is based on the handoff's
   *reported* prototype (briefs, requirements review), which was **not verified from this folder**
   because the owner asked not to use the old checkout. Keep, reword or remove.
3. **Primary CTA = "See the approach"** (in-page). This folder has no working prototype route to
   link to.
4. **Image licence**: reportedly a Rawpixel-labelled export; not independently verified. Needed
   before any public use.
5. **Brand**: "Lumora" is shown as a working name; the page is `noindex`. Not cleared for public launch.
6. **Version control**: recommend `git init` + a first local commit (not done; needs your go-ahead).
7. Visual direction sign-off: Instrument Serif / Instrument Sans / Geist Mono (all OFL, self-hosted),
   paper → slate → ink palette taken from the footage, one vermilion accent.

## Known limitations

- Tested only in Microsoft Edge (Chromium), headless, on this PC. Not yet tested in Safari (incl. iOS),
  Firefox or on real phones; no manual screen-reader pass.
- The frames are 854×480, so they are upscaled on large and high-density screens. Higher-resolution
  source frames would sharpen the hero.
- Page text is rendered by JavaScript; without JS only frame 001 and a short notice show.
- After the first interaction, desktop downloads about 6.8 MB of frames (half with Data Saver).
- The old `verifiable-app-builder` dev server is still running on port 5173 (PID 18528 at the time);
  left untouched.

## Next steps

1. Owner reviews `docs/screenshots/index.html` and the live page (`npm run build && npm run preview`
   → http://127.0.0.1:4180) and decides items 1–7.
2. Cross-browser pass (Safari/iOS, Firefox) and a real-phone check; manual screen-reader pass.
3. If wanted: prerender the page HTML at build time (text without JS, faster first contentful paint).
4. Before any public launch: licence review of the frames, brand clearance, hosting/privacy decisions.
