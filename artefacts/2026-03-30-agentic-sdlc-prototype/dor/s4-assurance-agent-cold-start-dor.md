# Definition of Ready: Assurance agent validates full trace chain cold

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s4-assurance-agent-cold-start.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s4-assurance-agent-cold-start-test-plan.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s4-assurance-agent-cold-start-verification.md`
**Contract proposal:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s4-assurance-agent-cold-start-dor-contract.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## Hard Blocks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| H1 | User story is in As / Want / So format with a named persona | ✅ | As a governance auditor |
| H2 | At least 3 ACs in Given / When / Then format | ✅ | 5 ACs, all Given/When/Then |
| H3 | Every AC has at least one test in the test plan | ✅ | AC1–AC5 mapped; AC5 structural gap closed by ADR-001 (DI Option A structural test + cold-start independence integration test) |
| H4 | Out-of-scope section is populated | ✅ | S4/S5 boundary explicit (DL-003) |
| H5 | Benefit linkage references a named metric | ✅ | M2 — Per-decision traceability to versioned skill (assurance leg) |
| H6 | Complexity is rated | ✅ | Rating: 2 |
| H7 | No unresolved HIGH findings | ✅ | No story-specific HIGH findings |
| H8 | Test plan has no uncovered ACs (or gaps acknowledged) | ✅ | AC5 gap acknowledged — mitigated by ADR-001 Option A (DI boundary structural test + cold-start independence integration test, test #15). ADR-001 closed 2026-03-31. |
| H9 | Architecture Constraints populated; no Category E HIGH | ✅ | Cold-start isolation is a named constraint. ADR-001 cross-referenced. |
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
| W3 | MEDIUM findings acknowledged | ✅ N/A | No MEDIUM findings apply to S4 directly | — |
| W4 | Verification script reviewed by domain expert | ⚠️ | Solo project — self-review. | Hamish — 2026-03-31 |
| W5 | No UNCERTAIN gap items | ✅ | AC5 gap closed by ADR-001 | — |

---

## Standards injection

No `.github/standards/index.yml` found. Skipping.

---

## Coding Agent Instructions

```
## Coding Agent Instructions

Proceed: Yes
Story: Assurance agent validates full trace chain cold
  — artefacts/2026-03-30-agentic-sdlc-prototype/stories/s4-assurance-agent-cold-start.md
Test plan: artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s4-assurance-agent-cold-start-test-plan.md
Contract: artefacts/2026-03-30-agentic-sdlc-prototype/dor/s4-assurance-agent-cold-start-dor-contract.md

Goal:
Make every test in the test plan pass (including new test #15 — cold-start
independence integration test). Do not add scope beyond tests and ACs.

Constraints:
- Language: TypeScript strict mode. `tsc --strict --noEmit` must pass.
- Test framework: Jest.
- **DL-008 (HARD RULE):** `assurance-agent.ts` must guard the `main()` call with
  `if (require.main === module)`. Without this guard, importing `runAssuranceAgent` in the
  integration test triggers `main()` at parse time — before `beforeEach` fixtures run —
  and crashes the Jest worker with ENOENT on `queue/inbox`. Add the guard in the initial
  file creation step (Task 1), not after integration tests are written. Canonical
  reference: `src/agents/dev-agent.ts` (commit `924fc5c`). See decisions.md DL-008.
- ADR-001 (HARD RULE): assurance-agent.ts and all its direct imports must contain zero
  import statements referencing dev-agent or review-agent module paths. The no-cross-imports
  NFR test verifies this structurally.
- Cold-start independence (AC1 + test #15): the cold-start integration test verifies that
  assurance-agent run on trace-B produces the same result whether or not it was previously
  invoked with trace-A. Implement this by reading trace always from file (not module-level
  cache). The test simulates this by calling assurance-agent on two different fixture files
  in a single Jest run. Both must pass independently.
- AssuranceRecord interface (src/types/trace.ts): ALL fields non-optional. criteriaOutcomes
  must be populated at criterion level (this is a hard dependency for S5 M3 — do not collapse
  to summary). See DL-003.
- S5 injected-failure test protocol is OUT OF SCOPE for this story. Do not implement
  mismatch detection beyond what AC4 unit tests specify. Per DL-003: the full M3 protocol
  is owned by S5.
- README cold-start section: required deliverable. Must include the ADR-001 Option A
  process-boundary paragraph — one paragraph describing why each agent is invoked as a
  separate process and what this guarantees vs. DI (Option C, deferred).
- Architecture standards: read `.github/architecture-guardrails.md` before implementing.
- Open a draft PR when tests pass — do not mark ready for review.

Oversight level: Medium
(tech_lead = Hamish; self-review)
```

---

## Sign-off

**Oversight level:** Medium
**Sign-off required:** No
**DoR status:** PROCEED
