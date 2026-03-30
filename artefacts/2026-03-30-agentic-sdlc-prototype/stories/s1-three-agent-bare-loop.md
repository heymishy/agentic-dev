# Story: Three-agent bare loop closes end-to-end

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As an **engineer building the prototype**,
I want a task to move from Mission Control Inbox to Done through three sequentially
invoked TypeScript agent scripts with no governance logic yet,
So that I can confirm Mission Control's queue state transitions are reliable under
programmatic sequential invocation before adding the governance layer that depends on
them — directly moving metric M1 (autonomous loop completion) from 0% to a proven
plumbing baseline.

## Benefit Linkage

**Metric moved:** M1 — Autonomous loop completion on an unseen task
**How:** This story establishes that the bare queue skeleton works under the conditions
the governance loop requires. Without this, M1 cannot be measured — the system doesn't
exist. If queue semantics fail here, the entire prototype approach must be reconsidered
before any further work.

## Architecture Constraints

- TypeScript strict mode — mandatory, no exceptions (discovery constraint)
- Mission Control via Docker Compose — no runtime substitutions (discovery constraint)
- Skills read from local filesystem only (discovery constraint) — not yet exercised in
  this story, but agent script structure must be designed to support it in S2
- No external system connections of any kind (discovery constraint)
- All code must be shareable publicly — no proprietary or organisational references
  (discovery constraint)
- This story establishes the agent invocation pattern; S2–S4 must conform to it

## Dependencies

- **Upstream:** None — this is the first story
- **Downstream:** S2, S3, S4 all depend on this story's agent invocation pattern and
  confirmed queue semantics

## Acceptance Criteria

**AC1:** Given Mission Control is running locally via `docker compose up` and a task
  exists in the Inbox column, When the dev agent script is invoked via the command line,
  Then the task transitions to the Review column in Mission Control and the script exits
  cleanly with no error output.

**AC2:** Given the task is in the Review column, When the review agent script is invoked,
  Then the task transitions to the Quality Review column in Mission Control and the
  script exits cleanly with no error output.

**AC3:** Given the task is in the Quality Review column, When the assurance agent script
  is invoked, Then the task transitions to the Done column in Mission Control and the
  script exits cleanly with no error output.

**AC4:** Given all three agent scripts have been invoked sequentially, When the Mission
  Control board is inspected, Then the task is in Done and its activity history shows
  three distinct state transitions — one per agent invocation — with no duplicates or
  dropped transitions.

**AC5:** Given the full sequence is run a second time against a different task (to
  confirm the loop isn't sensitive to task identity), When all three scripts are invoked,
  Then the second task also moves to Done cleanly with three recorded transitions.

## Out of Scope

- Skill loading, prompt hashing, or trace emission — added in S2–S4; this story
  establishes the loop structure only
- Any governance or criteria-checking logic — no policies are applied in this story
- Failure handling, retry logic, or error recovery — out of scope for the prototype
  entirely (deferred per discovery)
- Autonomous agent polling — agents are always manually triggered (discovery
  out-of-scope item 1); no polling loop is introduced at any point

## NFRs

- **Performance:** Each agent script completes its queue interaction within 5 seconds
  under normal local conditions (not a hard SLO — a signal that Mission Control's
  programmatic API is responsive enough for the prototype)
- **Security:** No credentials, tokens, or organisational data referenced in any script;
  scripts must be runnable on a personal machine using only public tooling
- **Audit:** The Mission Control task history (built-in) is sufficient audit at this
  stage; no additional logging required until S2 adds trace emission

## Complexity Rating

**Rating:** 2
**Scope stability:** Unstable — Mission Control is alpha software; queue semantics under
programmatic sequential invocation are an untested assumption. If this story fails, the
prototype approach requires reassessment (see discovery assumptions).
