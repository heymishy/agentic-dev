## Test Plan: Assurance agent runs cold-start, validates both traces, confirms hashes, emits assurance record

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s4-assurance-agent-cold-start.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Test plan author:** Copilot
**Date:** 2026-03-30

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Reads both trace entries from trace log only; validates against `src/types/trace.ts` before proceeding | 2 | 1 | — | — | — | 🟢 |
| AC2 | Independently loads `feature-dev` SKILL.md, computes SHA-256, compares to dev trace hash; records `dev-hash-match` explicitly | 2 | 1 | — | — | — | 🟢 |
| AC3 | Independently loads `feature-review` SKILL.md, computes hash, compares to review trace hash; confirms review agent's `hash-match` result; records both | 2 | 1 | — | — | — | 🟢 |
| AC4 | Emits complete assurance record: all named fields, `closed`/`escalate` verdict, task moves to Done in Mission Control | 1 | 2 | — | — | — | 🟢 |
| AC5 | Cold-start independence mechanism exists, is documented, and prevents access to prior agents' execution context | — | 1 | — | 1 | Untestable-by-nature (partial — structural + manual per ADR-001) | 🟡 |

---

## Coverage gaps

| Gap | AC | Gap type | Reason | Handling |
|-----|----|----------|--------|---------|
| Cold-start independence cannot be fully verified by automated test — structural tests cover the import-level isolation class only; runtime context sharing via a dynamic mechanism without a static import footprint is outside the automated test scope | AC5 | Untestable-by-nature (partial, structural mitigation in place per ADR-001) | Process-boundary invocation pattern is the runtime enforcement mechanism (per ADR-001). Automated tests cover: (1) no-cross-imports assertion; (2) cold-start independence integration test (stale-file-replacement analog). Dynamic import violations without a static footprint are not caught. | ADR-001 (Decisions Gate closed 2026-03-31). Structural + integration tests defined in this plan. Manual AC5 scenario in verification script confirms live cold-start mechanism. |

---

## Test Data Strategy

**Source:** Synthetic — all trace log entries generated in test setup; all SKILL.md
files are test fixtures committed to the repository.

**PCI/sensitivity in scope:** No — all data is synthetic; no real credentials, org
data, or PII.

**Availability:** Self-contained — tests construct trace entries using the
`src/types/trace.ts` interface. SKILL.md fixtures are committed as test assets.

**Owner:** Self-contained — tests generate their own state in setup/teardown.

### Data requirements per AC

| AC | Data needed | Source | Sensitive fields | Notes |
|----|-------------|--------|-----------------|-------|
| AC1 | Two trace log entries (dev + review) conforming to `TraceEntry` interface | Synthetic — constructed in test setup | None | Must be written to a temp file to test filesystem-only read behaviour |
| AC2 | `feature-dev` SKILL.md fixture; dev trace entry containing a known SHA-256 hash of that fixture | Synthetic fixture | None | Hash must be pre-computed from the fixture file bytes and embedded in the trace entry |
| AC3 | `feature-review` SKILL.md fixture; review trace entry containing a known hash; dev hash-match result embedded in review trace | Synthetic fixture | None | Pre-compute both hashes at fixture creation time |
| AC4 | Full happy-path trace log (dev + review entries, all hashes matching) | Synthetic | None | Assurance record output must be parseable against `AssuranceRecord` type |
| AC5 | Running assurance agent in isolation from dev/review agent modules | — | None | Mechanism not yet decided — see gap; structural test (no cross-imports) only until mechanism is confirmed |

### Gaps

None — all test data is synthetic and self-contained. No external services
or pre-existing data required for any automated test.

---

## Unit Tests

### `readTraceLog` — parses valid trace log file and returns two typed entries

- **Verifies:** AC1
- **Precondition:** A temp file containing two valid `TraceEntry` JSON objects (one with `agentIdentity: "dev"`, one with `agentIdentity: "review"`) exists on disk.
- **Action:** Call `readTraceLog(filePath)`.
- **Expected result:** Returns an array of exactly 2 objects, each satisfying the `TraceEntry` TypeScript interface; no exception thrown.
- **Edge case:** No — happy path only.

### `readTraceLog` — throws if required fields missing from an entry

- **Verifies:** AC1 (schema validation before processing)
- **Precondition:** A temp trace log file where the dev entry is missing the `promptHash` field.
- **Action:** Call `readTraceLog(filePath)`.
- **Expected result:** Throws a typed validation error naming the missing field; does not return a partial entry.
- **Edge case:** Yes — partial/malformed trace entries.

### `computeSkillHash` — produces correct SHA-256 hex string for a known fixture

- **Verifies:** AC2, AC3
- **Precondition:** A fixture file `fixtures/feature-dev.skill.md` with known byte content; expected SHA-256 pre-computed as a constant in the test.
- **Action:** Call `computeSkillHash('./fixtures/feature-dev.skill.md')`.
- **Expected result:** Returns the pre-computed SHA-256 hex string exactly; no padding, lowercase hex digits.
- **Edge case:** No.

### `computeSkillHash` — throws if file does not exist at given path

- **Verifies:** AC2 (error path for missing skill file)
- **Precondition:** No file exists at the given path.
- **Action:** Call `computeSkillHash('./fixtures/does-not-exist.md')`.
- **Expected result:** Throws a file-not-found error; does not return null or an empty hash.
- **Edge case:** Yes — missing skill file.

### `validateDevTrace` — records `dev-hash-match: true` when hash matches fixture

- **Verifies:** AC2
- **Precondition:** Dev trace entry whose `promptHash` equals the pre-computed hash of `fixtures/feature-dev.skill.md`.
- **Action:** Call `validateDevTrace(devTraceEntry, './fixtures/feature-dev.skill.md')`.
- **Expected result:** Returns a result object with `devHashMatch: true` and no validation findings.
- **Edge case:** No.

### `validateDevTrace` — records `dev-hash-match: false` when hash does not match

- **Verifies:** AC2, AC3 (hash mismatch detection)
- **Precondition:** Dev trace entry whose `promptHash` is a hex string that does not match the actual fixture.
- **Action:** Call `validateDevTrace(devTraceEntry, './fixtures/feature-dev.skill.md')`.
- **Expected result:** Returns `devHashMatch: false` with an explicit mismatch finding; does not throw.
- **Edge case:** Yes — hash mismatch.

### `validateReviewTrace` — confirms review agent's own hash-match result is recorded

- **Verifies:** AC3
- **Precondition:** Review trace entry containing `hashMatch: true` for the dev trace, and a `promptHash` matching the hash of `fixtures/feature-review.skill.md`.
- **Action:** Call `validateReviewTrace(reviewTraceEntry, devHashMatchResult, './fixtures/feature-review.skill.md')`.
- **Expected result:** Returns `reviewHashMatch: true` and `reviewsDevHashMatch: true` (confirming the review agent's own recorded result); no findings.
- **Edge case:** No.

### `buildAssuranceRecord` — emits record with all required fields and `closed` verdict

- **Verifies:** AC4
- **Precondition:** Both `validateDevTrace` and `validateReviewTrace` returned matching results with no findings.
- **Action:** Call `buildAssuranceRecord(devResult, reviewResult)`.
- **Expected result:** Returns an `AssuranceRecord` object containing: `agentIdentity: "assurance"`, `skillName: "feature-assurance"`, skill version, own prompt hash, `devHashMatch: true`, `reviewHashMatch: true`, empty findings array, `verdict: "closed"`, ISO 8601 timestamp.
- **Edge case:** No.

### `buildAssuranceRecord` — emits `escalate` verdict when either hash does not match

- **Verifies:** AC4 (escalate path)
- **Precondition:** `validateDevTrace` returned `devHashMatch: false`.
- **Action:** Call `buildAssuranceRecord` with the mismatch result.
- **Expected result:** `verdict: "escalate"`; findings array is non-empty and names the failing hash check.
- **Edge case:** Yes — mismatch triggers escalation.

---

## Integration Tests

### Full assurance agent run — reads trace log, validates both hashes, writes assurance record to log

- **Verifies:** AC1, AC2, AC3, AC4 end-to-end
- **Components involved:** `readTraceLog`, `computeSkillHash`, `validateDevTrace`, `validateReviewTrace`, `buildAssuranceRecord`, trace log file I/O
- **Precondition:**
  - A trace log file exists on disk with a valid dev trace entry (hash matches `fixtures/feature-dev.skill.md`) and a valid review trace entry (hash matches `fixtures/feature-review.skill.md`).
  - `skills-registry.json` maps `feature-dev` → `./fixtures/feature-dev.skill.md` and `feature-review` → `./fixtures/feature-review.skill.md`.
- **Action:** Invoke the assurance agent entry point (`src/assurance-agent.ts`) with the trace log path as argument.
- **Expected result:**
  - Trace log file grows by exactly one entry (the assurance record).
  - Appended entry parses as a valid `AssuranceRecord` with `verdict: "closed"`.
  - Prior two entries in the trace log are byte-for-byte identical to their state before invocation (integrity constraint from story NFR).
- **Edge case:** No — happy path.

### Assurance agent — does not modify prior trace entries when appending

- **Verifies:** Story NFR (integrity — prior entries unchanged)
- **Components involved:** Trace log file I/O
- **Precondition:** Trace log file with two existing entries; content checksummed before test.
- **Action:** Run the assurance agent to completion.
- **Expected result:** SHA-256 of bytes [0 .. offset of prior entries] is identical before and after the run.
- **Edge case:** No — this is a property test on the file write pattern.

### Assurance agent — skills path resolved from `skills-registry.json`, not hardcoded

- **Verifies:** S2 AC6 (authority registry) as consumed by S4; confirms assurance agent reads registry
- **Components involved:** `skills-registry.json` read, skill file loading
- **Precondition:** `skills-registry.json` maps `feature-dev` to an explicit test fixture path different from any default path.
- **Action:** Run the assurance agent.
- **Expected result:** The skill file loaded is the one at the path in `skills-registry.json` — confirmed by the hash in the assurance record matching the fixture at that path, not a default path.
- **Edge case:** No.

### Cold-start independence integration — assurance agent reads trace log from file path argument, not module-level state

- **Verifies:** AC5 (structural verification per ADR-001 Option A)
- **Components involved:** Assurance agent entry point, trace log file I/O
- **Precondition:**
  - A temp trace log file is written with a first set of synthetic trace entries (`skillVersion: "1.0.0"` in the dev entry). The assurance agent is invoked against it; the result is discarded.
  - The same temp file path is immediately overwritten with a second set of trace entries (`skillVersion: "2.0.0"`) to simulate a fresh, unrelated trace log being written at the same filesystem location.
  - No module-level cache or shared singleton should retain the first invocation's data.
- **Action:** Invoke the assurance agent entry point a second time with the same file path argument, against the overwritten file.
- **Expected result:** The assurance record from the second invocation records `skillVersion: "2.0.0"` (from the second file), confirming the agent reads from the file path argument on every invocation and carries no module-level cached copy of the prior trace.
- **Edge case:** Yes — stale-file-replacement analog; mirrors the S3 "Filesystem-only read integration" test and confirms cold-start isolation at the invocation boundary.
- **ADR reference:** ADR-001 Option A — the cold-start independence integration test is the behavioural complement to the no-cross-imports structural assertion.

---

## NFR Tests

### Assurance agent — completes full run within 5 seconds on standard laptop

- **NFR addressed:** Performance (story NFR; also S7 full-loop budget)
- **Measurement method:** Wrap entry point invocation in `Date.now()` before and after; assert `elapsed < 5000`.
- **Pass threshold:** < 5000 ms
- **Tool:** Jest timer / `performance.now()` in test harness

### No cross-agent imports in assurance agent module

- **NFR addressed:** Cold-start independence (AC5 structural baseline, pre-mechanism-decision)
- **Measurement method:** Static analysis — assert that `assurance-agent.ts` and its direct imports contain no `import` statement referencing `dev-agent` or `review-agent` module paths.
- **Pass threshold:** Zero cross-agent imports found
- **Tool:** Jest test using Node.js `fs.readFileSync` to read the compiled JS or source and assert no forbidden import strings; or an ESLint rule.
- **Note:** This tests the import-level isolation class (per ADR-001 Option A). Runtime isolation is enforced by the process-boundary invocation pattern — each agent is invoked as a separate Node.js process via the Mission Control queue handler (per ADR-001 decision). The cold-start independence integration test (see Integration Tests above) complements this with a behavioural stale-file-replacement check. Dynamic import violations without a static footprint are outside the automated test scope — see gap table and ADR-001 Consequences.

### Trace log write is append-only — no truncation or overwrite

- **NFR addressed:** Integrity (story NFR)
- **Measurement method:** Write two entries to a temp log, run assurance agent, confirm file size increased (never decreased); confirm first two entries are unchanged at byte level.
- **Pass threshold:** File size after run > file size before run; byte comparison of prior content passes.
- **Tool:** Jest test with `fs.readFileSync` before/after comparison.

---

## Out of Scope for This Test Plan

- Mission Control API integration — tested in S1; this plan treats the queue
  state transition (`task moves to Done`) as an integration point tested by
  the S1 test plan; this plan focuses on trace validation and record emission.
- **S5 deliberate failure injection — S5 is the formal owner of M3 (injected failure detected).**
  S4's hash-mismatch unit tests (AC2 and AC4 escalate-verdict edge cases) are unit-level
  precondition tests: they confirm `buildAssuranceRecord` emits the correct verdict when given a
  mismatch result. They do not constitute a protocol-level test of the full failure-detection chain.
  The formal M3 protocol — inject a wrong hash into a live trace → assurance agent catches it →
  loop does not close → result recorded in `verification/m3-test-results.md` — is S5's test plan
  exclusively. S4 implementation must not duplicate the M3 protocol. If S5 cannot pass because
  S4's `buildAssuranceRecord` does not populate `criteriaOutcomes` at criterion level, that surfaces
  as an S4 implementation defect, not an S5 test failure. (See DL-003 in `decisions.md`.)
- Automated hash resolution tooling — out of scope per story and discovery.

---

## Test Gaps and Risks

| Gap | Reason | Mitigation |
|-----|--------|------------|
| AC5 cold-start independence cannot be fully verified by automated test until the mechanism is decided | The isolation mechanism is unresolved (see Decisions Gate in story). Structural import test is written now; runtime isolation test depends on mechanism choice. | Manual scenario in verification script (🟡). Decisions Gate must be resolved before S4 is marked done. |
| AC4 task-moves-to-Done integration with Mission Control | live Mission Control instance required; not available in unit test harness | S1 test plan covers queue transitions; this plan asserts the assurance record is built correctly and trusts S1 for queue semantics. Record in gap table. |
