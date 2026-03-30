# Contract Proposal — Three-agent bare loop closes end-to-end

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
**Assessed by:** Copilot
**Date:** 2026-03-31 — updated 2026-03-31 (ADR-002: filesystem queue replaces Mission Control)

---

## What will be built

- `src/agents/dev-agent.ts` — CLI entry point; reads the task from `queue/inbox/`, moves it to `queue/review/` via the queue client, appends a history entry, exits code 0
- `src/agents/review-agent.ts` — reads task from `queue/review/`, moves to `queue/quality-review/`, appends history, exits
- `src/agents/assurance-agent.ts` — reads task from `queue/quality-review/`, moves to `queue/done/`, appends history, exits
- `src/lib/queue-client.ts` — filesystem queue operations: `moveTask(taskId, fromDir, toDir)`, `getTaskInDir(dir)`, `appendHistory(taskId, from, to, historyPath)`, `parseHistory(historyPath)`
- `tests/unit/queue-client.test.ts` — 6 unit tests (pure filesystem, no network, no Docker)
- `tests/integration/s1-bare-loop.integration.test.ts` — 5 integration tests using `os.tmpdir()` fixture dirs
- `scripts/init-queue.sh` — creates `queue/{inbox,review,quality-review,done}/` and empty `queue/history.jsonl`; replaces `docker compose up`

## What will NOT be built

- No HTTP client, no Docker, no external service dependency — the queue is purely filesystem
- No skill loading, prompt hashing, or trace emission — those are S2–S4; agent scripts in
  this story are structurally correct stubs that S2–S4 will extend
- No polling mechanism — agents are invoked manually via CLI; no background process,
  cron job, or event listener introduced here or at any point in the prototype
- No error recovery or retry logic — out of scope for the prototype entirely per discovery

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 | Integration test: invoke dev agent with `--queueRoot` pointing to tmp dir; assert `task-001.json` in `review/`, not in `inbox/`; exit code 0 | Integration (`@integration`) |
| AC2 | Integration test: invoke review agent; assert `task-001.json` in `quality-review/`, not in `review/`; exit 0 | Integration |
| AC3 | Integration test: invoke assurance agent; assert `task-001.json` in `done/`, not in `quality-review/`; exit 0 | Integration |
| AC4 | Integration test: after full 3-agent sequence, read `history.jsonl`; assert exactly 3 entries in order, each with `taskId`, `from`, `to`, valid ISO `timestamp` | Integration |
| AC5 | Integration test: fresh tmp dir, second task; assert same structure as first run | Integration |

## Queue directory contract

```
queue/
  inbox/          ← dev agent reads from here
  review/         ← review agent reads from here
  quality-review/ ← assurance agent reads from here
  done/           ← final destination
  history.jsonl   ← append-only; each line: { "taskId": "...", "from": "...", "to": "...", "timestamp": "..." }
```

Each task file is `task-<id>.json` containing at minimum `{ "id": "<id>", "title": "..." }`.
`moveTask()` uses `fs.renameSync()` — atomic on a single filesystem.

## Assumptions

- `fs.renameSync()` is atomic on a single filesystem (POSIX guarantee; macOS/Linux/Windows all satisfy this for same-volume moves)
- Agent scripts receive `--queueRoot <path>` and `--taskId <id>` CLI arguments; no hardcoded paths
- Integration tests create isolated tmp directories; cleanup in `afterEach`
- No concurrent writes to `history.jsonl` — prototype is sequential, single-threaded

## Estimated touch points

**Files created:**
- `src/agents/dev-agent.ts`
- `src/agents/review-agent.ts`
- `src/agents/assurance-agent.ts`
- `src/lib/queue-client.ts`
- `tests/unit/queue-client.test.ts`
- `tests/integration/s1-bare-loop.integration.test.ts`
- `scripts/init-queue.sh`

**Files modified:**
- `package.json` — remove `node-fetch` dependency; add `init-queue` npm script

**Files removed:**
- `docker-compose.yml` — no longer required (ADR-002)

**Services:** None

**External APIs:** None

---

## Contract review result

✅ **Contract review passed** — proposed implementation aligns with all 5 ACs.
No HTTP dependencies. No Docker. No shared state introduced between agent files.
Agent script structure explicitly designed to support S2–S4 extension (stubs only at this stage).
Queue root injected via CLI argument — integration tests can use `os.tmpdir()` without
any environment-specific setup.
