# Definition of Ready: Injected failure turns assertion red; clean run turns it green

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s5-injected-failure-detection.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s5-injected-failure-detection-test-plan.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s5-injected-failure-detection-verification.md`
**Contract proposal:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s5-injected-failure-detection-dor-contract.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## Hard Blocks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| H1 | User story is in As / Want / So format with a named persona | ✅ | As a governance auditor |
| H2 | At least 3 ACs in Given / When / Then format | ✅ | 4 ACs, all Given/When/Then |
| H3 | Every AC has at least one test in the test plan | ✅ | AC1–AC4 all mapped; manual protocols only (no automated tests) |
| H4 | Out-of-scope section is populated | ✅ | 4 explicit OOS items; S4/S5 boundary (DL-003) |
| H5 | Benefit linkage references a named metric | ✅ | M3 — Assurance agent failure detection |
| H6 | Complexity is rated | ✅ | Rating: 1 |
| H7 | No unresolved HIGH findings | ✅ | No story-specific HIGH findings |
| H8 | Test plan has no uncovered ACs (or gaps acknowledged) | ✅ | All manual; no automated tests. Acknowledged: S5 is execution-only, no source code changes. |
| H9 | Architecture Constraints populated; no Category E HIGH | ✅ | Depends on S4 criteriaOutcomes at criterion level (hard dependency noted) |
| H-E2E | CSS-layout-dependent ACs | ✅ N/A | No UI |
| H-NFR | NFR profile exists | ✅ | `nfr-profile.md` |
| H-NFR2 | Compliance NFRs with regulatory clauses | ✅ N/A | None |
| H-NFR3 | Data classification not blank | ✅ | Public |

**Result: 13/13 hard blocks passed. ✅**

---

## Warnings

| # | Check | Status | Risk | Acknowledged by |
|---|-------|--------|------|-----------------|
| W1 | NFRs identified | ✅ | — | — |
| W2 | Scope stability declared | ✅ | Stable | — |
| W3 | MEDIUM findings acknowledged | ✅ N/A | None for S5 | — |
| W4 | Verification script reviewed by domain expert | ⚠️ | Solo project — self-review. | Hamish — 2026-03-31 |
| W5 | No UNCERTAIN gap items | ✅ | All gaps acknowledged; hard dependency on S4 explicit | — |

---

## Standards injection

No `.github/standards/index.yml` found. Skipping.

---

## Coding Agent Instructions

```
## Coding Agent Instructions

Proceed: Yes
Story: Injected failure turns assertion red; clean run turns it green
  — artefacts/2026-03-30-agentic-sdlc-prototype/stories/s5-injected-failure-detection.md
Test plan: artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s5-injected-failure-detection-test-plan.md
Contract: artefacts/2026-03-30-agentic-sdlc-prototype/dor/s5-injected-failure-detection-dor-contract.md

Goal:
This story is a MANUAL TEST EXECUTION — there is no production source code to write.
Execute Protocol 1 (injection) and Protocol 2 (clean run) from the test plan.
Commit verification/m3-test-results.md as the sole file deliverable.

Constraints:
- Do NOT modify any source code in src/. If modification is needed to make a test pass,
  raise it as a defect against S4 and do not proceed.
- Hard dependency on S4: if assurance-agent.ts does not populate criteriaOutcomes at
  criterion level (per DL-003), raise an S4 implementation defect before beginning
  test execution. Proceeding without criterion-level criteriaOutcomes is a protocol failure.
- S5 is execution-only. The only permitted file change is creating
  verification/m3-test-results.md with Protocol 1 and Protocol 2 results.
- Evidence format: verification/m3-test-results.md must contain:
    Protocol 1 — Injected failure: command run, stdout/stderr excerpt, verdict (PASS/FAIL)
    Protocol 2 — Clean run: command run, stdout/stderr excerpt, verdict (PASS/FAIL)
  Both protocols must produce PASS evidence for ACs to be satisfied.
- AC definitions:
    AC1: Protocol 1 assurance-agent exits non-zero on modified skill hash
    AC2: Protocol 1 assurance-agent stdout flags FAIL/mismatch at criterion level
    AC3: Protocol 2 clean run exits zero
    AC4: Protocol 2 assurance-agent stdout shows all criteria PASS
- Do not mark draft PR ready for review.

Oversight level: Medium
(tech_lead = Hamish; self-review)
```

---

## Sign-off

**Oversight level:** Medium
**Sign-off required:** No
**DoR status:** PROCEED
