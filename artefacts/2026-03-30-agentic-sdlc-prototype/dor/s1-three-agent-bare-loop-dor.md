# Definition of Ready: Three-agent bare loop closes end-to-end

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s1-three-agent-bare-loop-test-plan.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s1-three-agent-bare-loop-verification.md`
**Contract proposal:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s1-three-agent-bare-loop-dor-contract.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## Hard Blocks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| H1 | User story is in As / Want / So format with a named persona | ✅ | As an engineer building the prototype |
| H2 | At least 3 ACs in Given / When / Then format | ✅ | 5 ACs, all Given/When/Then |
| H3 | Every AC has at least one test in the test plan | ✅ | AC1–AC5 all mapped to integration tests |
| H4 | Out-of-scope section is populated — not blank or N/A | ✅ | 4 explicit OOS items |
| H5 | Benefit linkage field references a named metric | ✅ | M1 — Autonomous loop completion |
| H6 | Complexity is rated | ✅ | Rating: 2 |
| H7 | No unresolved HIGH findings from the review report | ✅ | 1-H1 resolved in review session; no story-specific HIGH |
| H8 | Test plan has no uncovered ACs (or gaps explicitly acknowledged) | ✅ | Gap acknowledged: Docker required for integration tests (@integration tag) |
| H9 | Architecture Constraints field populated; no Category E HIGH findings | ✅ | 5 constraints listed; review Category E: PASS |
| H-E2E | CSS-layout-dependent ACs requiring E2E tooling | ✅ N/A | No CSS or UI elements |
| H-NFR | NFR profile exists | ✅ | `artefacts/2026-03-30-agentic-sdlc-prototype/nfr-profile.md` |
| H-NFR2 | Compliance NFRs with regulatory clauses have human sign-off | ✅ N/A | No compliance frameworks (nfr-profile.md) |
| H-NFR3 | Data classification field in NFR profile is not blank | ✅ | Public — no PII, no sensitive data |

**Result: 13/13 hard blocks passed. ✅**

---

## Warnings

| # | Check | Status | Risk | Acknowledged by |
|---|-------|--------|------|-----------------|
| W1 | NFRs identified | ✅ | — | — |
| W2 | Scope stability declared | ⚠️ | **Unstable** — Mission Control is alpha software; queue semantics under programmatic invocation are an untested assumption. If this story fails, the prototype approach requires reassessment. | Hamish — 2026-03-31 (acknowledged: this story exists precisely to test the assumption; failure is a signal, not a surprise) |
| W3 | MEDIUM findings acknowledged | ✅ N/A | No MEDIUM findings apply to S1 | — |
| W4 | Verification script reviewed by domain expert | ⚠️ | Solo project — Hamish is sole builder, tech lead, and QA. Self-review only. | Hamish — 2026-03-31 |
| W5 | No UNCERTAIN gap items left unaddressed | ✅ | All gaps are acknowledged with explicit patterns | — |

---

## Standards injection

No `.github/standards/index.yml` found. Skipping — no domain tags to resolve.

---

## Coding Agent Instructions

```
## Coding Agent Instructions

Proceed: Yes
Story: Three-agent bare loop closes end-to-end
  — artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md
Test plan: artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s1-three-agent-bare-loop-test-plan.md
Contract: artefacts/2026-03-30-agentic-sdlc-prototype/dor/s1-three-agent-bare-loop-dor-contract.md

Goal:
Make every test in the test plan pass. Do not add scope, behaviour, or structure
beyond what the tests and ACs specify.

Constraints:
- Language: TypeScript strict mode — mandatory. `tsc --strict --noEmit` must pass at all times.
- Test framework: Jest.
- No skill loading, prompt hashing, or trace emission in this story — agent scripts are
  structural stubs only; S2–S4 will extend them. Do not anticipate S2 logic.
- No polling mechanism under any circumstances — agents are invoked manually via CLI.
- No error recovery or retry logic — out of scope for the prototype.
- docker-compose.yml must pin Mission Control to a specific release tag confirmed during
  discovery — do not use `latest`.
- Integration tests must be tagged `@integration` and skip cleanly when Docker is not running.
- Architecture standards: read `.github/architecture-guardrails.md` before implementing.
  Do not introduce patterns listed as anti-patterns or violate Active ADRs. ADR-001 governs
  agent isolation — no shared module-level state introduced between agent files.
- Open a draft PR when tests pass — do not mark ready for review.
- If you encounter an ambiguity about Mission Control's API (column names, task creation
  mechanism, transition method): add a PR comment describing it and do not mark ready for review.
  Specifically: confirm actual column names from the live MC API before hardcoding.

Oversight level: Medium
(tech_lead = Hamish; share DoR artefact before beginning implementation)
```

---

## Sign-off

**Oversight level:** Medium
**Sign-off required:** No (Medium = tech lead awareness, no formal sign-off)
**Tech lead:** Hamish (roles.tech_lead = me — self-review)
**DoR status:** PROCEED
