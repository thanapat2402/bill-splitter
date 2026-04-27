---
name: local-dev-setup
description: Run and test Supabase Edge Functions locally before pushing. Use when you need to validate backend changes without hitting the hosted functions.
---

# Local Dev Setup

Use this skill when you change any Edge Function or migration and need to verify the backend locally before pushing.

`smoke_test.sh` only tests the **hosted** Supabase functions at the hardcoded origin in `script.js`. This skill covers the equivalent local loop.

For repo conventions and file responsibilities, read [AGENTS.md](../../../AGENTS.md) first.

## What This Skill Produces

- A running local Supabase stack with Edge Functions served
- A frontend pointed at local functions for end-to-end local testing
- A local smoke-test loop equivalent to `smoke_test.sh`
- A clean teardown that reverts any temporary frontend changes

## When To Use It

- You changed an Edge Function under [supabase/functions](../../../supabase/functions)
- You added or changed a migration under [supabase/migrations](../../../supabase/migrations)
- You changed [supabase/functions/\_shared/trip.ts](../../../supabase/functions/_shared/trip.ts) (snapshot validation, token logic)
- You want to confirm backend behavior before `smoke_test.sh` hits production

## Prerequisites

- Supabase CLI installed and authenticated (`supabase login`)
- Docker running locally (required by `supabase start`)

Check: `supabase --version` and `docker info`

## Core Rules

1. Never commit a `SHARE_API_BASE_URL` pointing at `localhost`. Revert before any `git add`.
2. Run `supabase stop` when done — local stack consumes resources and holds ports.
3. The local DB is ephemeral. Migrations apply fresh on each `supabase start`. Do not rely on data persisting across sessions.
4. If a function panics or returns 500 locally, check the serve log in the terminal — Deno error messages appear there, not in the response body.

## Step 1 — Start the Local Stack

```bash
cd /Users/tnp.24/work/Golf/bill-splitter
supabase start
```

This starts a local Postgres instance, applies all migrations from [supabase/migrations](../../../supabase/migrations), and exposes the local API at `http://127.0.0.1:54321`.

Note the output lines for:

- **API URL** — typically `http://127.0.0.1:54321`
- **service_role key** — needed only if you run curl tests manually (auto-injected for `functions serve`)

## Step 2 — Serve Edge Functions

In a **separate terminal**, keep this running while you test:

```bash
supabase functions serve --no-verify-jwt
```

This serves all functions under [supabase/functions](../../../supabase/functions) at:

```
http://127.0.0.1:54321/functions/v1/<function-name>
```

`--no-verify-jwt` lets the local functions accept unauthenticated requests, matching the production setup which uses token-based authorization inside the function body rather than JWT middleware.

Environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are injected automatically from the running local stack. No `.env` file is needed for the standard local flow.

## Step 3 — Point the Frontend at Local Functions (Optional)

The frontend hardcodes `SHARE_API_BASE_URL` in [script.js](../../../script.js). To test end-to-end with `file:///...index.html`:

1. Open [script.js](../../../script.js) and change the constant **temporarily**:

   ```js
   // Before (hosted):
   const SHARE_API_BASE_URL =
     "https://edpcqatatjkfgjxnogvq.functions.supabase.co";

   // During local test:
   const SHARE_API_BASE_URL = "http://127.0.0.1:54321/functions/v1";
   ```

2. Reload `file:///Users/tnp.24/work/Golf/bill-splitter/index.html` in the browser.
3. Test the share flow: create a trip via "คัดลอกลิงก์แก้ไข", load the generated link, save changes.
4. **Revert `script.js` before staging**. Confirm with `git diff script.js` before any `git add`.

## Step 4 — Local Smoke Test (curl)

Run the same create → load → get-version → save → load loop as `smoke_test.sh`, but against the local endpoint:

```bash
LOCAL="http://127.0.0.1:54321/functions/v1"

# Create
CREATE=$(curl -s -X POST $LOCAL/create-trip \
  -H "Content-Type: application/json" \
  -d '{"data":{"schemaVersion":1,"persons":["Alice","Bob"],"expenses":[{"id":1,"name":"Dinner","amount":200,"subExpenses":[],"paidBy":"Alice","splitAmong":["Alice","Bob"],"date":"2026-04-21"}]}}')
echo $CREATE | grep -o '"editToken":"[^"]*"'

EDIT_TOKEN=$(echo $CREATE | grep -o '"editToken":"[^"]*"' | cut -d'"' -f4)
VERSION=$(echo $CREATE | grep -o '"version":[0-9]*' | cut -d: -f2)

# Load
curl -s -X POST $LOCAL/load-trip -H "Content-Type: application/json" -d "{\"token\":\"$EDIT_TOKEN\"}" | grep -o '"schemaVersion":[0-9]*'

# Get version
curl -s -X POST $LOCAL/get-trip-version -H "Content-Type: application/json" -d "{\"token\":\"$EDIT_TOKEN\"}" | grep -o '"version":[0-9]*'

# Save
curl -s -X POST $LOCAL/save-trip \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$EDIT_TOKEN\",\"expectedVersion\":$VERSION,\"data\":{\"schemaVersion\":1,\"persons\":[\"Alice\",\"Bob\"],\"expenses\":[{\"id\":1,\"name\":\"Dinner\",\"amount\":220,\"subExpenses\":[],\"paidBy\":\"Alice\",\"splitAmong\":[\"Alice\",\"Bob\"],\"date\":\"2026-04-21\"}]}}" | grep -o '"version":[0-9]*'
```

All four steps should return HTTP 2xx and valid JSON. If any step fails, check the `supabase functions serve` terminal for the Deno error.

## Step 5 — Teardown

```bash
supabase stop
```

This stops the local Docker containers and frees the ports. Local DB data is discarded.

## Gotchas

- **Migrations not applying?** Run `supabase db reset` to apply migrations from scratch.
- **Function not found (404)?** Confirm the function directory name matches the URL segment — e.g., `supabase/functions/create-trip/` → `/functions/v1/create-trip`.
- **`SUPABASE_ENV_NOT_CONFIGURED` error?** The local stack must already be running (`supabase start`) before you run `supabase functions serve`. Serve reads the injected env from the running stack.
- **Port conflict on 54321?** Another Supabase project may be running. Run `supabase stop --all` to clear all local stacks.
- **CORS error from browser?** Local functions served with `--no-verify-jwt` still respond to CORS preflight. If you get a CORS error in the browser, check that the function's `preflightResponse()` is returned for `OPTIONS` — see [supabase/functions/create-trip/index.ts](../../../supabase/functions/create-trip/index.ts) for the pattern.
