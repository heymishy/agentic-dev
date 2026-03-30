# Story: Three-agent bare loop closes end-to-end

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As an **engineer building the prototype**,
I want a task to move from `queue/inbox/` to `queue/done/` through three sequentially
invoked TypeScript agent scripts with no governance logic yet,
So that I can confirm the filesystem queue produces reliable state transitions under
sequential programmatic invocation before adding the governance layer that depends on
them — directly moving metric M1 (autonomous loop completion) from 0% to a proven
plumbing baseline.

## Benefit Linkage

**Metric moved:** M1 — Autonomous loop completion on an unseen task
**How:** This story establishes that the bare queue skeleton works under the conditions
the governance loop requires. Without this, M1 cannot be measured — the system doesn't
exist. The filesystem queue replaces Mission Control as the queue mechanism (see ADR-002);
if queue semantics fail here, an alternative queue design must be chosen before continuing.

## Architecture Constraints

- TypeScript strict mode — mandatory, no exceptions (discovery constraint)
- Filesystem queue via folder moves and JSON task files — no Docker, no external services, no HTTP client (ADR-002)
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

**AC1:** Given the queue is initialised (folders exist) and a task JSON file exists in
  `queue/inbox/`, When the dev agent script is invoked via the command line,
  Then the task file has moved to `queue/review/` and the script exits cleanly with
  no error output.

**AC2:** Given the task file is in `queue/review/`, When the review agent script is
  invoked, Then the task file has moved to `queue/quality-review/` and the script
  exits cleanly with no error output.

**AC3:** Given the task file is in `queue/quality-review/`, When the assurance agent
  script is invoked, Then the task file has moved to `queue/done/` and the script
  exits cleanly with no error output.

**AC4:** Given all three agent scripts have been invoked sequentially, When
  `queue/history.jsonl` is read, Then it contains exactly three transition entries
  — one per agent invocation — in chronological order with no duplicates or dropped
  transitions, and each entry records the task ID, the from-folder, the to-folder,
  and an ISO timestamp.

**AC5:** Given the full sequence is run a second time against a different task (to
  confirm the loop isn't sensitive to task identity), When all three scripts are
  invoked, Then the second task also moves to `queue/done/` cleanly with three
  recorded transitions in `queue/history.jsonl`.

## Out of Scope

- Skill loading, prompt hashing, or trace emission — added in S2–S4; this story
  establishes the loop structure only
- Any governance or criteria-checking logic — no policies are applied in this story
- Failure handling, retry logic, or error recovery — out of scope for the prototype
  entirely (deferred per discovery)
- Autonomous agent polling — agents are always manually triggered (discovery
  out-of-scope item 1); no polling loop is introduced at any point

## NFRs

- **Performance:** Each agent script completes its queue interaction within 1 second
  under normal local conditions (filesystem rename is effectively instantaneous; this
  is a sanity bound, not a hard SLO)
- **Security:** No credentials, tokens, or organisational data referenced in any script;
  scripts must be runnable on a personal machine using only public tooling
- **Audit:** `queue/history.jsonl` (append-only) is sufficient audit at this stage;
  no additional logging required until S2 adds trace emission

## Complexity Rating

**Rating:** 1
**Scope stability:** Stable — filesystem operations are well-understood; no external service
dependency, no alpha software, no Docker required. Queue semantics under sequential
programmatic invocation are deterministic. See ADR-002.
