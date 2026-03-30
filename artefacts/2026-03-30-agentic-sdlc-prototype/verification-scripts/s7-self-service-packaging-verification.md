## AC Verification Script: Self-service packaging — Docker Compose, README, 30-minute bar validated

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s7-self-service-packaging.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s7-self-service-packaging-test-plan.md`
**Verification author:** Copilot
**Date:** 2026-03-30

---

## Prerequisites

1. S1–S6 all complete with no open defects.
2. `tsc --strict --noEmit` exits 0.
3. `npm test` exits 0 (unit tests).
4. Docker Compose health check integration test passes: `npm run test:integration -- --testPathPattern s7`.
5. Dry-run participant identified and available.
6. No credentials or org data in repository (pre-dry-run security grep passes).
7. Cold-start independence mechanism documented in README (from S4 Decisions Gate closure).
8. Tamper-evidence description in README (from S6 AC4).

---

## Pre-dry-run checklist (builder completes before participant arrives)

| Check | Pass condition | Done? |
|-------|----------------|-------|
| `npm run typecheck` exits 0 | Zero errors | ⬜ |
| `npm test` exits 0 | All unit tests green | ⬜ |
| `docker compose up -d` then health check returns 200 | Mission Control reachable | ⬜ |
| Security grep returns 0 real credential matches | No credentials in repo | ⬜ |
| README contains cold-start independence paragraph | Plain English, no code | ⬜ |
| README contains tamper-evidence description (4 elements) | All 4 elements per S6 AC4 | ⬜ |
| No supplementary setup document exists | README is sole instruction set | ⬜ |

Do not start the dry run until all boxes are checked.

---

## Scenario 1 — AC1: Running Mission Control in ≤3 README steps

**Steps:**
1. Participant runs `git clone <repo-url>` and `cd <repo>` (these are the prerequisite steps, not counted in the 3 steps).
2. Participant follows the README from the first numbered step.
3. Builder counts each distinct step until Mission Control is accessible in a browser.

**Expected result:** Mission Control is running and accessible after 3 or fewer README steps.

**Pass condition:** Step count ≤3. No manual dependency resolution step needed (beyond Docker, which is listed as a prerequisite).

---

## Scenario 2 — AC2: Task created, 3-agent loop run, task in Done, trace has 3 entries

**Steps:**
1. Participant follows the README instructions to create a task in Mission Control.
2. Participant runs all 3 agent scripts in sequence using the exact commands in the README.
3. Participant opens Mission Control and confirms the task is in the Done column.
4. Participant opens or prints the trace log file.
5. Builder confirms: trace log contains exactly 3 entries (one per agent).

**Expected result:** Task is in `Done`. Trace log has 3 entries. Participant performed all steps by following README only.

**Pass condition:** Task in Done, 3 trace entries. If participant needed assistance on any of these steps, record the request and the README fix.

---

## Scenario 3 — AC3: Governance questions answered from trace log + README only

**Steps:**
1. Builder asks the participant three questions, in order:
   - **Q1:** "Without me explaining anything — what policy governed the dev agent's decision?"
   - **Q2:** "How was compliance with that policy verified?"
   - **Q3:** "Who or what made the final assurance call, and was it independent?"
2. Participant reads the trace log and README to find answers. Builder does not coach.
3. Builder records verbatim answers and compares to ground truth.

**Expected result:** All 3 questions answered correctly without assistance.

**Pass condition:** All 3 correct. If any are wrong, identify the README section or trace field that caused confusion — that is a defect in this story.

---

## Scenario 4 — AC4: Elapsed time ≤30 minutes, ≤2 assistance requests

**Steps:**
1. Review the timer. Calculate elapsed time from `git clone` to completing Scenario 3.
2. Count total assistance requests made during the dry run.

**Expected result:** Elapsed ≤30 minutes. Requests ≤2.

**Pass condition:** Both thresholds met.

---

## Scenario 5 — AC5: Assistance requests produce README fixes

> This scenario applies only if 3 or more assistance requests were made in Scenario 4.

**Steps:**
1. For each assistance request recorded:
   - Identify the exact README step or missing step that caused the request.
   - Write the fix: add a step, clarify an instruction, or add expected output for that step.
   - Apply the fix to the README.
2. After all fixes are applied: `npm test` exits 0, `tsc --strict --noEmit` exits 0.
3. Arrange a repeat dry run with the same or a different participant.
4. Repeat Scenarios 1–4 until the dry run completes with ≤2 requests.

**Pass condition:** Dry run eventually completes with ≤2 requests. All README fixes committed.

---

## Final record: `verification/m4-dry-run-results.md`

When all scenarios pass, commit `verification/m4-dry-run-results.md` per the test plan template.

Run `git status verification/m4-dry-run-results.md` — confirm tracked and clean.

---

## Summary

| Scenario | AC | Pass condition | Status |
|----------|----|----------------|--------|
| Pre-checklist | — | All 7 builder checks complete before dry run | ⬜ |
| 1 | AC1 | ≤3 README steps to running Mission Control | ⬜ |
| 2 | AC2 | Task in Done; trace has 3 entries; README-only steps | ⬜ |
| 3 | AC3 | All 3 governance questions answered correctly | ⬜ |
| 4 | AC4 | Elapsed ≤30 min; ≤2 assistance requests | ⬜ |
| 5 | AC5 | Only if ≥3 requests: each has a README fix; dry run repeated | ⬜ |
| Final | NFR | `verification/m4-dry-run-results.md` committed | ⬜ |
