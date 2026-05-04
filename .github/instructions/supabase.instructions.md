---
applyTo: "supabase/functions/**/*.ts,supabase/migrations/**/*.sql,smoke_test.sh"
description: "Use when editing Supabase Edge Functions, shared snapshot validation, migrations, or the hosted smoke test for bill-splitter sharing."
---

# Supabase File Instructions

- Keep the frontend/backend seam narrow: browser code should continue talking to sharing through the existing Edge Functions rather than direct table access.
- Treat [../../supabase/functions/\_shared/trip.ts](../../supabase/functions/_shared/trip.ts) as the backend snapshot authority. If payload shape or validation rules change, update the matching frontend import/export logic in [../../trip-logic.js](../../trip-logic.js) together.
- Preserve the three share modes: local, shared edit, and shared view. View-only restrictions must remain enforced on the backend, not only in the UI.
- Keep optimistic concurrency intact unless the product model changes explicitly: saves use `expectedVersion`, remote update detection is notify-only, and conflicts stop autosave rather than silently merging.
- Use the repo skill [../../.agents/skills/supabase/SKILL.md](../../.agents/skills/supabase/SKILL.md) for current Supabase guidance, and use [../skills/local-dev-setup/SKILL.md](../skills/local-dev-setup/SKILL.md) for local verification before touching hosted behavior.
- When sharing or persistence changes affect deployed behavior, run [../../smoke_test.sh](../../smoke_test.sh) or the equivalent create/load/get-version/save/load check.
