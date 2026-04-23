---
name: deploy-check
description: Run the repo's release validation flow for Supabase-backed sharing and GitHub Pages, especially after adding top-level static assets.
---

# Deploy Check

Use this skill when the user asks to deploy, test a deployment, or verify that a frontend change actually shipped.

This repo has two separate release surfaces:

- the static frontend on GitHub Pages
- the deployed Supabase Edge Functions verified through [smoke_test.sh](../../../smoke_test.sh)

A successful Pages workflow alone is not enough. A successful backend smoke test alone is not enough. This skill exists to force both checks.

For general repo conventions and architecture, read [AGENTS.md](../../../AGENTS.md) first.

## What This Skill Produces

- A pre-push check for deploy-breaking static changes
- A backend smoke-test pass against deployed Supabase functions
- A production browser verification on GitHub Pages
- A clear pass/fail statement for release readiness

## When To Use It

- The user says `deploy`, `deploy และ test`, `ship`, or equivalent
- You changed top-level frontend files served by GitHub Pages
- You added or renamed a top-level script or asset referenced by [index.html](../../../index.html)
- You touched sharing, persistence, or link generation
- You changed [deploy-pages.yml](../../workflows/deploy-pages.yml)

## Core Rules

1. If a new top-level static file is referenced by [index.html](../../../index.html), confirm it is copied in [deploy-pages.yml](../../workflows/deploy-pages.yml) before pushing.
2. Run [smoke_test.sh](../../../smoke_test.sh) for deploy-impacting share or persistence changes.
3. After push, wait for the GitHub Pages workflow to finish before validating production.
4. Reload the production site and inspect for 404s, page errors, and broken script loads.
5. Do not treat a green workflow as success unless the production page actually works.

## Pre-Push Checklist

Check these first:

- `git status --short` to see the intended deploy set
- [index.html](../../../index.html) for new top-level script or asset references
- [deploy-pages.yml](../../workflows/deploy-pages.yml) to ensure every required top-level static file is copied into `dist/`
- whether [smoke_test.sh](../../../smoke_test.sh) is needed for the touched path

If the change adds a new top-level script or asset and the workflow does not copy it, fix that first. Production will otherwise fail with 404s even if local validation passes.

## Release Flow

Use this order unless the task needs something narrower:

1. Run a narrow readiness check
2. Run [smoke_test.sh](../../../smoke_test.sh) when sharing or persistence is touched
3. Push the intended branch
4. Watch the GitHub Pages workflow until completion
5. Reload the production main page
6. Reload at least one production share page when sharing is relevant
7. Perform one real UI interaction on production, not just a visual load check

## Production Browser Checks

On the main page:

- confirm no 404s for top-level scripts or assets
- confirm no page error from missing `window.*` controllers
- perform one user action such as loading demo data or opening the share menu

On a share page when relevant:

- confirm the page loads data instead of stalling in an error state
- confirm edit vs read-only mode matches the link type
- if production network is flaky, distinguish infra/network failure from an app regression before concluding

## Failure Patterns To Look For

- GitHub Pages serves [script.js](../../../script.js) but not a newly added companion file, causing `window.<Controller>` to be undefined
- Local file page works, but production breaks because [deploy-pages.yml](../../workflows/deploy-pages.yml) omitted a new file
- Pages workflow passes while the share flow still fails because [smoke_test.sh](../../../smoke_test.sh) was skipped
- Share pages open, but link origin is wrong because `APP_BASE_URL` is not configured in the deployed function environment

## Completion Bar

A deploy check is complete only when all applicable items are true:

- required static files are included in the Pages artifact
- [smoke_test.sh](../../../smoke_test.sh) passes when relevant
- the Pages workflow finishes successfully
- the production main page loads without missing-script regressions
- the most critical production interaction succeeds

## Output Format

When finishing, report:

- whether backend smoke test passed
- whether the Pages workflow passed
- whether production main page passed browser validation
- whether production share page passed browser validation, if applicable
- any residual risk that remains outside the app code

## Example Prompts

- Use deploy-check before shipping this modular frontend refactor.
- Use deploy-check after I add a new top-level script.
- Use deploy-check for this share-flow deploy and production validation.
