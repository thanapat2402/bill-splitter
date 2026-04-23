---
mode: agent
model: GPT-5.4
description: Run the repo's deploy verification flow for GitHub Pages and Supabase-backed sharing.
---

Use the repo skill [../skills/deploy-check/SKILL.md](../skills/deploy-check/SKILL.md).

Goal: verify that a deploy is actually shippable, not just that a workflow turned green.

Follow this flow:

1. Check whether [../../index.html](../../index.html) now references any new top-level script or asset and confirm [../workflows/deploy-pages.yml](../workflows/deploy-pages.yml) copies it into `dist/`.
2. Run [../../smoke_test.sh](../../smoke_test.sh) when the touched path affects sharing, persistence, or deploy behavior.
3. If the user asked to deploy, push the intended branch and wait for the GitHub Pages workflow to finish.
4. Validate the production main page for missing script loads, 404s, and page errors.
5. When sharing is relevant, validate at least one production share page too.
6. Perform one real production interaction instead of stopping at a visual page load.

When you finish, report:

- whether `smoke_test.sh` passed
- whether the Pages workflow passed
- whether production main-page validation passed
- whether production share-page validation passed, if applicable
- any residual risk that remains outside the app code
