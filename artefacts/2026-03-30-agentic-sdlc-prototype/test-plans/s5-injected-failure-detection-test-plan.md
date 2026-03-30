## Test Plan: Assurance agent detects injected criterion failure (and passes clean run)

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s5-injected-failure-detection.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/verification-and-demonstrability.md`
**Test plan author:** Copilot
**Date:** 2026-03-30

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Injected false-pass in dev trace → assurance verdict is `escalate`; specific failing criterion identified | — | — | — | 1 | Manual-by-design | 🟡 |
| AC2 | Injected-failure result recorded in `verification/m3-test-results.md` with all required fields | — | — | — | 1 | Manual-by-design | 🟡 |
| AC3 | Clean trace produced by a real loop run → assurance verdict is `closed`; no findings | — | — | — | 1 | Manual-by-design | 🟡 |
| AC4 | Clean-run result recorded in `verification/m3-test-results.md` with all required fields | — | — | — | 1 | Manual-by-design | 🟡 |
| AC5 | `verification/m3-test-results.md` is self-interpreting — uninitiated reader can determine all three field values without asking questions | — | — | — | 1 | Manual-by-design | 🟡 |

---

## Coverage gaps

| Gap | AC | Gap type | Reason | Handling |
|-----|----|----------|--------|---------|
| All ACs are manual-by-design. The story explicitly constrains: "No test framework required — manual test protocol execution by the single builder is sufficient; the test results file is the artefact." | ALL | Manual-by-design | Automating the injection would require a test harness that also interprets the assurance record verdict — which is precisely what the assurance agent itself does. The value of S5 is a human-administered test whose result is an auditable artefact, not a passing CI job. | All five ACs verified via the manual protocol below. The test results file `verification/m3-test-results.md` is the evidence artefact. AC5 is additionally verified by having a second person (or a fresh perspective) attempt to read `m3-test-results.md` cold. |
| AC1 requires the assurance agent to identify *which* criterion produced the discrepancy, not just return `escalate`. If the agent returns a generic escalate without criterion identification, AC1 fails. | AC1 | Specificity risk | The assurance agent's `criteriaOutcomes` field must surface criterion-level detail. This depends on S4's implementation correctly populating `criteriaOutcomes`. | If criterion identification is missing, this is a defect in S4's `buildAssuranceRecord` — fix in S4 before running S5. |

---

## Test Data Strategy

**Source:** One synthetic injected-failure trace (manually constructed); one real trace produced by an actual full-loop run.

**PCI/sensitivity in scope:** No — all trace data is synthetic or produced from the prototype's own synthetic task.

**Availability:** Requires S4 to be complete and operational. The real clean run requires Docker Compose running.

**Owner:** The builder administers both test runs. Results are committed to `verification/m3-test-results.md`.

### Data requirements per protocol

| Protocol | Data needed | Source | Sensitive fields | Notes |
|----------|-------------|--------|-----------------|-------|
| Injected-failure run | A copy of a valid dev trace with one criterion's result changed from `fail` to `pass` (the definition of "injected false pass") | Copy of a real dev trace, manually edited | None | The specific criterion injected must be recorded in the test results file |
| Clean run | A trace produced by a complete unmodified agent loop run | Real system execution | None | Must be produced by the running agents — not manually crafted; this is the distinction the story requires |

---

## Manual Test Protocol

### Protocol 1 — Injected-failure test (AC1, AC2)

**Preconditions:**
- S4 is complete and the assurance agent accepts a trace log path as input.
- A valid trace log exists from a clean prior run (dev + review entries, all passing).

**Step 1 — Prepare the injected trace:**
1. Copy the trace log to `verification/injected-failure-trace.json` (do not modify the original).
2. In the copy, locate a criterion in the dev agent's `criteriaResults` array that has `result: "pass"`.
3. Change one criterion's `result` from `"pass"` to `"fail"` — this is the injection.
   - Record the criterion text exactly as it appears in the file.
4. Do not change any other fields in the trace.

**Step 2 — Run the assurance agent against the injected trace:**
1. Run: `npx ts-node src/agents/assurance-agent.ts --traceFile verification/injected-failure-trace.json`
2. Observe the assurance record output (written to the trace log or to stdout, per S4's implementation).

**Step 3 — Record the result in `verification/m3-test-results.md`:**
Required fields per the `/decisions` constraint:
```
| test-name           | injected-failure |
| injected-criterion  | <exact criterion text from Step 1.3> |
| assurance-verdict   | <actual verdict from assurance record> |
| expected-verdict    | escalate |
| result              | PASS if verdict is "escalate" / FAIL if not |
```

**Pass condition:** Assurance verdict is `escalate`. The `criteriaOutcomes` field in the assurance record names the injected criterion specifically. Result is recorded as `PASS`.

---

### Protocol 2 — Clean run (AC3, AC4)

**Preconditions:**
- Docker Compose running (Mission Control operational).
- S4 is complete.
- A new task exists in Mission Control Inbox.

**Step 1 — Run a complete clean loop:**
1. Run the dev agent against the new task.
2. Run the review agent.
3. Run the assurance agent.
4. Confirm the task reached Done in Mission Control.

**Step 2 — Read the resulting assurance record:**
1. Open the trace log and locate the assurance record entry.
2. Read the `verdict` and `criteriaOutcomes` fields.

**Step 3 — Record the result in `verification/m3-test-results.md`:**
```
| test-name           | clean-run |
| assurance-verdict   | <actual verdict> |
| expected-verdict    | closed |
| result              | PASS if verdict is "closed" / FAIL if not |
```

**Pass condition:** Assurance verdict is `closed`. `criteriaOutcomes` field shows no findings. Result is recorded as `PASS`.

---

### Protocol 3 — Legibility check (AC5)

**Preconditions:** `verification/m3-test-results.md` is complete with both test results.

**Step 1:** Ask a second person (or wait 24 hours and return cold) to read `verification/m3-test-results.md` without any briefing.

**Step 2:** Ask them: (a) which criterion was injected, (b) what did the assurance agent conclude for each test, (c) did the tests pass?

**Pass condition:** All three questions answered correctly from the file alone, without asking follow-up questions.

---

## NFR Tests

### `verification/m3-test-results.md` is committed to repository

- **Verifies:** NFR (Evidence)
- **Mechanism:** `git status verification/m3-test-results.md` shows the file is tracked (not in untracked or modified state after commit).
- **Pass condition:** File is committed.

### Injection procedure is reproducible from the results file alone

- **Verifies:** NFR (Reproducibility)
- **Mechanism:** Read only `verification/m3-test-results.md` and confirm it contains: (a) the criterion text that was injected, (b) the trace file that was used, (c) the command used to run the agent. If a reader cannot reproduce the injection from the file, the reproducibility NFR fails.
- **Pass condition:** Another person can re-run the injection protocol using only the information in the results file.

---

## Out of Scope for this test plan

- Testing the review agent's failure detection — this story tests the assurance agent only
- Automated test execution or CI integration — manual protocol is sufficient for the prototype
- Testing multiple simultaneous injected failures — one injected criterion per run is sufficient
- Testing injection of a hash mismatch (that is covered in S3 AC5 and S4 AC2)
