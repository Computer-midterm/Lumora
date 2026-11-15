# Supplied animation assets — USE THESE ACTUAL IMAGES

## Exact assets
- Original source: user-provided `ezgif-488c68dbf54b766c-png-split.zip`.
- Included here as 201 consecutive files: `assets/frames/ezgif-frame-001.png` through `assets/frames/ezgif-frame-201.png`.
- Dimensions verified on source files: **854 × 480 pixels**, RGB, **201 frames**.
- Sequence content: black-ink/string-like human figure against a pale backdrop, evolving and closing in toward a dense mesh of lines. **This is not the earlier white neural brain image**.
- The exact frame order is important. Frame 001 is hero poster/top position; frame 201 is the scroll endpoint.

## Rights and provenance
The product owner explicitly instructed us to **actually use the supplied images**. Implement with them as requested rather than treating them only as inspiration. The user provided this material; the original video appears to be sourced from a Rawpixel-labelled export. An independent asset-license review was *not* performed here. Do not claim rights are independently verified; flag any public-launch licensing review without blocking local implementation.

## Requirements for mapping images to scroll
- Frame index should be derived deterministically from scroll progress in the pinned sequence (0 -> 1; 1 -> 201), clamped to the valid range.
- Up scroll reverses; top always = first frame. Keep first frame as a dependable image fallback.
- Smooth scrubbing, no missing-frame flicker. Use efficient caching/decoding and a clear fallback for slow connections.
- Keep the animation's actual aesthetic and composition; don't overlay an unrelated brain or 3D substitute.
- Respect aspect ratio. Prefer faithful image sequence to re-rendering the original artwork.

## Deployment/optimization considerations
201 PNGs represent tens of megabytes of source imagery. Do **not** serve the full unoptimized source sequence to every visitor by default. Generate quality-controlled optimized derivatives, try progressive loading and mobile-appropriate resolution, benchmark, and keep the original PNGs intact as source assets for reproducibility. Source files in this handoff are intentionally unmodified.
