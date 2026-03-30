# Contract Proposal — Dev agent loads skill, self-checks against falsifiable criteria, emits trace

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s2-dev-agent-skill-trace.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## What will be built

- `src/types/trace.ts` — TypeScript strict-mode interfaces: `TraceEntry` (all fields non-optional:
  `agentIdentity`, `skillName`, `skillVersion`, `promptHash`, `hashAlgorithm`, `criteriaResults`,
  `decisionOutcome`, `timestamp`); `AssuranceRecord` stub (to be extended in S4)
- `src/lib/skill-loader.ts` — exports `loadSkillFromRegistry(registryPath, skillName): string`
  (reads `skills-registry.json`, resolves path, returns file content); `computeSkillHash(filePath): string`
  (SHA-256 over raw `Buffer`, returns lowercase hex; throws if file absent)
- Extend `src/agents/dev-agent.ts` — add `evaluateCriteria(skillContent, workOutput): CriterionResult[]`
  and `emitTraceEntry(traceLogPath, entry: TraceEntry): void` (append-only write)
- `skills-registry.json` at repository root — maps `feature-dev`, `feature-review`,
  `feature-assurance` to their respective `./` relative paths; committed as explicit deliverable
- `tests/fixtures/feature-dev.skill.md` — synthetic skill file; pre-computed SHA-256 constant
  committed alongside the fixture in `tests/fixtures/feature-dev.skill.sha256`
- `tests/unit/s2-dev-agent.test.ts` — 8 unit tests (skill loader, hash computation, criteria
  evaluation, trace emission, registry resolution, error paths)
- `tests/integration/s2-dev-agent-trace.test.ts` — 2 integration tests (full trace roundtrip;
  skills path from registry)

## What will NOT be built

- Review agent logic — S3 owns `review-agent.ts` extension
- Assurance agent logic — S4 owns `assurance-agent.ts` extension
- Automated hash verification scripts or tooling — manual independent verification is sufficient
  for M2; automation is a next-phase hardening item
- Changes to criteria content in `feature-dev` SKILL.md — skill content is fixed for this story

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 (observable reformulation, DL-004) | Unit test: `emitTraceEntry()` result contains `promptHash` that matches `computeSkillHash()` applied to the same fixture file independently; hash appears before any criteria result field in the JSON output | Unit |
| AC2 | Three unit tests: `evaluateCriteria()` with (a) all criteria passing, (b) one criterion failing (reason string present), (c) one criterion not-applicable | Unit |
| AC3 | Unit test: `emitTraceEntry()` output parsed as `TraceEntry` — TypeScript compiler enforces all 8 fields non-optional; confirmed by `tsc --strict --noEmit` in NFR test | Unit |
| AC4 | Integration test: run full dev agent against fixture, independently compute SHA-256 of fixture file, assert hashes match | Integration |
| AC5 | Unit test: `evaluateCriteria()` with one failing criterion → `decisionOutcome: 'reject'`; confirm agent does not call `moveTask()` when outcome is reject | Unit |
| AC6 | Unit test: `loadSkillFromRegistry` reads registry, resolves to correct path (not a default); integration: grep assurance record hash against the registry-specified fixture path | Unit + Integration |

## Assumptions

- `feature-dev` SKILL.md criteria are machine-checkable in the synthetic task context
  (discovery assumption 4 — if any criterion requires human interpretation, it must be
  rewritten before AC2 can pass)
- A `version:` field (YAML frontmatter) or equivalent naming convention in SKILL.md
  resolves to a deterministic non-empty string; if neither is present, the
  implementation must derive version from Git commit SHA of the fixture file
- `skills-registry.json` key names exactly match what the agent scripts use at runtime

## Estimated touch points

**Files created:**
- `src/types/trace.ts`
- `src/lib/skill-loader.ts`
- `skills-registry.json`
- `tests/fixtures/feature-dev.skill.md`
- `tests/fixtures/feature-dev.skill.sha256`
- `tests/unit/s2-dev-agent.test.ts`
- `tests/integration/s2-dev-agent-trace.test.ts`

**Files modified:**
- `src/agents/dev-agent.ts` (extended from S1 stub)

**Services:** None (all local; no Docker required for unit tests)

---

## Contract review result

✅ **Contract review passed** — proposed implementation aligns with all 6 ACs.  
Note: AC1's "stores in memory" wording in the story is interpreted as the observable
outcome (hash in trace matches file bytes at invocation time). DL-004 records this
interpretation. The contract tests the observable behaviour, not internal state.
