---
applyTo: "index.html,style.css,script.js,trip-logic.js,trip-ui.js,expense-form.js,trip-actions.js,app-shell.js,share-flow.js"
description: "Use when editing the static browser app. Preserves Thai-first copy, controller ownership, direct-DOM patterns, and GitHub Pages deploy constraints for top-level assets."
---

# Frontend File Instructions

- Keep the app plain HTML, CSS, and browser JavaScript. Do not introduce frameworks, bundlers, or package-managed frontend dependencies unless the user explicitly asks.
- Preserve Thai-first labels, alerts, and confirmation copy unless the task is specifically about wording.
- Keep logic in the owning controller: composition in [../../AGENTS.md](../../AGENTS.md), browser orchestration in [../../script.js](../../script.js), pure calculations in [../../trip-logic.js](../../trip-logic.js), rendering in [../../trip-ui.js](../../trip-ui.js), form drafting in [../../expense-form.js](../../expense-form.js), committed mutations in [../../trip-actions.js](../../trip-actions.js), shell behavior in [../../app-shell.js](../../app-shell.js), and sharing/sync in [../../share-flow.js](../../share-flow.js).
- Prefer cached DOM references and central event binding over scattered queries or listeners.
- Route committed-state refreshes through `updateUI()`. When editing sub-expense drafts, prefer `updateExpenseTotal()` for local draft recalculation.
- If you add or rename a top-level script or asset referenced by [../../index.html](../../index.html), update [../workflows/deploy-pages.yml](../workflows/deploy-pages.yml) in the same change.
- Validate edited UI flows on the local static page first, then use [../skills/frontend-static/SKILL.md](../skills/frontend-static/SKILL.md) or [../skills/deploy-check/SKILL.md](../skills/deploy-check/SKILL.md) when deploy behavior is involved.
