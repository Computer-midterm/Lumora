# Claude Code design skills, workflow, and quality checks

## Skills that were discussed earlier
**Taste Skill** and **MotionSites** were mentioned in earlier planning. The product owner authorized installing those previously, but their successful installation in this local Claude environment has **NOT been verified**. Check current available skills before claiming they are active.

- MotionSites Claude landing-page skill: https://github.com/Motionsites-AI/claude-skill — public instructions include a Claude Code plugin or manual skill install.
- A Taste frontend-design skill is also discussed; **the exact previously chosen package is not confirmed**. Avoid silently picking a similarly named project. Inspect existing `.claude/skills/`, plugins and project instructions; use whichever already installed Taste skill matches the owner's earlier setup. If it is absent/ambiguous, note that explicitly and build using project standards without substituting an unknown tool.
- Optional Figma MCP was discussed, but should **not** be assumed connected or required. No auto-login, subscription or purchase.

These are aids, not substitutes for inspecting and improving actual rendered output. Don't stack numerous overlapping skills to the point of conflicting instructions. Preserve the project's own `CLAUDE.md` and existing conventions.

## Recommended working loop
1. Inspect repo status, routes, dependencies, tests, history, existing instructions and any installed design skills.
2. Create or modify only the needed **marketing-page** components, styles and assets, preserving working app features.
3. Use the supplied frame sequence, not an invented rendering.
4. Run the site locally and inspect in a real browser (Playwright if available) at multiple viewport sizes. Iterate on spacing, copy, scrolling, overflow and asset loading.
5. Run relevant checks and report exact results; never claim a check ran if it did not.
6. Present screenshots and a concise technical handoff, including pending issues and any licensing/brand questions for later review.

## QA checklist
- [ ] Project starts with existing scripts and expected entry route.
- [ ] No existing builder functionality broken; old tests still pass or failures are explained.
- [ ] Hero poster/frame 001 present on first paint (no loading flash).
- [ ] Forward/down scroll frame progression from 001 to 201.
- [ ] Reverse/up scroll correctly returns to 001 and holds there.
- [ ] Scroll progression smooth during repeated/rapid inputs; sensible fallback during late network responses.
- [ ] Desktop 1440px, laptop 1024px, mobile 390px, narrow mobile 320px reviewed.
- [ ] No horizontal overflow, overly small text or important image subjects cropped without intent.
- [ ] Reduced motion and basic keyboard/navigation accessibility tested.
- [ ] Optimized asset output and network loading checked; source 201 PNGs preserved.
- [ ] CTAs real and content truth-checked against actual repository status.
- [ ] No unapproved spending, remote deployment, paid integrations or fake social proof.

## Model
The product owner says they are using Claude Opus 5.5 at Extra High thinking effort. Apply their configured model/effort if available; do not claim to verify which exact model is active from this ZIP.
