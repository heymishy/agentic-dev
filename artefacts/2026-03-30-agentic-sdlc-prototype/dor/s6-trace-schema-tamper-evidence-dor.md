# Definition of Ready: Trace schema is legible to a non-engineer and tamper-evident

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s6-trace-schema-tamper-evidence.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s6-trace-schema-tamper-evidence-test-plan.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s6-trace-schema-tamper-evidence-verification.md`
**Contract proposal:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s6-trace-schema-tamper-evidence-dor-contract.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## Hard Blocks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| H1 | User story is in As / Want / So format with a named persona | ✅ | As a compliance reviewer |
| H2 | At least 3 ACs in Given / When / Then format | ✅ | 4 ACs, all Given/When/Then |
| H3 | Every AC has at least one test in the test plan | ✅ | AC1–AC4 all mapped; AC1 is manual (legibility); AC2 unit; AC3 acknowledged with prior-coverage note (DL-002; S3 hash-comparison NFR test is canonical automated coverage) |
| H4 | Out-of-scope section is populated | ✅ | 3 explicit OOS items; S3 cross-reference for automated tamper detection |
| H5 | Benefit linkage references a named metric | ✅ | M5 — Trace legibility; M6 — Tamper-evidence protocol |
| H6 | Complexity is rated | ✅ | Rating: 2 |
| H7 | No unresolved HIGH findings | ✅ | No story-specific HIGH findings |
| H8 | Test plan has no uncovered ACs (or gaps acknowledged) | ✅ | AC3 gap acknowledged with full prior-coverage note — S3 hash-comparison NFR test is canonical; DL-002 records design decision |
| H9 | Architecture Constraints populated; no Category E HIGH | ✅ | src/types/trace.ts as the single schema authority is a named constraint |
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
| W3 | MEDIUM findings acknowledged | ✅ N/A | No MEDIUM findings apply to S6 | — |
| W4 | Verification script reviewed by domain expert | ⚠️ | Solo project — self-review. **AC1 legibility test requires a non-engineer participant.** Named participant and tentative date must be confirmed before S1 merges (DL-005). Participant: `[NAME]` / Date: `[TENTATIVE DATE]`. If no named participant when S6 begins: agent pauses and logs a PR comment — do not proceed. | Hamish — 2026-03-31 (DL-005) |
| W5 | No UNCERTAIN gap items | ✅ | AC3 gap resolved by prior-coverage note (DL-002, S3 cross-reference) | — |

---

## Standards injection

No `.github/standards/index.yml` found. Skipping.

---

## Coding Agent Instructions

```
## Coding Agent Instructions

Proceed: Yes
Story: Trace schema is legible to a non-engineer and tamper-evident
  — artefacts/2026-03-30-agentic-sdlc-prototype/stories/s6-trace-schema-tamper-evidence.md
Test plan: artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s6-trace-schema-tamper-evidence-test-plan.md
Contract: artefacts/2026-03-30-agentic-sdlc-prototype/dor/s6-trace-schema-tamper-evidence-dor-contract.md

Goal:
Execute Protocol 1 (legibility test) and Protocol 2 (tamper-evidence demo).
If Protocol 1 results in AC1 failing (Q1 fails: non-engineer cannot explain 3+ fields),
apply the minimal field-name fix to src/types/trace.ts (and all affected agent files),
then repeat until passing.

Constraints:
- src/types/trace.ts is the single schema authority. If field names are changed, ALL
  agent files that reference those fields must be updated in the same commit.
  After any schema change: run `tsc --strict --noEmit` — zero errors required before
  proceeding to re-test.
- AC1 requires a non-engineer participant — arrange this BEFORE beginning the story.
  If no participant is available, pause and log a PR comment. Do not fabricate results.
- AC3 scope: legibility + tamper-evidence demonstration (manual, observable). Do NOT
  re-implement automated hash comparison — that is canonical in S3 (DL-002). This story
  adds the README protocol paragraph only, not new automated tests for hash matching.
- AC4 README tamper-evidence paragraph must contain all 4 specified elements:
    1. Step-by-step tampering instruction
    2. Re-run assurance command
    3. Expected failure output example
    4. What the hash mismatch means in plain language
- Evidence files must be committed to verification/. Plain text or markdown.
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
