---
name: frontend-static
description: Validate the static frontend on local and production pages, and preserve the repo's controller-composition boundaries.
---

# Frontend Static

Use this skill when working on the browser UI in this repo.

This repo is static-first: plain HTML, CSS, and browser JavaScript loaded directly from [index.html](../../../index.html). There is no bundler, no package.json, and no framework abstraction to hide load-order or runtime issues.

For current module ownership and repo conventions, read [AGENTS.md](../../../AGENTS.md) first. This skill focuses on validation flow, browser checks, and controller-composition pitfalls.

## What This Skill Produces

- A repeatable UI validation flow for local static pages
- A focused browser-check sequence for user-visible behavior
- Guardrails for the repo's controller composition pattern
- A release-minded check for Pages-only failures such as missing copied assets

## When To Use It

- The user asks for frontend work in the static app
- You change any of [index.html](../../../index.html), [style.css](../../../style.css), [script.js](../../../script.js), [trip-ui.js](../../../trip-ui.js), [expense-form.js](../../../expense-form.js), [trip-actions.js](../../../trip-actions.js), [app-shell.js](../../../app-shell.js), or [share-flow.js](../../../share-flow.js)
- You move logic between controllers or touch script load order
- You add a new top-level script or asset that the deployed GitHub Pages site must serve

## Core Rules

1. Validate the affected UI flow on the local static page first.
2. Prefer behavior checks over code-only confidence. A green editor is not enough.
3. If the change affects load order, script tags, or top-level assets, verify the deployed GitHub Pages page too.
4. Keep logic inside the owning controller when possible; do not re-centralize behavior into [script.js](../../../script.js) unless it is true composition glue.
5. Do not introduce module systems, bundlers, or framework patterns unless the user explicitly asks for them.

## Local Validation Flow

Use the local file page first:

- Open [index.html](../../../index.html) via `file:///.../index.html`
- Reload after changes
- Check for page errors, failed script loads, and missing globals before interacting with the UI

Run the smallest behavior checks that match the touched area:

- General trip flow:
  - add person
  - add expense
  - remove person or expense
  - verify summary and settlement update
- Sub-expense flow:
  - manual total with no sub-expenses
  - auto-total with valid sub-expenses
  - accordion show/hide
  - clearing sub-expenses restores manual total entry
- Summary UI:
  - long names and large amounts wrap correctly
  - `จ่ายไปแล้ว` and `ต้องจ่าย` details expand and collapse correctly
- Shell interactions:
  - header share menu opens and closes
  - shortcut chips scroll to the right section
  - trip title editing updates document title and UI state

## Browser Check Order

Use this order unless the task needs something narrower:

1. Reload the page and inspect page errors or failed network/script requests
2. Check the primary edited interaction
3. Check one adjacent interaction that proves state stayed coherent
4. If the change affects deploy behavior, reload the GitHub Pages site and repeat the most critical interaction there

## Controller Composition Rules

This repo uses IIFE-style controllers attached on `window` and composed in [script.js](../../../script.js). Preserve that pattern.

- [script.js](../../../script.js) is the composition root, shared state holder, and thin bridge layer
- Keep pure logic in [trip-logic.js](../../../trip-logic.js)
- Keep rendering and read-only/UI state changes in [trip-ui.js](../../../trip-ui.js)
- Keep expense form and draft-row behavior in [expense-form.js](../../../expense-form.js)
- Keep committed trip mutations in [trip-actions.js](../../../trip-actions.js)
- Keep shell/bootstrap behavior in [app-shell.js](../../../app-shell.js)
- Keep sharing/network/sync behavior in [share-flow.js](../../../share-flow.js)

When moving logic:

- Inject dependencies instead of reaching across controllers directly
- Preserve the current script tag load order in [index.html](../../../index.html)
- If UI still relies on inline handlers or window bridges, update both sides together

## Common Failure Modes

- New top-level script added in [index.html](../../../index.html) but not copied by [deploy-pages.yml](../../workflows/deploy-pages.yml), causing production 404s
- Logic moved into the wrong controller, forcing circular dependencies back through `window`
- Local UI seems fine but production fails because a static asset was not included in the Pages artifact
- Summary or sub-expense changes look correct on small data but break with long labels or large amounts

## Completion Bar

Frontend work is not complete until:

- the edited UI flow works on the local static page
- there are no relevant page errors for the touched path
- one adjacent state update path has been checked
- deploy-impacting changes have been spot-checked on GitHub Pages

## Example Prompts

- Use frontend-static to validate this summary-card UI refactor.
- Use frontend-static after changing sub-expense behavior.
- Use frontend-static before shipping this header/share-menu change.
