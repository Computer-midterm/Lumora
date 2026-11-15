# Lumora — Project Context for ChatGPT

## What we're building
**Lumora** is the working name of a **browser-based AI app builder**. A user describes an application in plain English, and Lumora aims to plan, build, test, repair, and deliver a **working application**, not just an attractive but unfinished MVP.

**Problem:** Existing AI app-building workflows can lose important project decisions, break previously working features, and declare work complete without sufficient testing.

## Core product workflow
1. **Prompt → approved requirements:** Convert the user's idea into an explicit feature list and acceptance criteria that the user can review before building.
2. **AI builder + sandbox:** A coding agent develops and runs the app inside an isolated environment.
3. **Persistent project memory:** Keep requirements, decisions, progress, changes, bugs, and test history across sessions.
4. **Independent AI testers:** Subagents act like customers, exercising actual app flows in isolated test/browser environments. They report issues and cannot quietly rewrite the source or success criteria.
5. **Repair + regression checks:** The builder fixes failures, retests changed features and previously working functionality, and records evidence.
6. **Honest completion:** Mark features verified only with supporting tests; otherwise show unfinished, failed, blocked, or budget-exhausted states. Never promise endless, flawless autonomous operation.

**Initial scope:** Support a limited kind of web application first. The complete autonomous build–test–repair engine is a *planned capability*, not an implemented feature yet.

## Design and platform direction
- **Browser-first**, not a native desktop app. The public marketing website and the actual AI-building workspace are separate experiences.
- **Premium, original design** is essential: sophisticated typography, strong visual hierarchy, tasteful motion, excellent responsive behavior, accessibility, and real-browser visual review. Avoid generic, sloppy AI-template styling.
- Marketing direction being explored: a cinematic glowing particle brain that slowly moves right-to-left and disperses into particles. This is **promotional imagery**, not the software's core functionality.
- The builder workspace should stay clear, fast, functional, and honest about simulated features.
- **Lumora is a provisional brand:** existing overlapping uses mean public naming/trademark clearance is still needed.

## Current project status
- Private GitHub repo: `https://github.com/Computer-midterm/verifiable-app-builder`
- Existing frontend stack: **Vite + React + TypeScript**.
- Claude Code reported a working local frontend with project creation, editable briefs, versioned/approved requirements, local memory, JSON export, and clearly labeled demo/unavailable views.
- Claude Code reported **18 passing browser tests**; this is its reported result, not independent verification by this chat.
- Frontend baseline: commit **`1249ecd`**, branch **`frontend/m1-local-prototype`** (reported as committed locally, not pushed at that point).
- **The first design was rejected as too bland.** A premium visual redesign and design approval are the next priorities. The actual autonomous backend has **not** been built.
- Design aids discussed: **Taste Skill**, **MotionSites**, and optional **Figma MCP**. The user authorized installing the two skills, but successful installation has **not been confirmed** here.

## Roles and how this ChatGPT conversation should help
- **User:** Product owner; approves scope, design, spending, deployment, and major decisions.
- **Claude Code/development assistant:** Responsible for implementing code in the existing repository.
- **This ChatGPT conversation:** **Research, product strategy, UX/design critique, planning, competitor analysis, funding preparation, and prompts/review instructions for the coder. Do not build or modify the software unless the user explicitly changes this assignment.**

## Near-term priorities
1. Review and approve an original high-quality homepage and builder-workspace visual direction while preserving working frontend functionality.
2. Prove one real end-to-end workflow: prompt → approved plan → isolated build → independent browser test → bug fix → verified report.
3. Validate usefulness with real potential customers; estimate AI/sandbox costs before scaling or fundraising.
4. Explore grants/crowdfunding **after** a credible working prototype and realistic budget, not as a substitute for product validation.

Keep recommendations practical, distinguish **planned vs implemented** functionality, and do not assume extra subscriptions, spending, or public deployment is approved.
