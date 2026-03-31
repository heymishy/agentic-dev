## AC Verification Script: Three-agent bare loop closes end-to-end

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s1-three-agent-bare-loop-test-plan.md`
**Verification author:** Copilot
**Date:** 2026-03-31 (rewritten — filesystem queue, ADR-002)

---

## Prerequisites

1. Repository cloned; `npm install` run inside `.worktrees/s1-three-agent-bare-loop/`.
2. `npm run init-queue` run (creates `queue/{inbox,review,quality-review,done}/` and `queue/history.jsonl`).
3. No Docker required.

---

## Verification commands

```bash
# Unit suite
npm test

# Integration suite (runs all 5 ACs)
npm run test:integration
```

---

## Scenario 1 — AC1: Dev agent moves task from inbox to review

**What proves it:** integration test `AC1: dev agent moves task from inbox to review`

**Mechanics:**
1. Fixture creates `os.tmpdir()/s1-integration-<rand>/inbox/task-001.json`.
2. `spawnSync([node, ts-node-bin, src/agents/dev-agent.ts, --queueRoot, <tmpdir>, --taskId, task-001])` is called.
3. Test asserts `review/task-001.json` exists and `inbox/task-001.json` is absent.
4. Agent exit code must be 0 (spawnSync result.status); any non-zero throws and fails the test.

**Pass condition:** Exit 0. No stderr. File present in `review/`, absent from `inbox/`.

---

## Scenario 2 — AC2: Review agent moves task from review to quality-review

**What proves it:** integration test `AC2: review agent moves task from review to quality-review`

**Mechanics:**
1. Fixture creates `review/task-001.json` directly (independent of Scenario 1 fixture).
2. `spawnSync([node, ts-node-bin, src/agents/review-agent.ts, --queueRoot, <tmpdir>, --taskId, task-001])`.
3. Asserts `quality-review/task-001.json` exists; `review/task-001.json` absent.

**Pass condition:** Exit 0. File present in `quality-review/`, absent from `review/`.

---

## Scenario 3 — AC3: Assurance agent moves task from quality-review to done

**What proves it:** integration test `AC3: assurance agent moves task from quality-review to done`

**Mechanics:**
1. Fixture creates `quality-review/task-001.json`.
2. `spawnSync([node, ts-node-bin, src/agents/assurance-agent.ts, --queueRoot, <tmpdir>, --taskId, task-001])`.
3. Asserts `done/task-001.json` exists; `quality-review/task-001.json` absent.

**Pass condition:** Exit 0. File present in `done/`, absent from `quality-review/`.

---

## Scenario 4 — AC4: history.jsonl has exactly 3 entries in sequence

**What proves it:** integration test `AC4: history.jsonl has exactly 3 entries in sequence after full loop`

**Mechanics:**
1. Runs all three agents sequentially against the same `task-001` fixture.
2. Calls `parseHistory(path.join(queueRoot, 'history.jsonl'))`.
3. Asserts `history.length === 3`.
4. Asserts `history[0]` matches `{ from: 'inbox', to: 'review', taskId: 'task-001' }`.
5. Asserts `history[1]` matches `{ from: 'review', to: 'quality-review', taskId: 'task-001' }`.
6. Asserts `history[2]` matches `{ from: 'quality-review', to: 'done', taskId: 'task-001' }`.
7. For each entry: `new Date(entry.timestamp).toISOString() === entry.timestamp` (valid ISO 8601).

**Pass condition:** 3 entries. Correct sequence. No duplicates. All timestamps are valid ISO 8601.

---

## Scenario 5 — AC5: Second task reaches done cleanly (loop not task-identity sensitive)

**What proves it:** integration test `AC5: second task reaches done with 3 transitions — loop not sensitive to task identity`

**Mechanics:**
1. Creates a **separate, independent** fixture root (`root2`) — not the same tmpdir as AC1–AC4.
2. Creates `root2/inbox/task-002.json` (different task ID: `task-002`, not `task-001`).
3. Runs all three agents against `root2` with `--taskId task-002`.
4. Asserts `root2/done/task-002.json` exists.
5. Calls `parseHistory(root2/history.jsonl)` — asserts length 3, all entries have `taskId: 'task-002'`.
6. `root2` fixture is torn down in `finally` block regardless of outcome.

**Pass condition:** `task-002` reaches `done/` cleanly. 3 transitions in `root2/history.jsonl`, all for `task-002`. Zero residual state from the first run (separate fixture).

---

## Summary

| Scenario | AC | Test | Pass condition | Status |
|----------|----|------|----------------|--------|
| 1 | AC1 | `AC1: dev agent moves task from inbox to review` | Exit 0, file in review/, absent from inbox/ | ⬜ |
| 2 | AC2 | `AC2: review agent moves task from review to quality-review` | Exit 0, file in quality-review/, absent from review/ | ⬜ |
| 3 | AC3 | `AC3: assurance agent moves task from quality-review to done` | Exit 0, file in done/, absent from quality-review/ | ⬜ |
| 4 | AC4 | `AC4: history.jsonl has exactly 3 entries in sequence after full loop` | 3 entries, correct sequence, valid ISO timestamps | ⬜ |
| 5 | AC5 | `AC5: second task reaches done with 3 transitions — loop not sensitive to task identity` | task-002 in done/, 3 transitions, separate fixture, no cross-contamination | ⬜ |
