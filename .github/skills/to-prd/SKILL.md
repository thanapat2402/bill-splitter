---
name: to-prd
description: Turn the current conversation context into a PRD and submit it as a GitHub issue. Use when user wants to create a PRD from the current context.
---

# To PRD

Use this skill when the user wants a product requirements document synthesized from the current conversation and codebase understanding.

This skill is synthesis-first. Do not interview the user again unless the request is genuinely blocked by missing information. Prefer turning what is already known into a PRD that is ready to review.

## What This Skill Produces

- A PRD based on the active conversation context and current repo state
- A clear list of user-visible goals and user stories
- A design-oriented breakdown of major modules to build or modify
- Testing decisions tied to observable behavior
- GitHub-issue-ready markdown when issue submission is not directly available

## Core Rules

1. Do not re-ask the user for context that already exists in the conversation or codebase.
2. Explore the repo first if implementation shape or current constraints are relevant.
3. Synthesize; do not brainstorm broadly.
4. Prefer deep modules over shallow wiring when outlining implementation decisions.
5. Do not include file paths or code snippets in the PRD body.
6. Keep implementation decisions concrete enough to guide work, but stable enough not to rot immediately.
7. If GitHub issue creation is unavailable in the current environment, produce issue-ready markdown and state that limitation briefly.

## Process

### 1. Reconstruct the Product Goal

Use the conversation history as the primary source.

Extract:

- the user problem from the user's perspective
- the intended solution from the user's perspective
- any constraints already decided
- explicit non-goals or deferred work

If the conversation already settled major architecture choices, treat them as decisions, not open questions.

### 2. Explore the Current Codebase

Inspect the repo just enough to understand:

- the current implementation model
- the main state and rendering boundaries
- which modules are already present implicitly or explicitly
- where new deep modules could be introduced cleanly
- what testing patterns exist, if any

Focus on current behavior and boundaries, not exhaustive repo mapping.

### 3. Sketch the Major Modules

Identify the smallest set of meaningful modules needed to support the feature.

Prefer modules that:

- hide complicated behavior behind a simple interface
- are testable in isolation
- centralize volatile logic such as permissions, persistence, validation, conflict handling, or serialization

For each module, clarify:

- responsibility
- external interface
- key invariants
- whether it is new or an evolution of an existing part of the system

If the repo is small and mostly single-file today, you may still describe conceptual modules without requiring a full file split.

### 4. Decide Testing Scope

State what should be tested based on external behavior.

Prefer testing:

- user-visible state transitions
- permission boundaries
- validation behavior
- load/save/conflict behavior
- serialization/deserialization boundaries

Do not recommend tests that only mirror implementation details.

If the codebase has no automated tests, say so plainly and recommend the first high-value test seams.

### 5. Write the PRD

Use this exact structure:

```md
## Problem Statement

## Solution

## User Stories

## Implementation Decisions

## Testing Decisions

## Out of Scope

## Further Notes
```

Requirements:

- User stories must be a long, numbered list.
- Implementation decisions must capture modules, interfaces, architecture, schema, contracts, and interaction decisions.
- Testing decisions must define what good tests assert and which modules deserve tests.
- Out-of-scope items should protect the team from scope creep.

### 6. Submit or Prepare Issue Content

If GitHub issue submission is available, submit the PRD as an issue.

If it is not available:

- produce the PRD in issue-ready markdown
- say that direct issue submission could not be completed in the current environment
- keep the PRD itself complete enough to paste directly into GitHub

## Repo-First Heuristics

Use the current workspace to sharpen the PRD.

- Treat the current state shape, mutation flow, and rendering boundaries as evidence.
- Distinguish between current implementation constraints and future-state module boundaries.
- If the app is currently static or local-only, call out the infrastructure boundary explicitly in the PRD.
- If the codebase already contains partial scaffolding for the feature, include that in implementation decisions.

## Deep Module Guidance

Actively look for deep modules such as:

- persistence boundary
- permission/mode controller
- serialization and validation layer
- sharing/link management
- conflict resolution or sync lifecycle

Avoid shallow modules whose only purpose is to move values from one function to another.

## Quality Bar

The PRD is ready when:

- it reflects the current conversation accurately
- it captures the feature from the user's perspective, not only the developer's
- user stories are broad enough to cover edge cases and operational states
- implementation decisions are specific without being tied to unstable code details
- testing decisions emphasize external behavior
- out-of-scope items are explicit

## Anti-Patterns

Do not:

- ask the user to restate known requirements
- write a thin summary and call it a PRD
- omit user stories for error states, permission states, or empty states
- overfit implementation decisions to exact current file paths
- recommend tests that assert private function internals
- pretend the GitHub issue was submitted if no submission tool exists

## Repo-Specific Guidance For This Workspace

- The current app is a small static HTML/CSS/JS bill-splitting app with direct DOM rendering and no backend by default.
- Current conversation context already includes sharing, Supabase-backed persistence, edit/view modes, save lifecycle, and incremental plain-JS rollout decisions.
- Current code already has early share-state scaffolding; account for existing local/share mode work when writing the PRD.
- Treat the current direct-DOM architecture as the baseline unless the conversation explicitly changed that decision.

## Output Checklist

Before finishing, ensure the final result includes:

- the PRD itself
- a concise list of major modules
- a concise list of modules recommended for tests
- a note about issue submission success or limitation

## Example Prompts

- Use to-prd to turn this conversation into a PRD for editable trip sharing.
- Convert the current design discussion into a PRD and prepare it as a GitHub issue.
- Synthesize the current repo state and feature plan into a PRD without re-interviewing me.
