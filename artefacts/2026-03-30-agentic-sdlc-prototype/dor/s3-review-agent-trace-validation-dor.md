# Definition of Ready: Review agent validates dev trace and emits its own trace

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s3-review-agent-trace-validation.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s3-review-agent-trace-validation-test-plan.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s3-review-agent-trace-validation-verification.md`
**Contract proposal:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s3-review-agent-trace-validation-dor-contract.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## Hard Blocks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| H1 | User story is in As / Want / So format with a named persona | ✅ | As an internal auditor |
| H2 | At least 3 ACs in Given / When / Then format | ✅ | 5 ACs, all Given/When/Then |
| H3 | Every AC has at least one test in the test plan | ✅ | AC1–AC5 fully mapped; structural NFR test covers ADR-001 gap |
| H4 | Out-of-scope section is populated | ✅ | 3 explicit OOS items |
| H5 | Benefit linkage references a named metric | ✅ | M2 — Per-decision traceability (review leg) |
| H6 | Complexity is rated | ✅ | Rating: 1 |
| H7 | No unresolved HIGH findings | ✅ | No story-specific HIGH findings |
| H8 | Test plan has no uncovered ACs (or gaps acknowledged) | ✅ | AC1 "not from session" partial gap acknowledged; 3 structural mitigations in test plan; DL-001 records risk acceptance |
| H9 | Architecture Constraints populated; no Category E HIGH | ✅ | Filesystem-only constraint prominent; ADR-001 cross-references constraint |
| H-E2E | CSS-layout-dependent ACs | ✅ N/A | No UI elements |
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
| W3 | MEDIUM findings acknowledged | ✅ N/A | No MEDIUM findings apply to S3 | — |
| W4 | Verification script reviewed by domain expert | ⚠️ | Solo project — self-review. | Hamish — 2026-03-31 |
| W5 | No UNCERTAIN gap items | ✅ | All gaps acknowledged (DL-001 + test plan mitigations) | — |

---

## Standards injection

No `.github/standards/index.yml` found. Skipping.

---

## Coding Agent Instructions

```
## Coding Agent Instructions

Proceed: Yes
Story: Review agent validates dev trace and emits its own trace
  — artefacts/2026-03-30-agentic-sdlc-prototype/stories/s3-review-agent-trace-validation.md
Test plan: artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s3-review-agent-trace-validation-test-plan.md
Contract: artefacts/2026-03-30-agentic-sdlc-prototype/dor/s3-review-agent-trace-validation-dor-contract.md

Goal:
Make every test in the test plan pass. Do not add scope, behaviour, or structure
beyond what the tests and ACs specify.

Constraints:
- Language: TypeScript strict mode. `tsc --strict --noEmit` must pass at all times.
- Test framework: Jest.
- **DL-008 (HARD RULE):** `review-agent.ts` must guard the `main()` call with
  `if (require.main === module)`. Without this guard, importing `runReviewAgent` in the
  integration test triggers `main()` at parse time — before `beforeEach` fixtures run —
  and crashes the Jest worker with ENOENT on `queue/inbox`. Add the guard in the initial
  file creation step (Task 1), not after integration tests are written. Canonical
  reference: `src/agents/dev-agent.ts` (commit `924fc5c`). See decisions.md DL-008.
- AC1 architectural constraint (HARD RULE): review-agent.ts must read the dev trace from
  a file path argument only. It must NOT access any module-level cache, global variable,
  or in-memory state holding a prior trace. The stale-file-replacement integration test
  verifies this behaviourally.
- ADR-001 (HARD RULE): review-agent.ts and all its direct imports must contain zero
  import statements referencing dev-agent or assurance-agent module paths. The
  no-cross-imports NFR test in the test plan verifies this structurally.
- This story extends review-agent.ts only. Do NOT modify dev-agent.ts beyond what is
  strictly required to share the TraceEntry interface from src/types/trace.ts.
- Trace write is append-only — no existing entries modified.
- src/lib/trace-reader.ts exports loadTraceFromFile() — throws on missing file (not
  null), throws naming the missing field on schema violation (not generic error).
- Architecture standards: read `.github/architecture-guardrails.md` before implementing.
- Open a draft PR when tests pass — do not mark ready for review.
- Ambiguity not covered by ACs: add a PR comment.

Oversight level: Medium
(tech_lead = Hamish; self-review)
```

---

## Sign-off

**Oversight level:** Medium
**Sign-off required:** No
**DoR status:** PROCEED
