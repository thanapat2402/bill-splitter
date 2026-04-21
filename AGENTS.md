# AGENTS.md

## Project Scope

- This repo is a small static bill-splitting app with no build step, package manager, or backend.
- The app is loaded directly from [index.html](/Users/tnp.24/work/Golf/split/index.html) and uses [script.js](/Users/tnp.24/work/Golf/split/script.js) plus [style.css](/Users/tnp.24/work/Golf/split/style.css).

## Working Model

- Keep the implementation in plain HTML, CSS, and browser JavaScript. Do not introduce frameworks, bundlers, or dependencies unless explicitly requested.
- Treat the UI as Thai-first. Preserve existing Thai labels, alerts, and messages unless the task is specifically about copy changes.
- State is in the in-memory `data` object in [script.js](/Users/tnp.24/work/Golf/split/script.js). There is no persistence layer.
- Most UI refreshes should flow through `updateUI()`, which rebuilds the derived sections after state changes.
- Cache DOM references in the top-level `dom` object and bind listeners centrally in `bindEvents()`.
- Prefer lightweight local updates when editing the sub-expense draft UI: `updateExpenseTotal()` recalculates the draft total and accordion summary, while `updateUI()` is for committed state changes in `data`.

## File Responsibilities

- [index.html](/Users/tnp.24/work/Golf/split/index.html): page structure and mounting points for dynamic sections.
- [script.js](/Users/tnp.24/work/Golf/split/script.js): state, event handlers, calculations, and DOM rendering.
- [style.css](/Users/tnp.24/work/Golf/split/style.css): design tokens, layout, component styling, and responsive rules.

## Conventions

- Follow the existing direct-DOM style: query elements once near the top, update `innerHTML` carefully, and keep functions small and single-purpose.
- Keep the current expense flow split across `getExpenseInput()`, `validateExpenseInput()`, `createExpense()`, and `resetExpenseForm()` rather than folding logic back into one large submit handler.
- Preserve the current naming style: `camelCase` for variables/functions and descriptive DOM IDs/classes.
- When editing sub-expense behavior, preserve the current coupling: sub-expenses are optional, opening the accordion with no rows auto-adds one draft row, `expenseTotal` becomes read-only when at least one valid sub-expense exists, and clearing all sub-expenses re-enables manual total entry.
- If you touch settlement or summary logic, keep currency math rounded consistently to 2 decimal places via `roundCurrency()` and preserve the existing `0.01` tolerance used by the settlement algorithm.
- Keep the balance model unchanged: `balance = paid - owed`.
- Keep displayed amounts going through `formatAmount()`, which intentionally uses `Intl.NumberFormat("en-US")` for thousands separators and fixed 2-decimal output.
- Remove actions still use inline `onclick` in rendered markup. If you keep that pattern, continue escaping dynamic names with `escapeQuotes()`. If you replace it, update renderer output and event wiring together.
- Use the existing escaping helpers by context: `escapeAttribute()` for HTML attribute values inside template strings, and `escapeQuotes()` for inline JavaScript string arguments.
- Keep the sub-expense remove interaction on the current delegated click pattern using `data-action="remove-sub-expense"` unless you update both the rendered markup and `handleSubExpenseAction()` together.
- Preserve the current accessibility pattern in [index.html](/Users/tnp.24/work/Golf/split/index.html): labeled sections, accordion `aria-expanded`/`aria-hidden`, and `aria-live="polite"` on dynamic content areas.
- Reuse the CSS custom properties in `:root` before adding new colors or spacing values.
- Keep mobile behavior intact. Existing breakpoints are in [style.css](/Users/tnp.24/work/Golf/split/style.css).

## Validation

- There is no automated test suite in this repo.
- Validate changes by opening [index.html](/Users/tnp.24/work/Golf/split/index.html) in a browser and manually checking the affected flow.
- For logic changes, at minimum test: add person, add expense, remove person or expense, summary totals, and settlement output.
- If you touch sub-expenses, also test: manual total with no sub-expenses, auto-total with sub-expenses, hiding/showing the accordion without losing draft rows, and clearing sub-expenses back to manual mode.
- Validation and confirmation copy is Thai and currently uses synchronous `alert()` and `confirm()` dialogs; keep that behavior unless the task explicitly changes it.
- When removing a person, verify the cascade: expenses they paid are removed, they are removed from other split groups, and entries with no remaining split participants disappear.

## Change Guidance

- Prefer minimal edits over rewrites.
- Do not add storage, routing, or architectural layers unless the task requires them.
- When changing renderer markup, check the matching CSS classes in [style.css](/Users/tnp.24/work/Golf/split/style.css) and the related DOM queries or helper functions in [script.js](/Users/tnp.24/work/Golf/split/script.js) together.
