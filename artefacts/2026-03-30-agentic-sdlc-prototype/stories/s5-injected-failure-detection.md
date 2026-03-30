# Story: Assurance agent detects injected criterion failure (and passes clean run)

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/verification-and-demonstrability.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As an **internal auditor**,
I want to run two formal verification tests against the assurance agent — one where a
criterion failure has been deliberately injected into the dev agent's trace, and one
where all criteria genuinely pass — and confirm the assurance agent catches the failure
without flagging the clean run as a failure,
So that I have evidence the assurance agent is doing genuine independent verification
rather than confirmation — and that it is calibrated correctly in both directions —
directly satisfying M3 (assurance detects injected criterion failure) and making the
governance claim auditable, not just asserted.

## Benefit Linkage

**Metric moved:** M3 — Assurance agent detects injected criterion failure
**How:** M3 requires two formal test results: (1) injected failure detected, (2) clean
run produces no false positive. This story runs both tests and records the results
explicitly. Without both results passing, M3 is unmet regardless of how well the
assurance agent performs on real runs.

## Architecture Constraints

- TypeScript strict mode (discovery constraint)
- The injected-failure test must modify only the trace log file (not the skill files or
  the implementation output) — the injection simulates a dev agent that emitted a false
  pass in its trace, which is the realistic failure mode the governance loop must catch
- The clean-run test must use a genuinely passing trace produced by a real agent loop
  run (not a manually crafted passing trace) — the test must prove the agent works on
  real output, not on a synthetic happy path
- Test results must be recorded in a dedicated test-results file
  (`verification/m3-test-results.md`) that captures: test name, trace state before
  test, assurance verdict, expected verdict, pass/fail — this file is evidence for M3
  and must be committed
- No test framework required — manual test protocol execution by the single builder
  is sufficient; the test results file is the artefact
- Skills read from local filesystem only; no external connections (discovery constraints)

## Dependencies

- **Upstream:** S4 must be complete — this story exercises the assurance path S4
  built; there is nothing to test without it
- **Downstream:** S6 (trace schema) and S7 (packaging) can proceed in parallel once
  S4 is done, but M3 must be closed before any external demonstration

## Acceptance Criteria

**AC1:** Given the assurance agent from S4 is fully operational, When a trace is
  prepared where the dev agent's criteria results array contains a criterion marked
  `pass` that the corresponding implementation file does not satisfy (injected false
  pass), Then the assurance agent's verdict is `escalate` and its assurance record
  explicitly identifies which criterion produced the discrepancy.

**AC2:** Given the injected-failure test from AC1 has run, When the result is recorded
  in `verification/m3-test-results.md`, Then the record shows: test name
  (`injected-failure`), injected criterion name, assurance verdict (`escalate`),
  expected verdict (`escalate`), result (`PASS`) — confirming the test passed.

**AC3:** Given a clean trace produced by a full agent loop run where all criteria
  genuinely pass (no injection), When the assurance agent processes that trace, Then
  its verdict is `closed` and its assurance record contains no findings — the agent
  does not flag a genuinely compliant trace as failing.

**AC4:** Given the clean-run test from AC3 has run, When the result is recorded in
  `verification/m3-test-results.md`, Then the record shows: test name (`clean-run`),
  assurance verdict (`closed`), expected verdict (`closed`), result (`PASS`).

**AC5:** Given both test results exist in `verification/m3-test-results.md`, When the
  file is read by someone who was not present for either test, Then they can determine:
  which criterion was injected, what the assurance agent concluded, whether the result
  matched the expectation — without asking anyone who ran the tests.

## Out of Scope

- Testing the review agent's failure detection — this story tests the assurance agent
  only; review agent behaviour is validated end-to-end in the full loop run
- Automated test execution — manual protocol is sufficient for the prototype; a test
  runner is a next-phase hardening item
- Testing multiple injected failures simultaneously — one injected criterion failure
  per test run is sufficient to validate the detection mechanism

## NFRs

- **Evidence:** `verification/m3-test-results.md` must be committed to the repository
  — it is an auditable artefact, not a local file; the governance claim depends on it
- **Reproducibility:** The injection procedure must be documented in the test results
  file in enough detail that the test can be re-run by someone who wasn't present

## Complexity Rating

**Rating:** 1
**Scope stability:** Stable — the test protocol is fully specified by M3. The only
uncertainty is whether the assurance agent's failure detection is sufficiently precise
to identify which criterion failed (not just that something failed). AC1 requires this
specificity — if the agent only returns a generic `escalate` without identifying the
failing criterion, the story fails.
