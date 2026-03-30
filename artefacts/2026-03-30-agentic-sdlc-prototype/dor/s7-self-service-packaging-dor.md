# Definition of Ready: Uninitiated engineer completes the pipeline from README alone

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s7-self-service-packaging.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s7-self-service-packaging-test-plan.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s7-self-service-packaging-verification.md`
**Contract proposal:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s7-self-service-packaging-dor-contract.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## Hard Blocks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| H1 | User story is in As / Want / So format with a named persona | ✅ | As a new team member (engineer unfamiliar with the prototype) |
| H2 | At least 3 ACs in Given / When / Then format | ✅ | 4 ACs, all Given/When/Then |
| H3 | Every AC has at least one test in the test plan | ✅ | AC1–AC4 all mapped; AC1–AC3 have structural unit tests; AC4 is the dry-run usability test |
| H4 | Out-of-scope section is populated | ✅ | 3 explicit OOS items |
| H5 | Benefit linkage references a named metric | ✅ | M4 — Self-service onboarding time |
| H6 | Complexity is rated | ✅ | Rating: 1 |
| H7 | No unresolved HIGH findings | ✅ | No story-specific HIGH findings |
| H8 | Test plan has no uncovered ACs (or gaps acknowledged) | ✅ | AC4 usability metric (≤ 2 assistance requests) is pass/fail per run; no gap |
| H9 | Architecture Constraints populated; no Category E HIGH | ✅ | Dependency on S4's README cold-start section and S6's README tamper-evidence section noted |
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
| W3 | MEDIUM findings acknowledged | ✅ N/A | None for S7 | — |
| W4 | Verification script reviewed by domain expert | ⚠️ | Solo project — self-review. **AC4 dry-run requires an uninitiated engineer participant.** Named participant and tentative date must be confirmed before S1 merges (DL-005). Participant: `[NAME]` / Date: `[TENTATIVE DATE]`. If no named participant when S7 begins: agent pauses and logs a PR comment — do not proceed. | Hamish — 2026-03-31 (DL-005) |
| W5 | No UNCERTAIN gap items | ✅ | All gaps acknowledged | — |

---

## Standards injection

No `.github/standards/index.yml` found. Skipping.

---

## Coding Agent Instructions

```
## Coding Agent Instructions

Proceed: Yes
Story: Uninitiated engineer completes the pipeline from README alone
  — artefacts/2026-03-30-agentic-sdlc-prototype/stories/s7-self-service-packaging.md
Test plan: artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s7-self-service-packaging-test-plan.md
Contract: artefacts/2026-03-30-agentic-sdlc-prototype/dor/s7-self-service-packaging-dor-contract.md

Goal:
Write README.md as a complete, sequential self-service instruction set.
Execute the dry-run usability test with an uninitiated participant.
Fix specific README defects until AC4 passes (≤ 2 assistance requests).

Constraints:
- README.md is the primary deliverable. It must be a complete sequential instruction set
  from fresh clone to assurance-agent pass — no assumed knowledge.
- Each step MUST include: the exact command to run + a "You should see:" success
  criterion (exact output or description of what constitutes success).
- Incorporate the cold-start section from S4 (verbatim paragraph from README addition
  in S4 — do not paraphrase; keep ADR-001 Option A process-boundary explanation intact).
- Incorporate the tamper-evidence section from S6 (all 4 required elements per AC4 of S6
  — do not reduce).
- AC4 usability test: this requires an uninitiated participant. Arrange this BEFORE
  starting the story. If no participant is available, pause and log a PR comment.
  Do not fabricate results.
- AC4 pass condition: participant completes the pipeline with ≤ 2 assistance requests.
  If 3 or more: identify the specific defects (which steps caused each assistance request),
  fix only those steps, then re-run the dry-run from the beginning. Repeat until ≤ 2.
- Unit tests for AC1–AC3 verify structural properties of README.md (step count, command
  format, success criteria presence). Run these first; they must pass before dry-run.
- Evidence file: commit verification/s7-dry-run-results.md with participant session notes,
  assistance request count, defects found, and final verdict.
- Open a draft PR when complete — do not mark ready for review.
- Ambiguity not covered by ACs: add a PR comment.

Oversight level: Medium
(tech_lead = Hamish; self-review)
```

---

## Sign-off

**Oversight level:** Medium
**Sign-off required:** No
**DoR status:** PROCEED
