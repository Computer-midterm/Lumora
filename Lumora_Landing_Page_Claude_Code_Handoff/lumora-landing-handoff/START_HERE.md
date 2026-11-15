# START HERE — Lumora landing page handoff

**For Claude Code operating in the existing `verifiable-app-builder` repository.**

The product owner is ready for you to **start implementing the marketing landing page**. This is NOT a request for an analysis-only proposal. Read the handoff files and inspect the current code before changing anything; then implement, run, and review a first polished iteration. **Do not deploy or incur costs without approval.**

## Read in this order
1. `PRODUCT_TRUTH.md` — what Lumora is, what is real today, and what is only planned.
2. `LANDING_PAGE_SPEC.md` — actual page behavior, copy constraints, visual direction, scope.
3. `ANIMATION_ASSETS.md` — exact images to use, dimensions, playback rules, and performance.
4. `DESIGN_SKILLS_AND_QA.md` — existing/optional Claude skills and verification checklist.
5. `PROMPT_FOR_CLAUDE_CODE.md` — pasteable mission statement and done criteria.

## Files included
- `assets/frames/ezgif-frame-001.png` through `ezgif-frame-201.png`: **all 201 actual source frames** supplied by the product owner. Use them in the site; do not replace them with generated imagery, an unrelated stock image, or a video.
- `assets/preview/first-frame.png`: convenience copy of frame 001.
- `assets/preview/storyboard.jpg`: quick visual contact sheet; reference only, NOT the displayed sequence.
- `SOURCE_PROJECT_CONTEXT.md`: user-supplied prior project background, for tracing claims and implementation history.

## How to use this handoff
Unzip the archive in the **root of the existing repository**, creating `lumora-landing-handoff/` under that root. Keep it in that folder; **do not overwrite the repository's existing `CLAUDE.md`, `src/`, or config files**. Start Claude Code with the repository as its working directory. Paste `PROMPT_FOR_CLAUDE_CODE.md` or send:

> Read `lumora-landing-handoff/START_HERE.md` and its linked files. Inspect the existing Vite/React/TypeScript project. Now implement the Lumora marketing landing page using the exact 201 PNG frames, with reversible scroll-driven animation, real navigation, honest copy, and a premium polished look. Don't add fabricated information, don't break the builder prototype, test in a browser, and do not deploy.

## Source-of-truth and conflict rules
- Existing project code and actual local tests determine what is *currently implemented*. The historical status in this ZIP is reported, not independently verified; inspect before stating any working product claim.
- Product owner explicitly selected **this frame sequence** for the landing page. It supersedes the earlier colorful/white particle-brain hero concept as the animation asset.
- Do not treat README examples, skill templates, or mockup data as facts about the product or team.
- **Don't invent facts to fill gaps.** For genuinely unknown pricing, launch date, funding amount, support email, domains, user counts, team, statistics, integrations, beta access, or Kickstarter status, omit content or keep it explicitly generic/planned.
- Respect product-owner approval for purchases, new paid services, public launch, and deployment.
