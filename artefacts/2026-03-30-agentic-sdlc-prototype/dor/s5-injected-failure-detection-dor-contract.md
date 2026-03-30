# Contract Proposal — Assurance agent detects injected criterion failure (and passes clean run)

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s5-injected-failure-detection.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## What will be built

- `verification/m3-test-results.md` — manually executed and committed results file; records
  both test runs (injected-failure + clean-run) with the fields specified in the test plan:
  test name, injected criterion name, assurance verdict, expected verdict, result (PASS/FAIL)
- The manual test protocol execution itself (no source code artefact)

## What will NOT be built

- No source code changes — this story is entirely a manual test execution protocol
- No automated test runner or injection tooling
- No changes to `assurance-agent.ts` — if the assurance agent cannot detect the injection,
  that is an S4 implementation defect to fix before S5 can pass (per DL-003)
- No testing of multiple simultaneous failures — one injected criterion per run

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 | Manual protocol: inject a criterion `pass` in dev trace that implementation file does not satisfy; run assurance agent; observe `escalate` verdict with identifying criterion name | Manual |
| AC2 | Manual: record in `verification/m3-test-results.md` with all required fields; file committed | Manual |
| AC3 | Manual protocol: run assurance agent against a genuine full-loop clean run (no injection); observe `closed` verdict with empty findings | Manual |
| AC4 | Manual: record clean-run results in the same `m3-test-results.md` file | Manual |
| AC5 | Manual: read back the completed `m3-test-results.md` without assistance; confirm all three questions answerable from it | Manual |

## Assumptions

- S4 is complete and the assurance agent is fully operational before this story begins
- The assurance agent's `buildAssuranceRecord()` populates `criteriaOutcomes` at individual
  criterion level — if it only emits a generic `escalate` without identifying the failing
  criterion, AC1 fails as an S4 implementation defect (per DL-003)
- A genuine clean full-loop run (S1–S4) is available to produce the clean-run trace
  (not a manually crafted synthetic happy-path trace — per story Architecture Constraints)

## Estimated touch points

**Files created:**
- `verification/m3-test-results.md`

**Files modified:** None

**Services:** Mission Control (Docker) + all three agents running end-to-end

---

## Contract review result

✅ **Contract review passed** — all 5 ACs verified via the manual protocol.  
This story's deliverable is the committed evidence file, not code. The coding
agent instructions block reflects this.
