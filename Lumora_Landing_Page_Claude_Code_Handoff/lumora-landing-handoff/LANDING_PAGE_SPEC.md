# Marketing landing-page design and implementation specification

## Scope: BUILD NOW
Create a highly polished **real** marketing landing page in the existing Vite/React/TypeScript repo, preserving all existing builder functionality. This is a marketing surface, not the autonomous coding backend. Start implementation after reading the actual repo; don't stop after making a plan or asking for approval on routine visual decisions. The product owner will review the first working local version before deployment.

## Creative direction — specifically for this supplied animation
The selected source asset is a **black, tangled-line human silhouette on a pale, neutral background**, morphing/changing into a dramatic close-up of interconnected lines over 201 frames. The *actual look of the supplied footage* is the source of truth: **do not pretend it is a luminous brain on black**, and do not substitute previously considered particle-brain art. Make the hero visually integrated into this asset.

Design signature: restrained, art-directed, intellectually interesting, editorial technology brand. Aim for expensive-looking typography, deliberate whitespace, confident hierarchy, and an unusual but legible concept. Consider off-white/pale-gray around the source frames with ink-black typography and a carefully limited single accent; a dark follow-up section may be appropriate. Keep mobile composition deliberate. Avoid generic gradient mesh, glass-card overload, pretend terminal interfaces, emoji overload, rainbow neon, and broad off-brand decorative effects.

## Above-the-fold
- Thoughtful wordmark text `Lumora` (working name). No unsupported claims or fake partner logos.
- Hero headline suggested: **"Build with AI. Know what actually works."**
- Supporting copy suggested: **"Lumora is being developed to turn app ideas into tested web applications, with clear requirements, independent checks, and honest progress."**
- The actual supplied frame sequence is prominent, not hidden in a tiny box. Respect aspect ratio and visual details. Art direction can place copy beside or above the animation depending on breakpoint.
- Primary CTA: link to an **existing verified local prototype route**, only if one actually exists and works. Label appropriately, for example "Explore the prototype". Otherwise primary CTA can scroll to the product explanation, labelled "See the approach". Secondary CTA: a real in-page "How it works" anchor. Never add a dead button pretending sign-up, Kickstarter, live builder, pricing or a demo.
- Navigation links should point to real sections/routes. Don't invent account/login UI.

## Suggested narrative after the hero
1. **The problem:** "An app that looks finished isn't necessarily an app that works." Explain broken workflows, lost decisions, and unverified completions, without fake surveys or market stats.
2. **How Lumora is intended to work:** a visually elegant 4–6-step explanation, explicitly labelled the *planned workflow*. Prompt/approve requirements; build in isolation; independent testing; repair/retest; evidence-based report and preserved project context.
3. **Current progress:** accurately distinguish what is *present today* in the existing prototype after verifying the repo from what is *still planned*; avoid a fabricated completion percentage.
4. **Closing CTA:** a real link back to the working prototype or on-page explanation. A future Kickstarter effort can be mentioned as *under consideration* only if needed and clearly not active.

This is a suggested content hierarchy, not a directive to use rote SaaS-template sections. Prioritize coherent visual storytelling with useful, truthful information.

## Scroll sequence — required exact behavior
- Initial load / top of page: **frame 001 is immediately visible and remains visible**; no blank area while other frames load.
- During the intended hero-scroll segment: scroll down moves **forward** sequentially from frame 001 toward frame 201, and the hero stage is pinned/sticky long enough to appreciate the animation.
- Scroll up moves **backward** through the same frames. Returning to top shows and holds **frame 001**, with no cut, restart, flash or blank frame.
- No normal auto-playing video is required. Treat the 201 image files as **actual image-sequence assets** linked to scroll position. Do not replace them with stock video or re-generate their motion.
- Avoid hijacking normal browser interactions; don't trap mobile users in a scroll region. Preserve page navigation and keyboard use.
- When reduced motion is requested, display a representative static frame and keep the information accessible without forced animation.
- Desktop and mobile sizes: layout must not cut the subject improperly. Frame 001 can be shown as an `<img>` poster before canvas is ready. Use `object-fit`/canvas contain or intentional cropping after visual review.

## Performance implementation direction (choose best after inspecting repo)
- React component + Canvas or another proven image-sequence approach. GSAP ScrollTrigger (if appropriate and license permits) can map scroll progress to frame index, with scrub and a pinned section; native scroll observation is also acceptable if it performs better. No need for any AI video generation service.
- **201 PNGs at 854x480** are heavy for production. Build optimized derivatives from the provided frames (WebP/AVIF or another browser-friendly format), keep originals as source, use a loading plan, responsive frame strategies as justified, proper `devicePixelRatio` handling, preload first few frames and then progressively fetch/cache the remainder.
- Never make 201 eager image requests on initial render without considering cost and performance. Make animation smooth, prevent gaps, and avoid layout shift. On missing intermediate frame, hold the most recent valid frame until ready instead of rendering blank.
- Avoid unnecessary new libraries if current repo already provides equivalent functionality; adding dependencies requires justification and normal project conventions.

## No fake details / no premature release
- Never invent price plans, paid subscriptions, team names, user counts, customer testimonials, case studies, VC backing, security audits, certifications, partners, business email/contact details, logos, metrics, Kickstarter funding goal, live campaign link, integrations or launch date.
- No pretending future AI build/test/repair functionality works. Label planned functionality accurately.
- No dead "Join Waitlist", "Start Building", "Back us now" or "Sign in" buttons. Only real navigation and real features; otherwise omit CTA or use informative anchor.
- No public deployment, purchases, upgrades, new paid APIs or sending information to third parties without explicit owner approval.

## Done criteria for this first implementation
1. Page exists locally and runs in the current repository without breaking established routes/workspace.
2. Supplied image sequence visibly scrubs correctly in both directions, holds frame 001 at top, handles refresh/back/fast scroll.
3. Visually polished desktop and mobile views, thoughtful typography and hierarchy; frame asset integrated with composition.
4. Copy and buttons are factually honest and functional.
5. Reduced-motion mode works. No obvious scroll lock, overflow, console failures or excessive network demand.
6. Run applicable unit/browser checks; provide screenshots or documented browser evidence and tell the product owner exactly what changed, what is unverified, and what you recommend next.
