## AC Verification Script: Review agent validates dev trace and emits its own trace

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s3-review-agent-trace-validation.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s3-review-agent-trace-validation-test-plan.md`
**Verification author:** Copilot
**Date:** 2026-03-30

---

## Prerequisites

1. S1 complete — Mission Control queue is operational.
2. S2 complete — Dev agent produces a valid trace entry (with hash, criteria results, decision outcome).
3. `skills-registry.json` at repo root; `feature-dev` and `feature-review` SKILL.md files present at their registered paths.
4. A valid S2 trace log exists on disk at the configured trace log path.
5. `npm test` exits 0 from a clean state before verification begins.

---

## Scenario 1 — AC1: Review agent reads dev trace from the filesystem only

**Setup:** S2 trace log exists on disk. All S3 unit and integration tests for `loadTraceFromFile` are available.

**Steps:**
1. Run `npm test -- --testPathPattern loadTraceFromFile`.
2. Confirm both unit tests pass: (a) valid file → returns typed `TraceEntry`; (b) missing file → throws, no fallback.
3. Run the filesystem-only read integration test: `npm test -- --testPathPattern s3.*filesystem`.

**Expected result:** All three tests green. The "missing file throws" test confirms there is no module-level cache or session fallback.

**Pass condition:** All `loadTraceFromFile` tests green. No test uses a hardcoded trace value or module-level shared state.

---

## Scenario 2 — AC2: Hash verification records explicit `hash-match` result

**Setup:** `fixtures/feature-dev.skill.md` on disk with known content.

**Steps:**
1. Run `npm test -- --testPathPattern verifyDevTraceHash`.
2. Confirm hash-match-true and hash-match-false tests both pass.
3. Open the trace log file written by Scenario 4's integration run.
4. Confirm the review entry contains an explicit `devHashMatch` field (`true` or `false`) — not absent, not inferred.

**Expected result:** Both unit tests green. `devHashMatch` field is present and explicitly set in the written review trace.

**Pass condition:** `devHashMatch` field present in review trace. Unit tests cover both true and false cases.

---

## Scenario 3 — AC3: Missing criterion becomes an explicit finding

**Setup:** Synthetic dev trace with one criterion absent from `criteriaResults`.

**Steps:**
1. Run `npm test -- --testPathPattern validateCriteriaCompleteness`.
2. Confirm the empty-findings test passes (all criteria present → `[]`).
3. Confirm the missing-criterion test passes (one absent criterion → 1 finding naming the criterion).
4. Run the criteria completeness integration test: `npm test -- --testPathPattern s3.*criteria`.
5. Open the resulting review trace and confirm `validationFindings` names the missing criterion explicitly.

**Expected result:** All four tests green. Missing criterion is named in the finding text, not described as "unknown criterion".

**Pass condition:** `validateCriteriaCompleteness` unit and integration tests green. Finding text contains the criterion name/text.

---

## Scenario 4 — AC4: Review trace entry contains all required fields

**Setup:** Happy-path integration test available.

**Steps:**
1. Run `npm test -- --testPathPattern s3.*integration.*full`.
2. After the test completes, inspect the trace log file:
   ```
   node -e "const fs = require('fs'); const entries = fs.readFileSync('./tmp/trace.log', 'utf8').trim().split('\n').map(JSON.parse); console.log(JSON.stringify(entries[1], null, 2))"
   ```
3. Confirm the second entry (review agent) contains all required fields: `agentIdentity` (`"review"`), `skillName` (`"feature-review"`), `skillVersion`, `promptHash`, `hashAlgorithm` (`"sha256"`), `devHashMatch`, `validationFindings`, `decisionOutcome` (`"proceed-to-quality-review"`), `timestamp`.
4. Confirm `tsc --strict` passes on the review agent source.

**Expected result:** All fields present. TypeScript compiler confirms completeness. Second trace log entry follows first in order.

**Pass condition:** All required fields present in written review trace. `tsc --strict` exits 0.

---

## Scenario 5 — AC5: Tampered dev trace causes `reject-to-inbox` with explicit hash mismatch reason

**Setup:** Integration test for the hash-mismatch reject path.

**Steps:**
1. Run `npm test -- --testPathPattern s3.*mismatch`.
2. Confirm (a) `decisionOutcome` is `"reject-to-inbox"`, (b) `devHashMatch` is `false`, (c) `validationFindings` contains an entry with text explicitly referencing the hash mismatch (not a generic rejection message).
3. Confirm the task was not advanced to Quality Review in the Mission Control mock.

**Expected result:** Hash-mismatch integration test green. `reject-to-inbox` in outcome. Mismatch finding present.

**Pass condition:** Test green. `decisionOutcome: "reject-to-inbox"`. Finding text explicitly names the hash mismatch. Task not advanced.

---

## Scenario 6 — NFR: Dev trace is unchanged after review agent run

**Setup:** Dev trace file exists before review agent runs.

**Steps:**
1. Compute SHA-256 of the dev trace file before the review agent runs:
   ```
   node -e "const crypto = require('crypto'); const fs = require('fs'); console.log(crypto.createHash('sha256').update(fs.readFileSync('./tmp/trace.log')).digest('hex'))"
   ```
2. Run the review agent.
3. Re-read the trace log and extract only the first entry; compute SHA-256 of its serialised content again.
4. Compare the pre-run and post-first-entry hashes.

**Expected result:** The first trace log entry (dev entry) is byte-for-byte identical before and after the review agent runs. The review agent only appends; it never modifies.

**Pass condition:** Pre- and post-run hash of the dev trace entry are identical. The NFR integrity test (`npm test -- --testPathPattern s3.*integrity`) also passes.

---

## Summary

| Scenario | AC | Pass condition | Status |
|----------|----|----------------|--------|
| 1 | AC1 | `loadTraceFromFile` tests green; missing-file throws with no fallback | ⬜ |
| 2 | AC2 | `verifyDevTraceHash` true+false tests green; `devHashMatch` field explicit in written trace | ⬜ |
| 3 | AC3 | `validateCriteriaCompleteness` tests green; missing criterion named in finding | ⬜ |
| 4 | AC4 | All required fields in review trace; `tsc --strict` exits 0 | ⬜ |
| 5 | AC5 | Hash-mismatch reject integration green; `reject-to-inbox`; explicit mismatch finding | ⬜ |
| 6 | NFR | Dev trace entry byte-identical before and after review agent run | ⬜ |
