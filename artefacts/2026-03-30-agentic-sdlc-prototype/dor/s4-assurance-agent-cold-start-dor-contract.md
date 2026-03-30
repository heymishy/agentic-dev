# Contract Proposal — Assurance agent runs cold-start, validates both traces, confirms hashes, emits assurance record

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s4-assurance-agent-cold-start.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## What will be built

- Extend `src/agents/assurance-agent.ts` — add `readTraceLog(filePath): [TraceEntry, TraceEntry]`
  (validates schema before returning; throws TypedValidationError naming missing fields);
  `validateDevTrace(devEntry, skillPath): DevValidationResult`;
  `validateReviewTrace(reviewEntry, devHashResult, skillPath): ReviewValidationResult`;
  `buildAssuranceRecord(devResult, reviewResult): AssuranceRecord` (emits with all named fields +
  `verdict: "closed" | "escalate"` + `criteriaOutcomes` at criterion level)
- Extend `src/types/trace.ts` — add full `AssuranceRecord` interface with all fields non-optional:
  `agentIdentity`, `skillName`, `skillVersion`, `promptHash`, `hashAlgorithm`, `devHashMatch`,
  `reviewHashMatch`, `criteriaOutcomes`, `verdict`, `timestamp`
- README section: cold-start independence mechanism — process-boundary paragraph in plain English
  (per ADR-001 decision; one paragraph, no code, readable without engineering context)
- `tests/fixtures/feature-assurance.skill.md` with pre-computed SHA-256
- `tests/unit/s4-assurance-agent.test.ts` — 8 unit tests (readTraceLog, computeSkillHash,
  validateDevTrace, validateReviewTrace, buildAssuranceRecord — happy and escalate paths)
- `tests/integration/s4-assurance-agent.test.ts` — 3 integration tests (full happy-path run;
  cold-start independence stale-file-replacement; skills path from registry)

## What will NOT be built

- Failure injection testing — S5 owns M3; S4's hash-mismatch unit tests are precondition checks,
  not the formal M3 protocol (see DL-003)
- Escalation notification workflows — `escalate` verdict is written to the assurance record but
  triggers no notification (excluded per discovery out-of-scope item 5)
- Option C dependency injection boundary (ADR-001 decision) — deferred to Foundry phase

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 | Unit test: `readTraceLog()` on valid temp file returns 2 typed entries; unit test: missing field throws named error (not partial return) | Unit |
| AC2 | Unit tests: `validateDevTrace()` returns `devHashMatch: true` on matching fixture; `devHashMatch: false` (no throw) on mismatch | Unit |
| AC3 | Unit tests: `validateReviewTrace()` returns both hash-match results; integration: full run against fixture confirms review hash chain | Unit + Integration |
| AC4 | Unit tests: `buildAssuranceRecord()` emits complete `AssuranceRecord` with `verdict: "closed"`; emits `verdict: "escalate"` with non-empty findings on mismatch | Unit |
| AC5 | Integration test (cold-start independence — stale-file-replacement per ADR-001 Option A); NFR structural test (no-cross-imports assertion); manual scenario in verification script | Integration + NFR structural + Manual |

## Assumptions

- S3 is complete and produces a valid review trace entry in the append-only trace log
- `src/lib/skill-loader.ts` from S2 is reused for `computeSkillHash()` — no duplication
- Process-boundary invocation is already established from S1 (separate process per agent invocation)
- ADR-001 is closed (confirmed 2026-03-31); cold-start mechanism is documented in README

## Estimated touch points

**Files created:**
- `tests/fixtures/feature-assurance.skill.md`
- `tests/fixtures/feature-assurance.skill.sha256`
- `tests/unit/s4-assurance-agent.test.ts`
- `tests/integration/s4-assurance-agent.test.ts`

**Files modified:**
- `src/agents/assurance-agent.ts` (extended from S1 stub)
- `src/types/trace.ts` (AssuranceRecord interface completed)
- `README.md` (cold-start section added)
- `skills-registry.json` (feature-assurance entry confirmed or added)

**Services:** None for unit tests; trace log file I/O for integration tests

---

## Contract review result

✅ **Contract review passed** — proposed implementation aligns with all 5 ACs.  
AC5 partial gap is covered by structural + integration + manual approach per ADR-001
(Decisions Gate closed 2026-03-31). `criteriaOutcomes` field required in assurance
record per DL-003 (S5 M3 protocol dependency).
