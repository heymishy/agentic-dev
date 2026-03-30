## Test Plan: Three-agent bare loop closes end-to-end

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Test plan author:** Copilot
**Date:** 2026-03-30 — updated 2026-03-31 (ADR-002: filesystem queue replaces Mission Control)

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Dev agent invoked → task file moves `inbox/` → `review/`; script exits cleanly (exit code 0, no stderr) | 2 | 1 | — | — | — | 🟢 |
| AC2 | Review agent invoked → task file moves `review/` → `quality-review/`; script exits cleanly | 2 | 1 | — | — | — | 🟢 |
| AC3 | Assurance agent invoked → task file moves `quality-review/` → `done/`; script exits cleanly | 2 | 1 | — | — | — | 🟢 |
| AC4 | `queue/history.jsonl` contains exactly 3 entries after full loop: each with taskId, from, to, ISO timestamp; no duplicates | 1 | 1 | — | — | — | 🟢 |
| AC5 | Second task also reaches `done/` with 3 history entries — loop not sensitive to task identity | — | 1 | — | — | — | 🟢 |

---

## Coverage gaps

| Gap | AC | Gap type | Reason | Handling |
|-----|----|----------|--------|---------|
| No gap — integration tests run without Docker or external services | — | None | Filesystem ops require no external process | Integration tests use `os.tmpdir()` fixture dirs and run in any environment including CI |

---

## Test Data Strategy

**Source:** Synthetic — task JSON files created programmatically by test setup in a temporary directory; cleaned up in teardown.

**PCI/sensitivity in scope:** No — task IDs are synthetic (e.g. `test-task-s1-001`); no real work items.

**Availability:** No Docker, no network, no external service. Tests run wherever Node.js runs.

**Owner:** Each test creates its own isolated tmp directory; no shared filesystem state between tests.

### Data requirements per AC

| AC | Data needed | Source | Sensitive fields | Notes |
|----|-------------|--------|-----------------|-------|
| AC1–AC3 | A task JSON file in the source folder | Created in test setup via `fs.writeFileSync` | None | Task ID embedded in filename: `task-<id>.json` |
| AC4 | `queue/history.jsonl` after all 3 agent runs | Appended by each agent during test | None | Each line is a JSON object: `{ taskId, from, to, timestamp }` |
| AC5 | A second, distinct task JSON file | Created in setup; separate task ID | None | Distinct ID confirms loop is not stateful on task identity |

---

## Unit Tests

### `moveTask` — moves task file from source dir to dest dir

- **Verifies:** AC1, AC2, AC3 (filesystem move logic)
- **Precondition:** Temp dirs for source and dest created; `task-001.json` written to source dir with valid JSON payload.
- **Action:** Call `moveTask('task-001', sourceDir, destDir)`.
- **Expected result:** `task-001.json` exists in `destDir`; does not exist in `sourceDir`. No exception thrown.
- **Edge case:** No — happy path.

### `moveTask` — throws when source file does not exist

- **Verifies:** AC1 (clean exit constraint: an attempted move on a missing file must not silently succeed)
- **Precondition:** Source dir exists; no task file present.
- **Action:** Call `moveTask('task-missing', sourceDir, destDir)`.
- **Expected result:** Throws an error. Does not return silently. Does not create any file.
- **Edge case:** Yes — missing source file.

### `appendHistory` — appends a valid JSONL entry to history file

- **Verifies:** AC4 (history append logic)
- **Precondition:** Temp dir with no history file yet.
- **Action:** Call `appendHistory('task-001', 'inbox', 'review', historyPath)`.
- **Expected result:** `historyPath` exists and contains exactly one line; parsed JSON has keys `taskId`, `from`, `to`, `timestamp`; `timestamp` is a valid ISO string.
- **Edge case:** No.

### `parseHistory` — reads and parses all history entries in order

- **Verifies:** AC4 (history parsing logic)
- **Precondition:** History file containing 3 manually written JSONL lines: `inbox→review`, `review→quality-review`, `quality-review→done`.
- **Action:** Call `parseHistory(historyPath)`.
- **Expected result:** Returns an array of 3 objects in the order written. Each has `taskId`, `from`, `to`, `timestamp` fields.
- **Edge case:** No.

### `getTaskInDir` — returns task filename when exactly one task JSON is present

- **Verifies:** AC1, AC2, AC3 (agent entry point's ability to pick up the waiting task)
- **Precondition:** Temp dir containing exactly one file: `task-001.json`.
- **Action:** Call `getTaskInDir(dir)`.
- **Expected result:** Returns `'task-001'` (the task ID, without path or extension).
- **Edge case:** No.

### `getTaskInDir` — throws when directory is empty

- **Verifies:** AC1 (agent must not silently do nothing when no task is waiting)
- **Precondition:** Empty temp dir.
- **Action:** Call `getTaskInDir(dir)`.
- **Expected result:** Throws an error containing "no task".
- **Edge case:** Yes — empty queue directory.

---

## Integration Tests

All integration tests use isolated temporary directories. No Docker. No external services.
Tagged `@integration` and run via `npm run test:integration`.

### Dev agent — task file moves from inbox to review

- **Verifies:** AC1
- **Precondition:** Tmp queue dirs created; `task-001.json` placed in `inbox/`.
- **Action:** Run `npx ts-node src/agents/dev-agent.ts --queueRoot <tmpDir> --taskId task-001`.
- **Expected result:** (1) Script exits with code 0. (2) No content written to stderr. (3) `task-001.json` exists in `tmpDir/review/`; does not exist in `tmpDir/inbox/`.
- **Tag:** `@integration`

### Review agent — task file moves from review to quality-review

- **Verifies:** AC2
- **Precondition:** Tmp queue dirs; `task-001.json` in `review/` (from AC1 run or setup).
- **Action:** Run `npx ts-node src/agents/review-agent.ts --queueRoot <tmpDir> --taskId task-001`.
- **Expected result:** (1) Exit code 0. (2) No stderr. (3) `task-001.json` in `tmpDir/quality-review/`; not in `review/`.
- **Tag:** `@integration`

### Assurance agent — task file moves from quality-review to done

- **Verifies:** AC3
- **Precondition:** Tmp queue dirs; `task-001.json` in `quality-review/`.
- **Action:** Run `npx ts-node src/agents/assurance-agent.ts --queueRoot <tmpDir> --taskId task-001`.
- **Expected result:** (1) Exit code 0. (2) No stderr. (3) `task-001.json` in `tmpDir/done/`; not in `quality-review/`.
- **Tag:** `@integration`

### Full loop history — three entries in `history.jsonl`, in sequence, no duplicates

- **Verifies:** AC4
- **Precondition:** The same task has been moved through AC1→AC2→AC3 in a single tmp queue.
- **Action:** Read `tmpDir/history.jsonl`; parse each line as JSON.
- **Expected result:** Exactly 3 entries in order: `inbox→review`, `review→quality-review`, `quality-review→done`. No entry appears twice. Each entry contains `taskId`, `from`, `to`, and a valid ISO `timestamp`.
- **Tag:** `@integration`

### Second task — loop is not sensitive to task identity

- **Verifies:** AC5
- **Precondition:** A second distinct task (`task-002.json`) placed in `inbox/` of a fresh tmp queue.
- **Action:** Run all three agent scripts sequentially against `task-002`.
- **Expected result:** `task-002.json` in `done/`; `history.jsonl` contains exactly 3 entries for `task-002`; structure identical to the first task's run.
- **Tag:** `@integration`

---

## NFR Tests

### Each agent script completes its filesystem interaction within 1 second

- **Verifies:** NFR (Performance)
- **Mechanism:** Time each agent script invocation in the integration tests. Jest timeout set to 5000 ms per test as a safety bound. Record actual elapsed times in test output.
- **Pass condition:** No integration test times out at 5 seconds. Actual times are expected to be well under 100 ms (filesystem rename is near-instantaneous).
- **Tag:** `@integration`

---

## Out of Scope for this test plan

- Skill loading, prompt hashing, or trace emission — added in S2–S4; not present in the bare loop
- Governance or criteria-checking logic — no policies applied in this story
- Failure handling or retry logic — out of scope for the prototype entirely
- Autonomous polling — agents are always manually triggered; no polling loop
