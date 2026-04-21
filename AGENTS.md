# AGENTS.md

## Project Scope

- This repo is a small bill-splitting app with a static frontend plus Supabase-backed sharing.
- The browser app is loaded directly from [index.html](index.html) and uses [script.js](script.js) plus [style.css](style.css).
- Persistence and link-based sharing live behind Supabase Edge Functions in [supabase/functions](supabase/functions) and schema changes live in [supabase/migrations](supabase/migrations).

## Working Model

- Keep the implementation in plain HTML, CSS, and browser JavaScript. Do not introduce frameworks, bundlers, or dependencies unless explicitly requested.
- Treat the UI as Thai-first. Preserve existing Thai labels, alerts, and messages unless the task is specifically about copy changes.
- Committed trip data lives in the in-memory `data` object in [script.js](script.js). Share lifecycle and sync status live separately in `appState`.
- Most UI refreshes should flow through `updateUI()`, which rebuilds the derived sections after state changes.
- Cache DOM references in the top-level `dom` object and bind listeners centrally in `bindEvents()`.
- Prefer lightweight local updates when editing the sub-expense draft UI: `updateExpenseTotal()` recalculates the draft total and accordion summary, while `updateUI()` is for committed state changes in `data`.
- Keep the frontend/backend seam narrow: the browser should talk to sharing only through the existing `postShareRequest()` helper and the Edge Functions, not direct table access.

## File Responsibilities

- [index.html](index.html): page structure and mounting points for dynamic sections, including the share UI.
- [script.js](script.js): local state, share state, event handlers, calculations, DOM rendering, snapshot import/export, and Edge Function calls.
- [style.css](style.css): design tokens, layout, component styling, and responsive rules.
- [supabase/functions/\_shared/trip.ts](supabase/functions/_shared/trip.ts): canonical trip snapshot validation and token helpers for the backend.
- [supabase/functions/create-trip/index.ts](supabase/functions/create-trip/index.ts), [supabase/functions/load-trip/index.ts](supabase/functions/load-trip/index.ts), [supabase/functions/save-trip/index.ts](supabase/functions/save-trip/index.ts), [supabase/functions/get-trip-version/index.ts](supabase/functions/get-trip-version/index.ts): the only supported persistence endpoints.
- [smoke_test.sh](smoke_test.sh): deployed backend smoke test against the hosted Supabase functions.

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
- Preserve the current accessibility pattern in [index.html](index.html): labeled sections, accordion `aria-expanded`/`aria-hidden`, and `aria-live="polite"` on dynamic content areas.
- Reuse the CSS custom properties in `:root` before adding new colors or spacing values.
- Keep mobile behavior intact. Existing breakpoints are in [style.css](style.css).
- Preserve the current share model: local mode, shared edit mode, and shared view mode are distinct; view-only links must stay read-only in the UI and in backend authorization.
- Persist only committed snapshots. Do not add draft UI state to the saved payload unless the task explicitly changes the product model.
- Keep optimistic concurrency intact: saves send `expectedVersion`, remote update detection is notify-only, and conflict handling should stop autosave rather than merge.
- Snapshot validation is strict on both client and server. If you change the payload shape, update the frontend import/export helpers and [supabase/functions/\_shared/trip.ts](supabase/functions/_shared/trip.ts) together.

## Operational Gotchas

- [script.js](script.js) currently hardcodes the hosted Functions origin via `SHARE_API_BASE_URL`; do not assume multi-environment config already exists.
- Share links from `create-trip` depend on `APP_BASE_URL` in the deployed function environment. If it is missing, returned URLs fall back to the function origin.
- Supabase functions require environment variables for admin access. Check [supabase/functions/\_shared/supabase.ts](supabase/functions/_shared/supabase.ts) before changing deployment or local function behavior.

## Validation

- There is no automated test suite in this repo.
- Validate frontend changes by opening [index.html](index.html) in a browser and manually checking the affected flow.
- For logic changes, at minimum test: add person, add expense, remove person or expense, summary totals, and settlement output.
- If you touch sub-expenses, also test: manual total with no sub-expenses, auto-total with sub-expenses, hiding/showing the accordion without losing draft rows, and clearing sub-expenses back to manual mode.
- Validation and confirmation copy is Thai and currently uses synchronous `alert()` and `confirm()` dialogs; keep that behavior unless the task explicitly changes it.
- When removing a person, verify the cascade: expenses they paid are removed, they are removed from other split groups, and entries with no remaining split participants disappear.
- If you touch sharing or persistence, run [smoke_test.sh](smoke_test.sh) against the deployed backend or perform the equivalent create/load/get-version/save/load check manually.

## Change Guidance

- Prefer minimal edits over rewrites.
- Do not add storage, routing, or architectural layers unless the task requires them.
- When changing renderer markup, check the matching CSS classes in [style.css](style.css) and the related DOM queries or helper functions in [script.js](script.js) together.

## Related Guidance

- Use the repo skill [supabase](.agents/skills/supabase/SKILL.md) for any Supabase task. It is the authoritative place for current Supabase workflow and safety guidance.
- Use [.github/skills/grill-me/SKILL.md](.github/skills/grill-me/SKILL.md) when the user wants a design or implementation plan stress-tested.
- Use [.github/skills/to-prd/SKILL.md](.github/skills/to-prd/SKILL.md) when the user wants the current conversation turned into a PRD or GitHub issue.
