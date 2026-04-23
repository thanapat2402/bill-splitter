---
name: share-flow-debug
description: Debug the repo's share links, mode transitions, and Supabase-backed trip sync without conflating UI issues with deploy or backend failures.
---

# Share Flow Debug

Use this skill when share links, view/edit modes, autosave, loading, or sync behavior seems broken.

This repo has a narrow sharing seam:

- browser logic lives in [share-flow.js](../../../share-flow.js)
- UI state is rendered in [trip-ui.js](../../../trip-ui.js)
- composition and shared state live in [script.js](../../../script.js)
- backend persistence lives only in the Supabase Edge Functions under [supabase/functions](../../../supabase/functions)

For broader repo conventions, read [AGENTS.md](../../../AGENTS.md) first. Use the repo Supabase skill [../../../.agents/skills/supabase/SKILL.md](../../../.agents/skills/supabase/SKILL.md) for current Supabase workflow and safety guidance.

## What This Skill Produces

- A structured way to isolate whether the problem is UI, composition, deploy, or backend
- A mode-aware checklist for local, shared-edit, and shared-view behavior
- A validation flow for share links and sync state
- A clear failure classification before code changes are proposed

## When To Use It

- The user says share links are broken or inconsistent
- A view-only link can edit, or an edit link behaves read-only
- Autosave, manual save, reload latest, or remote update behavior looks wrong
- A shared trip loads locally but not on the deployed app
- The UI and backend seem to disagree about trip state or link origin

## Core Rules

1. Identify the failing surface first: local page, production main page, production share page, or backend smoke test.
2. Separate page-load failures from share-state failures. Missing scripts or 404s are deploy issues first, not share logic bugs.
3. Confirm the current mode before changing code: `local`, `shared-edit`, or `shared-view`.
4. Trace failures through the existing boundary: UI in [trip-ui.js](../../../trip-ui.js), share state/network in [share-flow.js](../../../share-flow.js), backend validation in [supabase/functions/\_shared/trip.ts](../../../supabase/functions/_shared/trip.ts).
5. If the issue involves deployed links or network calls, validate against the hosted app and the deployed functions, not only `file:///`.

## Debug Order

Use this sequence unless the bug is already isolated:

1. Reproduce on the affected page
2. Check for missing-script loads, page errors, and failed requests
3. Determine current app mode and expected mode
4. Decide whether the failure is:
   - load/deploy
   - UI rendering/state
   - share link generation
   - backend load/save/version behavior
   - Realtime or polling sync behavior
5. Only then choose the nearest code surface to inspect or change

## Mode Expectations

- `local`:
  - trip stays editable in-browser
  - share buttons can create links
  - no remote state is required yet
- `shared-edit`:
  - trip is editable
  - autosave/manual save can persist
  - remote update detection matters
- `shared-view`:
  - editing controls must be read-only
  - view links can still be copied or reloaded
  - backend must enforce view-only semantics, not just the UI

## Common Failure Patterns

- [index.html](../../../index.html) references a new top-level script but [deploy-pages.yml](../../workflows/deploy-pages.yml) does not copy it, so production share pages fail before share logic runs
- `APP_BASE_URL` is missing in deployed function config, so generated links point to the wrong origin
- The page is in `shared-view`, but the investigation assumes local-edit semantics and chases the wrong code path
- A load failure is caused by invalid or missing snapshot data, which should be checked against [supabase/functions/\_shared/trip.ts](../../../supabase/functions/_shared/trip.ts)
- Realtime websocket noise is mistaken for the primary bug when the real failure is earlier in create/load/save

## Validation Flow

When sharing or persistence is involved, prefer this order:

1. Local page sanity check for UI-only regressions
2. [../../../smoke_test.sh](../../../smoke_test.sh) for deployed backend behavior
3. Production main page check for link creation flow when relevant
4. Production share page check for actual shared-edit or shared-view behavior

## Completion Bar

A share-flow investigation is complete only when you can state:

- which surface actually failed
- which mode was expected and which mode was observed
- whether the root cause is deploy, frontend composition, share-flow logic, or backend behavior
- what concrete validation proved the diagnosis

## Example Prompts

- Use share-flow-debug to investigate why this edit link opens in read-only mode.
- Use share-flow-debug to diagnose why create-trip returns the wrong URL origin.
- Use share-flow-debug to separate a production 404 from a real share-state regression.
