# Contract Proposal — Three-agent bare loop closes end-to-end

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## What will be built

- `src/agents/dev-agent.ts` — entry point script; reads the first task from Mission Control
  Inbox column, transitions it to Review via the MC HTTP API, exits with code 0
- `src/agents/review-agent.ts` — reads a task from Review, transitions to Quality Review, exits
- `src/agents/assurance-agent.ts` — reads a task from Quality Review, transitions to Done, exits
- `src/lib/mission-control-client.ts` — thin wrapper around Mission Control's HTTP API; exposes
  `getTaskInColumn(column)`, `moveTask(taskId, toColumn)`, `getTaskHistory(taskId)`
- `tests/unit/mission-control-client.test.ts` — unit tests with a mock HTTP client (no Docker)
- `tests/integration/s1-queue-transitions.test.ts` — full loop integration tests
  (`@integration` tag; skipped when Docker is not running)
- `docker-compose.yml` at repository root — pins Mission Control to the version confirmed
  during discovery; single `docker compose up` command starts all runtime dependencies

## What will NOT be built

- No skill loading, prompt hashing, or trace emission — those are S2–S4; agent scripts in
  this story are structurally correct stubs that S2–S4 will extend
- No polling mechanism — agents are invoked manually via CLI; no background process,
  cron job, or event listener introduced here or at any point in the prototype
- No error recovery or retry logic — out of scope for the prototype entirely per discovery

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 | Integration test: invoke dev agent entry point, assert MC task column is `Review` and process exit code is 0 | Integration (@integration) |
| AC2 | Integration test: invoke review agent against a task in Review, assert column is `Quality Review` and exit 0 | Integration |
| AC3 | Integration test: invoke assurance agent, assert column is `Done` and exit 0 | Integration |
| AC4 | Integration test: after full 3-agent sequence, read MC task history; assert exactly 3 distinct state transitions in sequence with no duplicates | Integration |
| AC5 | Integration test: reset, create second task, run full 3-agent sequence; assert second task in Done with 3 transitions | Integration |

## Assumptions

- Mission Control's HTTP API permits programmatic task state transitions without additional
  authentication beyond a local API key configured via environment variable
  (discovery assumption 2 — untested until this story runs)
- `docker compose up` starts Mission Control reliably within 30 seconds of invocation
- Mission Control task history API returns transitions in strict chronological order
- Column names for the four states are exactly: `Inbox`, `Review`, `Quality Review`, `Done`
  (to be confirmed against live MC API before implementation begins)

## Estimated touch points

**Files created:**
- `src/agents/dev-agent.ts`
- `src/agents/review-agent.ts`
- `src/agents/assurance-agent.ts`
- `src/lib/mission-control-client.ts`
- `tests/unit/mission-control-client.test.ts`
- `tests/integration/s1-queue-transitions.test.ts`
- `docker-compose.yml`

**Files modified:** None (first story — greenfield)

**Services:** Mission Control (local Docker only)

**External APIs:** None

---

## Contract review result

✅ **Contract review passed** — proposed implementation aligns with all 5 ACs.
No CSS-layout-dependent ACs. No shared state introduced. Agent script structure
explicitly designed to support S2–S4 extension (stubs only at this stage).
