## Test Plan: Review agent validates dev trace and emits its own trace

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s3-review-agent-trace-validation.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Test plan author:** Copilot
**Date:** 2026-03-30

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Reads dev trace from filesystem only (not in-memory/session context); confirms all required fields present | 2 | 1 | — | — | — | 🟢 |
| AC2 | Independently computes SHA-256 of feature-dev SKILL.md on disk; records `hash-match: true/false` explicitly | 2 | 1 | — | — | — | 🟢 |
| AC3 | Validates all criteria from feature-dev skill appear in trace results; records missing criterion as finding, not silence | 2 | — | — | — | — | 🟢 |
| AC4 | Review trace entry contains all required fields: identity, skill, version, prompt hash, hash-match result, findings, decision outcome, timestamp | 2 | 1 | — | — | — | 🟢 |
| AC5 | `hash-match: false` on tampered dev trace → review decision outcome is `reject-to-inbox` with explicit reason referencing the hash mismatch | 2 | 1 | — | — | — | 🟢 |

---

## Coverage gaps

| Gap | AC | Gap type | Reason | Handling |
|-----|----|----------|--------|---------|
| "Not from in-memory or session context" (AC1) cannot be definitively proved by an automated test — we can only test the observable behaviour (trace is read from a file path argument, not from a global/shared variable) | AC1 | Untestable-by-nature (partial) | No language-level mechanism prevents reading in-memory state in a unit test environment; the constraint is architectural. | Mitigated by: (1) unit test passes a temp file path — no shared module state involved; (2) integration test deletes the temp file before the review agent reads it to confirm the agent reads the file at the given path, not a cached copy; (3) structural NFR test asserts no shared module-level state between dev and review agent source files. |

---

## Test Data Strategy

**Source:** Synthetic — all dev trace log entries constructed in test setup; all SKILL.md
fixtures committed under `tests/fixtures/`. No real skill content required.

**PCI/sensitivity in scope:** No — all data is synthetic; no credentials, org data, or PII.

**Availability:** Self-contained — tests write temp trace log files in setup and delete them in
teardown. No external services or running infrastructure required.

**Owner:** Self-contained — each test constructs its own trace data; no dependency on S2
producing live output.

### Data requirements per AC

| AC | Data needed | Source | Sensitive fields | Notes |
|----|-------------|--------|-----------------|-------|
| AC1 | Synthetic `TraceEntry` for dev agent written to a temp file; all 8 required fields present | Synthetic | None | Written to temp file path; review agent receives path as argument only |
| AC2 | `fixtures/feature-dev.skill.md` with known content; pre-computed SHA-256 constant; dev trace entry with matching hash | Synthetic fixture | None | Two scenarios: hash matches fixture (true); hash does not match fixture (false) |
| AC3 | Synthetic `feature-dev` skill criteria list (3 criteria); dev trace `criteriaResults` array with one criterion missing | Synthetic | None | Missing criterion is identified by text or ID, not position |
| AC4 | Full happy-path: valid dev trace on disk, hashes match, all criteria covered | Synthetic | None | Review trace output must be parseable as `TraceEntry` interface |
| AC5 | Tampered dev trace: `promptHash` field modified to a hash that does not match the fixture file on disk | Synthetic | None | The "tampered" trace is constructed directly in the test — no need to mutate a written file |

### Gaps

None — all test data is synthetic and self-contained.

---

## Unit Tests

### `loadTraceFromFile` — parses valid trace entry from a temp file path

- **Verifies:** AC1
- **Precondition:** A temp file with one valid `TraceEntry` JSON object (all 8 required fields, `agentIdentity: "dev"`), written by test setup.
- **Action:** Call `loadTraceFromFile(tempFilePath)`.
- **Expected result:** Returns a typed `TraceEntry` object with all fields present; `agentIdentity` is `"dev"`. No exception thrown.
- **Edge case:** No — happy path.

### `loadTraceFromFile` — throws when file does not exist at given path

- **Verifies:** AC1 (filesystem-only constraint — no fallback to session/memory)
- **Precondition:** No file exists at the given path; no global module state holding a cached trace.
- **Action:** Call `loadTraceFromFile('./tmp/does-not-exist.json')`.
- **Expected result:** Throws a file-not-found error. Does not return a default object or cached value. Confirms reading is file-bound, not session-bound.
- **Edge case:** Yes — missing trace file; this is the structural test for the "not from session" constraint.

### `verifyDevTraceHash` — returns `devHashMatch: true` when hash matches current skill file

- **Verifies:** AC2
- **Precondition:** Dev trace entry whose `promptHash` equals the pre-computed SHA-256 of `fixtures/feature-dev.skill.md`; the fixture file is on disk.
- **Action:** Call `verifyDevTraceHash(devTraceEntry, './fixtures/feature-dev.skill.md')`.
- **Expected result:** Returns `{ devHashMatch: true }`. No exception thrown.
- **Edge case:** No.

### `verifyDevTraceHash` — returns `devHashMatch: false` when hash does not match

- **Verifies:** AC2, AC5 (precondition for the reject path)
- **Precondition:** Dev trace entry whose `promptHash` is a valid SHA-256 hex string but does NOT match the SHA-256 of the fixture file on disk (simulated tamper).
- **Action:** Call `verifyDevTraceHash(devTraceEntry, './fixtures/feature-dev.skill.md')`.
- **Expected result:** Returns `{ devHashMatch: false }`. Does not throw.
- **Edge case:** Yes — hash mismatch.

### `validateCriteriaCompleteness` — returns empty findings when all criteria are covered

- **Verifies:** AC3
- **Precondition:** Synthetic criterion list (3 entries); dev trace `criteriaResults` array covering all 3 by criterion text.
- **Action:** Call `validateCriteriaCompleteness(skillCriteria, devTrace.criteriaResults)`.
- **Expected result:** Returns an empty findings array `[]`. No exception thrown.
- **Edge case:** No.

### `validateCriteriaCompleteness` — records a finding for each missing criterion

- **Verifies:** AC3 (missing criterion is a finding, not silently ignored)
- **Precondition:** Synthetic criterion list (3 entries); dev trace `criteriaResults` containing only 2 of the 3 criteria.
- **Action:** Call `validateCriteriaCompleteness(skillCriteria, devTrace.criteriaResults)`.
- **Expected result:** Returns a findings array with exactly 1 entry naming the missing criterion (by text or ID). The missing criterion is not silently skipped.
- **Edge case:** Yes — incomplete criteria results.

### `buildReviewTraceEntry` — produces entry with all required fields on happy path

- **Verifies:** AC4
- **Precondition:** Valid hash-match result (`true`); empty findings array; all inputs conforming to `TraceEntry` interface.
- **Action:** Call `buildReviewTraceEntry({ agentIdentity: 'review', skillName: 'feature-review', skillVersion: '1.0.0', promptHash: '<precomputed>', hashAlgorithm: 'sha256', devHashMatch: true, validationFindings: [], decisionOutcome: 'proceed-to-quality-review' })`.
- **Expected result:** Returns an object with all required fields present. `agentIdentity` is `"review"`. `decisionOutcome` is `"proceed-to-quality-review"`. `timestamp` is a valid ISO 8601 string. TypeScript compiler enforces completeness via `TraceEntry` interface.
- **Edge case:** No.

### `buildReviewTraceEntry` — sets `reject-to-inbox` and references hash mismatch in outcome

- **Verifies:** AC5
- **Precondition:** `devHashMatch: false`; findings array with one hash-mismatch finding.
- **Action:** Call `buildReviewTraceEntry` with `devHashMatch: false` and the mismatch finding.
- **Expected result:** `decisionOutcome` is `"reject-to-inbox"`. The `validationFindings` array contains at least one entry that explicitly references the hash mismatch (not just a generic "validation failed" message). TypeScript enforcement in place.
- **Edge case:** Yes — reject path.

---

## Integration Tests

### Full review agent run — reads dev trace from file, hashes skill, emits review trace

- **Verifies:** AC1, AC2, AC4
- **Precondition:** Valid dev trace written to a temp file; `fixtures/feature-dev.skill.md` on disk; temp trace log path; `skills-registry.json` pointing to fixture paths.
- **Action:** Run `reviewAgent({ registryPath: './skills-registry.json', tracePath: '<temp>', devTraceFile: '<temp>' })` end-to-end.
- **Expected result:** (1) Review trace entry appended to trace log file. (2) Review entry is valid JSON parseable as `TraceEntry`. (3) `agentIdentity` is `"review"`. (4) `devHashMatch: true` (hashes match fixture). (5) `validationFindings` is empty. (6) `decisionOutcome` is `"proceed-to-quality-review"`. (7) Dev trace file is unchanged after run.
- **Edge case:** No — happy path integration.

### Filesystem-only read integration — review agent reads trace from file path, not stale cache

- **Verifies:** AC1 (gap mitigation: structural test for session independence)
- **Precondition:** Dev trace written to a temp file; temp file deleted immediately after creation; then a fresh dev trace written to the same path with different content.
- **Action:** Run review agent with the path pointing to the fresh trace.
- **Expected result:** Review agent reads the fresh trace content (reflected in the reported skill version or timestamp), not the original content. Confirms no temp-file caching or module-level memoisation.
- **Edge case:** Yes — stale file replacement.

### Hash mismatch integration — tampered dev trace causes `reject-to-inbox`

- **Verifies:** AC5
- **Precondition:** Dev trace written to temp file with `promptHash` modified to a value that does not match `fixtures/feature-dev.skill.md` on disk.
- **Action:** Run review agent end-to-end against the tampered trace.
- **Expected result:** (1) Review trace entry `decisionOutcome` is `"reject-to-inbox"`. (2) `devHashMatch` is `false`. (3) `validationFindings` contains an entry explicitly referencing the hash mismatch. (4) Task is not advanced to Quality Review.
- **Edge case:** Yes — tamper path.

### Criteria completeness integration — missing criterion in dev trace becomes a finding

- **Verifies:** AC3
- **Precondition:** Dev trace with `criteriaResults` missing one of the three fixture criteria.
- **Action:** Run review agent end-to-end against the incomplete trace.
- **Expected result:** Review trace `validationFindings` contains exactly one entry naming the missing criterion. `decisionOutcome` is `"reject-to-inbox"` (missing criterion is a validation failure).
- **Edge case:** Yes — incomplete criteria.

---

## NFR Tests

### Dev trace integrity — trace file is unchanged after review agent run

- **Verifies:** NFR (Integrity — review agent must not write to or modify dev trace)
- **Mechanism:** Compute SHA-256 of dev trace file before and after running the review agent; assert both hashes are equal.
- **Pass condition:** Pre- and post-run file hashes are identical. Any file modification causes the test to fail.
- **S6 cross-reference:** This test — hash-before/hash-after at the review-agent boundary — is the canonical automated coverage for trace-file integrity. S6 AC3 (tamper-evidence: modified prior entry produces detectable inconsistency) references this test as prior coverage rather than duplicating it. S6's scope is legibility (M5) and the manual demonstration of deliberate external tampering (M6). See DL-002 in `decisions.md`.

### Review trace appended to same log — not written to a separate file

- **Verifies:** NFR (Traceability — review trace joins the same append-only log)
- **Mechanism:** Verify that the trace log file contains exactly 2 entries after both dev and review agents have run (dev entry followed by review entry, in sequence). Assert they share the same file path.
- **Pass condition:** Trace log contains 2 entries; first entry has `agentIdentity: "dev"`, second has `agentIdentity: "review"`.

### No credentials or org data in review trace output

- **Verifies:** NFR (Security)
- **Mechanism:** Grep the written review trace entry for known credential patterns (`Bearer`, `sk-`, `password`, `secret`).
- **Pass condition:** No matches in serialised review trace JSON.

---

## Out of Scope for this test plan

- Assurance agent validation of the review trace — that is S4's test plan
- Dev agent implementation or trace format changes — that is S2
- Notification or escalation workflows — excluded per discovery out-of-scope item 5
- Trace tamper-evidence mechanism — **S6** (this story's hash-before/hash-after NFR test provides
  prior automated coverage for trace-file integrity at the review-agent boundary; S6 references that
  test and focuses on manual tamper demonstration and non-engineer legibility — see DL-002 in `decisions.md`)
