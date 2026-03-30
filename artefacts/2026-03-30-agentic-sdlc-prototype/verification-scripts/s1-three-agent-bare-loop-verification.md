## AC Verification Script: Three-agent bare loop closes end-to-end

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s1-three-agent-bare-loop-test-plan.md`
**Verification author:** Copilot
**Date:** 2026-03-30

---

## Prerequisites

1. Docker Desktop is installed and running.
2. Repository is cloned.
3. `npm install` has been run.
4. `npm test` (unit tests only) exits 0.
5. `docker compose up -d` has been run and Mission Control is accessible at `http://localhost:PORT` (check `docker compose ps` for the port).

---

## Scenario 1 — AC1: Dev agent moves task to Review

**Setup:** Create a task in Mission Control Inbox via the API or UI. Record the task ID.

**Steps:**
1. Note the task is in the `Inbox` column.
2. Run: `npx ts-node src/agents/dev-agent.ts --taskId <id>`
3. Observe the terminal output and exit code.

**Expected result:** Terminal shows only success output (no stack traces, no `Error:` lines). Script exits with code 0 (`echo $LASTEXITCODE` → `0`). Mission Control shows the task in the `Review` column.

**Pass condition:** Exit code 0. No stderr. Task is in `Review`.

---

## Scenario 2 — AC2: Review agent moves task to Quality Review

**Setup:** Task is in `Review` column (from Scenario 1).

**Steps:**
1. Run: `npx ts-node src/agents/review-agent.ts --taskId <id>`
2. Observe output and exit code.

**Expected result:** Exit code 0. No stderr. Task is in `QualityReview`.

**Pass condition:** Exit code 0. No error output. Task column is `QualityReview`.

---

## Scenario 3 — AC3: Assurance agent moves task to Done

**Setup:** Task is in `QualityReview` column (from Scenario 2).

**Steps:**
1. Run: `npx ts-node src/agents/assurance-agent.ts --taskId <id>`
2. Observe output and exit code.

**Expected result:** Exit code 0. No stderr. Task is in `Done`.

**Pass condition:** Exit code 0. No error output. Task column is `Done`.

---

## Scenario 4 — AC4: History shows exactly 3 transitions in sequence

**Setup:** Task has been moved through all three columns (Scenarios 1–3 complete).

**Steps:**
1. Query the Mission Control history for the task:
   `curl http://localhost:<PORT>/api/tasks/<id>/history`
   or inspect the task's history in the Mission Control UI.
2. Count the transition entries.
3. Confirm order: `Inbox→Review`, `Review→QualityReview`, `QualityReview→Done`.

**Expected result:** Exactly 3 transition entries. Order is sequential. No entry appears twice. No transitions to unexpected columns.

**Pass condition:** 3 entries. Correct sequence. No duplicates.

---

## Scenario 5 — AC5: Second task runs cleanly (loop is not task-identity-sensitive)

**Setup:** Create a second task in Inbox with a different name from the first.

**Steps:**
1. Record the second task's ID.
2. Run all three agent scripts in sequence against the new task ID (repeat Scenarios 1–3).
3. Query the second task's history.

**Expected result:** Second task reaches `Done` with exactly 3 transitions. No residual state from the first task appears. Behaviour is identical to the first run.

**Pass condition:** Second task has 3 transitions, reaches Done cleanly. Integration test `npm run test:integration` passes for the second-task test.

---

## Summary

| Scenario | AC | Pass condition | Status |
|----------|----|----------------|--------|
| 1 | AC1 | Exit 0, no stderr, task in Review | ⬜ |
| 2 | AC2 | Exit 0, no stderr, task in QualityReview | ⬜ |
| 3 | AC3 | Exit 0, no stderr, task in Done | ⬜ |
| 4 | AC4 | Exactly 3 transitions in correct order, no duplicates | ⬜ |
| 5 | AC5 | Second task reaches Done cleanly, 3 transitions | ⬜ |
