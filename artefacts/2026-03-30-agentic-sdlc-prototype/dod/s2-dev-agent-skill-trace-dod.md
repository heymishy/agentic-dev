# Definition of Done: Dev agent loads skill, self-checks against falsifiable criteria, emits trace

**PR:** https://github.com/heymishy/agentic-dev/pull/2 | **Merged:** 2026-03-31
**Story:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s2-dev-agent-skill-trace.md`
**Test plan:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s2-dev-agent-skill-trace-test-plan.md`
**DoR artefact:** `artefacts/2026-03-30-agentic-sdlc-prototype/dor/s2-dev-agent-skill-trace-dor.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## AC Coverage

| AC | Satisfied? | Evidence | Deviation |
|----|-----------|----------|-----------|
| AC1 | ✅ | `loadSkillFromRegistry` resolves correct path (unit); `computeSkillHash` produces correct SHA-256 (unit); integration test confirms trace written with hash (s2-dev-agent-trace.integration.test.ts) | None |
| AC2 | ✅ | `evaluateCriteria` all-pass test + one-fail test (unit); both return per-criterion list with criterion text, result, and reason on fail | None |
| AC3 | ✅ | `buildTraceEntry` unit test asserts all 8 fields present; integration test `AC1/AC3/AC4` confirms full trace on disk; `hashAlgorithm: "sha256"` asserted explicitly; TSC strict enforces non-optional fields via `TraceEntry` interface | None |
| AC4 | ✅ | Independent SHA-256 of `skills/feature-dev/SKILL.md` computed via `node -e "createHash('sha256')..."` = `2aa389817ba2dd0f376f7a14344ec5e1d21d418a1696b4e099f3a53dd21eb19a`; stored in `tests/fixtures/feature-dev.skill.sha256` = same value; integration test asserts match live on every run. `.gitattributes` enforces `eol=lf` for platform stability. | None |
| AC5 | ✅ | Integration test `AC5: failing criterion — task stays in inbox, trace written with decisionOutcome: reject` passes; task file confirmed in inbox after reject, not moved to review | None |
| AC6 | ✅ | Integration test `AC6: skill path resolved from registry — alternate registry produces different hash` passes; `Select-String` on `src/agents/*.ts src/lib/*.ts` returns zero hardcoded path matches; `skills-registry.json` committed at repo root | None |

---

## Scope Deviations

None. Commits `d5e2247` through `924fc5c` all map directly to S2 task plan steps. No OOS items from the story implemented.

---

## Test Plan Coverage

**26 tests, all passing in CI** (15 unit + 11 integration). CI run on `feature/s2-dev-agent-skill-trace` at `0c30250`.

| Test file | Tests | ACs covered |
|-----------|-------|-------------|
| `tests/unit/s2-dev-agent.test.ts` | 8 | AC1, AC2, AC3, AC4, AC5, AC6 |
| `tests/unit/queue-client.test.ts` | 7 | S1 queue infrastructure |
| `tests/integration/s2-dev-agent-trace.integration.test.ts` | 6 | AC1/AC3/AC4, AC5, AC6, NFR (tsc, perf, no-credentials) |
| `tests/integration/s1-bare-loop.integration.test.ts` | 5 | S1 regression |

No test gaps. All planned tests implemented. No CSS-layout-dependent gaps. No layout gap audit required.

---

## NFR Check

| NFR | Evidence | Status |
|-----|----------|--------|
| Security — no credentials or org data in scripts or trace files | `NFR: trace output contains no credential patterns` integration test passes; `Select-String` scan for hardcoded paths returned zero results | ✅ |
| Performance — hashing + criteria evaluation under 2 seconds | `NFR: computeSkillHash + evaluateCriteria complete within 2 seconds` integration test passes; measured 1ms | ✅ |
| Integrity — `src/types/trace.ts` interface committed; all 8 fields non-optional | `tsc --strict --noEmit` exits 0; `buildTraceEntry` test asserts all 8 fields; interface enforces completeness at compile time | ✅ |

---

## Metric Signal

**M2 — Per-decision traceability to versioned skill**

S2 is the first contributing story for M2. The dev agent leg is now complete: trace entries contain `skillName`, `skillVersion`, and `promptHash` (SHA-256, independently verifiable). M2 is now partially measurable — one of three contributing agents (dev, review, assurance) is instrumented.

- **Signal:** `at-risk` — partial progress; M2 requires all three agents (S2 done, S3 and S4 pending). Full target not yet measurable.
- **Evidence:** `2aa389817ba2dd0f376f7a14344ec5e1d21d418a1696b4e099f3a53dd21eb19a` — SHA-256 of `feature-dev` SKILL.md matches `promptHash` in dev agent trace, verified independently from two sources. Dev agent leg of M2 is evidenced. Review and assurance legs require S3 and S4.
- **Date measured:** 2026-03-31

**M1 — Autonomous loop completion on an unseen task**

M1 is not yet measurable — requires S2–S4 governance layer complete. No change to signal.

---

## Outcome

**Definition of done: COMPLETE ✅**

ACs satisfied: 6/6
Deviations: None
Test gaps: None
NFRs: All evidenced

S3 is next. DoR and coding agent instructions updated with DL-008 guard requirement before branching.
