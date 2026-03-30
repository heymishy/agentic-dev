# Definition of Ready: Dev agent loads skill, self-checks against falsifiable criteria, emits trace

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s2-dev-agent-skill-trace.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s2-dev-agent-skill-trace-test-plan.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s2-dev-agent-skill-trace-verification.md`
**Contract proposal:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s2-dev-agent-skill-trace-dor-contract.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## Hard Blocks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| H1 | User story is in As / Want / So format with a named persona | ✅ | As an engineering lead |
| H2 | At least 3 ACs in Given / When / Then format | ✅ | 6 ACs, all Given/When/Then |
| H3 | Every AC has at least one test in the test plan | ✅ | AC1–AC6 all mapped; AC6 added to close 1-H1 (authority registry) |
| H4 | Out-of-scope section is populated — not blank or N/A | ✅ | 4 explicit OOS items |
| H5 | Benefit linkage field references a named metric | ✅ | M2 — Per-decision traceability to versioned skill |
| H6 | Complexity is rated | ✅ | Rating: 2 |
| H7 | No unresolved HIGH findings from the review report | ✅ | 1-H1 resolved by adding AC6 + Architecture Constraints in this story |
| H8 | Test plan has no uncovered ACs (or gaps explicitly acknowledged) | ✅ | 1-M1 resolved at test level (observable outcome tested; see DL-004) |
| H9 | Architecture Constraints field populated; no Category E HIGH findings | ✅ | Authority registry constraint defined; no Category E HIGH |
| H-E2E | CSS-layout-dependent ACs | ✅ N/A | No UI elements |
| H-NFR | NFR profile exists | ✅ | `nfr-profile.md` — covers this story explicitly |
| H-NFR2 | Compliance NFRs with regulatory clauses | ✅ N/A | No compliance frameworks |
| H-NFR3 | Data classification not blank | ✅ | Public |

**Result: 13/13 hard blocks passed. ✅**

---

## Warnings

| # | Check | Status | Risk | Acknowledged by |
|---|-------|--------|------|-----------------|
| W1 | NFRs identified | ✅ | — | — |
| W2 | Scope stability declared | ✅ | Stable | — |
| W3 | MEDIUM findings acknowledged | ⚠️ | **1-M1:** S2 AC1 says "stores in memory" (internal state). Risk: implementing agent may cache hash differently. Resolved at test level — test plan verifies observable outcome (hash in trace matches file bytes). DL-004 records this as RISK-ACCEPT. | Hamish — 2026-03-31 (DL-004) |
| W4 | Verification script reviewed by domain expert | ⚠️ | Solo project — Hamish self-review only. | Hamish — 2026-03-31 |
| W5 | No UNCERTAIN gap items | ✅ | All gaps acknowledged | — |

---

## Standards injection

No `.github/standards/index.yml` found. Skipping.

---

## Coding Agent Instructions

```
## Coding Agent Instructions

Proceed: Yes
Story: Dev agent loads skill, self-checks against falsifiable criteria, emits trace
  — artefacts/2026-03-30-agentic-sdlc-prototype/stories/s2-dev-agent-skill-trace.md
Test plan: artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s2-dev-agent-skill-trace-test-plan.md
Contract: artefacts/2026-03-30-agentic-sdlc-prototype/dor/s2-dev-agent-skill-trace-dor-contract.md

Goal:
Make every test in the test plan pass. Do not add scope, behaviour, or structure
beyond what the tests and ACs specify.

Constraints:
- Language: TypeScript strict mode. `tsc --strict --noEmit` must pass at all times.
- Test framework: Jest.
- AC1 is implemented as: emitTraceEntry() result contains a promptHash that matches
  computeSkillHash() on the same file independently — NOT as any assertion about
  in-memory state. See DL-004.
- skills-registry.json must be committed at repository root. All agents resolve skill
  paths from this file, not from hardcoded paths. This is an explicit deliverable.
- SHA-256 hash must use raw Buffer bytes (not string encoding). Algorithm identifier
  `"sha256"` is mandatory in every TraceEntry. Lowercase hex output only.
- TraceEntry interface in src/types/trace.ts — all fields non-optional. TypeScript
  compiler is the completeness enforcement mechanism.
- Trace write is append-only — no existing entries may be modified or truncated.
- Do NOT add review agent or assurance agent logic — this story extends dev-agent.ts only.
- Architecture standards: read `.github/architecture-guardrails.md` before implementing.
  ADR-001: do not introduce shared module-level state between agent files.
- Open a draft PR when tests pass — do not mark ready for review.
- Ambiguity not covered by ACs: add a PR comment, do not proceed.

Oversight level: Medium
(tech_lead = Hamish; self-review)
```

---

## Sign-off

**Oversight level:** Medium
**Sign-off required:** No
**DoR status:** PROCEED
