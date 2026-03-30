## Test Plan: Three-agent bare loop closes end-to-end

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Test plan author:** Copilot
**Date:** 2026-03-30

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Dev agent invoked → task moves to Review; script exits cleanly (exit code 0, no error output) | 1 | 1 | — | — | — | 🟢 |
| AC2 | Review agent invoked → task moves to Quality Review; script exits cleanly | 1 | 1 | — | — | — | 🟢 |
| AC3 | Assurance agent invoked → task moves to Done; script exits cleanly | 1 | 1 | — | — | — | 🟢 |
| AC4 | Mission Control history shows exactly 3 transitions for the task, in sequence, no duplicates or dropped transitions | — | 1 | — | — | — | 🟢 |
| AC5 | Second task also reaches Done with 3 transitions — loop is not sensitive to task identity | — | 1 | — | — | — | 🟢 |

---

## Coverage gaps

| Gap | AC | Gap type | Reason | Handling |
|-----|----|----------|--------|---------|
| Integration tests require a running Mission Control instance (Docker Compose). Cannot be run in a standard Jest environment without Docker. | AC1–AC5 | Tooling constraint | Mission Control runs as a Docker container; no in-process mock that faithfully replicates its queue state transition semantics. | Integration tests are tagged `@integration` and run separately from unit tests (`npm run test:integration`). Unit tests use a lightweight queue-client mock for structure-only verification. |

---

## Test Data Strategy

**Source:** Synthetic — tasks created programmatically by test setup using Mission Control's API; deleted in teardown.

**PCI/sensitivity in scope:** No — task names are synthetic (e.g. `test-task-s1-001`); no real work items.

**Availability:** Requires `docker compose up` in the test environment. Integration tests are gated behind a Docker availability check — they skip cleanly when Docker is not running rather than failing.

**Owner:** Each integration test creates and deletes its own task; no shared task state.

### Data requirements per AC

| AC | Data needed | Source | Sensitive fields | Notes |
|----|-------------|--------|-----------------|-------|
| AC1–AC3 | A task in Inbox column | Created in test setup via Mission Control API | None | Task ID returned by API; passed to agent scripts as argument |
| AC4 | Same task after full 3-agent run | Created in setup; history read post-run | None | History endpoint returns ordered list of transitions |
| AC5 | A second, distinct task in Inbox | Created in setup; separate task ID | None | Distinct ID confirms loop is not stateful on task identity |

---

## Unit Tests

### `moveTaskToColumn` — returns updated task state when API responds successfully

- **Verifies:** AC1, AC2, AC3 (structure of queue interaction, not live Mission Control)
- **Precondition:** Mock HTTP client configured to return `200 OK` with updated task body; column argument is `"Review"`.
- **Action:** Call `moveTaskToColumn(taskId, 'Review', mockClient)`.
- **Expected result:** Returns an object with `column: "Review"` and the original `taskId`. No exception thrown.
- **Edge case:** No — happy path.

### `moveTaskToColumn` — throws when Mission Control API returns non-200

- **Verifies:** AC1 (clean exit constraint: a failed API call is not a clean exit)
- **Precondition:** Mock HTTP client configured to return `503 Service Unavailable`.
- **Action:** Call `moveTaskToColumn(taskId, 'Review', mockClient)`.
- **Expected result:** Throws a typed error containing the HTTP status. Does not return silently.
- **Edge case:** Yes — API failure.

### `parseTaskHistory` — extracts ordered transition list from Mission Control history response

- **Verifies:** AC4 (history parsing logic, independent of live Mission Control)
- **Precondition:** Synthetic Mission Control history response JSON with 3 transition records: `Inbox→Review`, `Review→QualityReview`, `QualityReview→Done`.
- **Action:** Call `parseTaskHistory(historyResponseJson)`.
- **Expected result:** Returns an array of 3 strings in order: `["Inbox→Review", "Review→QualityReview", "QualityReview→Done"]`. No duplicates.
- **Edge case:** No.

---

## Integration Tests

### Dev agent — task transitions from Inbox to Review

- **Verifies:** AC1
- **Precondition:** Mission Control running via Docker Compose; task created in Inbox via API.
- **Action:** Run `npx ts-node src/agents/dev-agent.ts --taskId <id>`.
- **Expected result:** (1) Script exits with code 0. (2) No content written to stderr. (3) Task column is `Review` when queried via Mission Control API immediately after.
- **Edge case:** No.
- **Tag:** `@integration`

### Review agent — task transitions from Review to Quality Review

- **Verifies:** AC2
- **Precondition:** Mission Control running; task in Review column (from AC1 run or setup).
- **Action:** Run `npx ts-node src/agents/review-agent.ts --taskId <id>`.
- **Expected result:** (1) Exit code 0. (2) No stderr. (3) Task column is `QualityReview`.
- **Tag:** `@integration`

### Assurance agent — task transitions from Quality Review to Done

- **Verifies:** AC3
- **Precondition:** Mission Control running; task in QualityReview column.
- **Action:** Run `npx ts-node src/agents/assurance-agent.ts --taskId <id>`.
- **Expected result:** (1) Exit code 0. (2) No stderr. (3) Task column is `Done`.
- **Tag:** `@integration`

### Full loop history — three transitions recorded in sequence, no duplicates

- **Verifies:** AC4
- **Precondition:** The same task has been moved through AC1→AC2→AC3 in sequence.
- **Action:** Query the Mission Control task history API for the task.
- **Expected result:** History contains exactly 3 entries in order: `Inbox→Review`, `Review→QualityReview`, `QualityReview→Done`. No entry appears twice.
- **Tag:** `@integration`

### Second task — loop is not sensitive to task identity

- **Verifies:** AC5
- **Precondition:** A second distinct task created in Inbox (different ID and name from the first task).
- **Action:** Run all three agent scripts sequentially against the second task.
- **Expected result:** Second task reaches Done with exactly 3 transitions. History is identical in structure to the first task's history.
- **Tag:** `@integration`

---

## NFR Tests

### Each agent script completes queue interaction within 5 seconds

- **Verifies:** NFR (Performance)
- **Mechanism:** Time each agent script invocation in the integration tests. Jest timeout for integration tests set to 6000 ms per test (buffer above 5-second signal). Record actual elapsed times in test output.
- **Pass condition:** No integration test times out at 6 seconds. Elapsed times logged for reference.
- **Tag:** `@integration`

---

## Out of Scope for this test plan

- Skill loading, prompt hashing, or trace emission — added in S2–S4; not present in the bare loop
- Governance or criteria-checking logic — no policies applied in this story
- Failure handling or retry logic — out of scope for the prototype entirely
- Autonomous polling — agents are always manually triggered; no polling loop
