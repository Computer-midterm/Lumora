# Lumora — product truth and current status

## Product vision
**Lumora** is a *working/provisional name* for a **browser-first AI app builder**. The user describes a web application in ordinary language. Lumora's intended experience is to help plan requirements, build in an isolated execution environment, independently test customer-like user flows, fix failures, rerun regression checks, preserve project decisions, and report *honest* verified status. The goal is a functional application, not merely a polished but broken demo.

### Intended workflow (vision, not fully implemented)
1. Prompt -> explicit requirements, features and acceptance criteria -> user approval.
2. Coding agent works in an isolated builder environment.
3. Persistent memory retains decisions, progress, test results, regressions and bugs.
4. Independent tester agents exercise genuine user flows and report failures; testers should not secretly alter code or success criteria.
5. Builder fixes failures, rechecks new and previously working features.
6. Report verified, incomplete, failed, blocked or budget-exhausted states with evidence; do not claim flawless operation.

**Initial product focus:** a limited category of web applications, then expand after proof and validation.

## Reported implementation baseline (MUST independently inspect before publishing claims)
- Private GitHub repository: `https://github.com/Computer-midterm/verifiable-app-builder`.
- Frontend stack reported: Vite + React + TypeScript.
- Prior Claude Code report: local frontend with project creation, editable briefs, versioned/approved requirements, local project memory, JSON export, and visibly labeled demo/unavailable features.
- Previously reported 18 passing browser tests; **do not publish "18 tests passed" without verifying tests yourself**.
- Prior reported commit: `1249ecd`, branch `frontend/m1-local-prototype` (local and reportedly not pushed at that time). The live checkout may have changed; inspect `git status`, history, routes and tests.
- Autonomous builder + sandbox + independent testers + repair/regression engine **NOT implemented** as of source context. These are future capabilities.
- Original design had been rejected as too bland; a higher-quality landing page is the current priority.

## Product/brand separation
- Marketing website: sell the idea honestly, explain the verification focus, show craft and credibility.
- Builder workspace: actual application UI; separate visual/functional experience. **Do not overhaul or break working builder flows while styling the landing page.**
- Name "Lumora" not cleared for public branding/trademark; public launch needs a review.

## Fundraising intent
The product owner hopes the venture becomes financially successful and wants to explore **Kickstarter** as a possible funding route. **No verified active campaign, funding goal, stretch goals, investor list, pledged amount, customer base or launch date has been provided.** Do not present Kickstarter funding as live/secured, and do not invent numbers, testimonials or credentials. An informative "Updates on development" or product-status section is fine without claiming a waitlist/backend exists.

## People and authority
- Product owner decides final design, copy, spending, integrations, public launch and campaign specifics.
- Claude Code owns coding, testing and implementation within the authorized existing repository.
- Other ChatGPT conversations provide research, critique, planning and briefs; they are not writing the product code.

## Non-negotiable honesty
A beautiful animation must not make the page imply a production-ready autonomous app builder already exists. Distinguish **what the prototype can demonstrate today** from **what Lumora is being built to do next**. No fake social proof, case studies, metrics, pricing, press, security certifications, integrations, customer brands, product screenshots or interactive demo features.
