# Contract Proposal — Review agent validates dev trace and emits its own trace

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s3-review-agent-trace-validation.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## What will be built

- `src/lib/trace-reader.ts` — exports `loadTraceFromFile(filePath): TraceEntry`; throws a typed
  `TraceReadError` if the file does not exist at the given path; throws a typed `TraceValidationError`
  naming the missing field if any required `TraceEntry` field is absent; does NOT fall back to any
  module-level cache or global variable (per ADR-001 process-boundary constraint)
- Extend `src/agents/review-agent.ts` — add `verifyDevTraceHash(devEntry, skillPath): HashMatchResult`,
  `validateCriteriaCompleteness(skillCriteria, devCriteriaResults): Finding[]`,
  `buildReviewTraceEntry(inputs): TraceEntry`
- `tests/fixtures/feature-review.skill.md` — synthetic review skill with known byte content;
  pre-computed SHA-256 constant committed alongside
- `tests/unit/s3-review-agent.test.ts` — 7 unit tests
- `tests/integration/s3-review-agent.test.ts` — 4 integration tests (full happy path,
  stale-file-replacement, hash mismatch → reject, missing criterion → finding)

## What will NOT be built

- Re-execution or re-evaluation of implementation work — review agent reads the trace only;
  no access to the implementation file output produced by the dev agent
- Any cross-agent module imports — `review-agent.ts` must not import from `dev-agent.ts` or
  `assurance-agent.ts` at any import depth (structural constraint per ADR-001 Option A)
- Assurance agent validation — S4
- Escalation notification workflows — excluded per discovery out-of-scope item 5

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 | Unit test: `loadTraceFromFile(path)` on a valid temp file returns typed entry; unit test: missing file throws (not null/default) | Unit |
| AC2 | Unit tests: `verifyDevTraceHash()` returns `true` when fixture hash matches; returns `false` (no throw) when hash doesn't match; integration: hash comparison in full agent run | Unit + Integration |
| AC3 | Unit tests: `validateCriteriaCompleteness()` returns empty findings when all criteria covered; returns named finding for each missing criterion | Unit |
| AC4 | Unit test: `buildReviewTraceEntry()` returns complete `TraceEntry` with all required fields; TypeScript compiler confirms completeness | Unit |
| AC5 | Unit test: `buildReviewTraceEntry()` with `devHashMatch: false` → `decisionOutcome: 'reject-to-inbox'` with hash-mismatch reference in findings; integration: full run against tampered trace | Unit + Integration |

## Assumptions

- S2 is complete and producing valid `TraceEntry` JSON in the append-only trace log before
  this story's integration tests run
- `feature-review` SKILL.md has a `version:` field or deterministic version convention
- `skills-registry.json` from S2 already maps `feature-review` to its fixture path; this
  story extends the registry entry, does not create a new schema

## Estimated touch points

**Files created:**
- `src/lib/trace-reader.ts`
- `tests/fixtures/feature-review.skill.md`
- `tests/fixtures/feature-review.skill.sha256`
- `tests/unit/s3-review-agent.test.ts`
- `tests/integration/s3-review-agent.test.ts`

**Files modified:**
- `src/agents/review-agent.ts` (extended from S1 stub)
- `skills-registry.json` (entry for `feature-review` confirmed or added)

**Services:** None for unit tests; trace log file I/O only for integration tests

---

## Contract review result

✅ **Contract review passed** — proposed implementation aligns with all 5 ACs.  
ADR-001 no-cross-imports constraint is explicitly encoded in the "What will NOT be built"
section and is verified by the NFR structural test in the test plan.
