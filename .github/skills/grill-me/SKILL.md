---
name: grill-me
description: Relentlessly interview a plan one decision at a time until the design is internally consistent, dependency-ordered, and implementation-ready.
---

# Grill Me

Use this skill when the user has a plan, architecture, migration, rollout, or implementation idea that needs to be pressure-tested through a structured interview.

This skill is for reaching shared understanding, not for brainstorming broadly. It should expose hidden assumptions, force decisions in dependency order, and leave the user with a clarified plan.

## What This Skill Produces

- A one-question-at-a-time interview flow
- A dependency-ordered walk through the design tree
- A recommended answer for each question
- Explicit handling of branch points and tradeoffs
- A stopping condition: the plan is coherent enough to implement, or the unresolved blockers are named clearly

## When To Use It

- The user says they want to be grilled, challenged, or interviewed on a plan
- The user has an architecture or feature plan that spans multiple decisions
- The plan has many branches: product, UX, storage, auth, sync, rollout, testing, or migration
- The team needs to converge on defaults before implementation starts

## Core Rules

1. Ask questions one at a time.
2. Before asking, check whether the answer is already available from the codebase, current task context, or earlier conversation.
3. If the answer can be obtained by exploring the codebase, inspect first and incorporate that finding instead of asking.
4. For every question you do ask, include your recommended answer and a short reason.
5. Walk the tree in dependency order. Do not jump to downstream details before upstream decisions are settled.
6. Keep going until the plan is implementable or the remaining uncertainty is narrowed to a small set of explicit blockers.
7. Prefer decisions that fit the current repo constraints unless the user explicitly wants a broader rewrite.

## Default Interview Order

Use this sequence unless the codebase proves a different dependency order.

1. Goal and success criteria
2. Constraints from the current codebase and deployment model
3. Source of truth for data
4. Permission model and roles
5. Persistence model and infrastructure boundary
6. Client state model and mode transitions
7. API or integration contract
8. Error handling and conflict model
9. UX states and copy implications
10. Validation and security requirements
11. Rollout and migration strategy
12. Testing and completion checks

## Branching Logic

When the plan branches, resolve the parent decision first, then descend.

- If the user wants share links:
  - Decide whether links are view-only, edit-capable, or both.
  - Then decide whether permissions are enforced by client convention or backend validation.
  - Then decide where persisted state lives.
- If the plan introduces storage:
  - Decide whether the repo should stay static-first or accept backend infrastructure.
  - Then choose the storage/API boundary.
  - Then define save/load/versioning semantics.
- If the plan changes framework or architecture:
  - Decide whether the feature can be delivered without a rewrite.
  - Only move to framework choice after feature scope and constraints are clear.
- If the user asks about UX details before data/model decisions are settled:
  - answer briefly if needed, then return to the unresolved upstream dependency.

## How To Ask Each Question

Each turn should contain:

1. A short framing sentence that says what dependency is being resolved now
2. One concrete question
3. A recommended answer
4. A short reason tied to the current repo or plan

Template:

```md
ตอนนี้ต้องล็อก [dependency] ก่อน เพราะมันกำหนด [downstream impact]

คำถาม: [single concrete question]

คำตอบที่ผมแนะนำ: [recommended answer]
เหตุผล: [1-3 concise sentences]
```

## Codebase-First Behavior

Before asking, inspect the repo when the answer is likely already present in:

- existing state shape
- current render/update flow
- current environment constraints
- established UI or accessibility patterns
- current persistence or lack of persistence

When you learn something from the repo, use it to narrow the question. Example:

- Bad: "Should we use a backend?"
- Better: "The repo is currently static-only with in-memory state in script.js, so editable share links cannot be enforced client-side alone. Do you want to add backend infrastructure, or should we reduce scope to view-only sharing?"

## Quality Bar

The skill is complete when all of the following are true:

- The top-level goal is explicit
- Upstream decisions are settled before downstream ones
- Every open branch is either chosen or parked intentionally
- Recommended answers fit the current codebase constraints
- Remaining unknowns are small, concrete, and actionable
- The resulting plan is ready to translate into implementation tasks

## Anti-Patterns

Do not:

- Ask multiple questions in one turn
- Ask questions whose answers are already in the repo
- Offer a menu of equal options without making a recommendation
- Dive into implementation details before dependencies are settled
- Reopen resolved branches unless new evidence invalidates them
- Keep the interview going after the plan is already clear enough to implement

## Repo-Specific Guidance For This Workspace

- Start from the current plain HTML/CSS/JS architecture before recommending framework changes.
- Treat [script.js](/Users/tnp.24/work/Golf/split/script.js) as the source of truth for current state shape, UI flow, and mutation boundaries.
- Prefer incremental design decisions that preserve the current direct-DOM model unless the user explicitly asks to replace it.
- If the topic is sharing or collaboration, account for the current lack of backend and persistence as a first-order constraint.

## Example Prompts

- Use grill-me to interview my editable share-link plan until it is implementation-ready.
- Grill me on this Supabase rollout one question at a time. Recommend the answer each round.
- Walk down the design tree for this migration and resolve dependencies before implementation.

## Handoff Output

When the interview concludes, summarize:

- the decisions made
- unresolved blockers, if any
- the next implementation-ready task list
