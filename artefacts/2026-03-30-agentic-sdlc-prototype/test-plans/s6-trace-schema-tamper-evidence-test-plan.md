## Test Plan: Trace schema finalised — tamper-evidence and non-engineer legibility

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s6-trace-schema-tamper-evidence.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/verification-and-demonstrability.md`
**Test plan author:** Copilot
**Date:** 2026-03-30

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Non-engineer reader answers all 3 governance questions from the raw trace log without briefing | — | — | — | 1 | Manual-by-design | 🟡 |
| AC2 | Q1 failure is a blocking defect — schema revised if non-engineer cannot answer "what policy governed this?" | — | — | — | 1 | Manual-by-design | 🟡 |
| AC3 | Modified prior trace entry produces detectable inconsistency at next assurance verification run | — | — | — | 1 | Manual-by-design | 🟡 |
| AC4 | README tamper-evidence description contains all 4 elements (mechanism, what it protects, what it doesn't, next-phase hardening) | — | — | — | 1 (checklist) | Manual-by-design | 🟢 |
| AC5 | `tsc --strict` passes with 0 errors after schema changes — all agents conform to updated `src/types/trace.ts` | 1 | — | — | — | — | 🟢 |

---

## Coverage gaps

| Gap | AC | Gap type | Reason | Handling |
|-----|----|----------|--------|---------|
| Non-engineer reader test (AC1, AC2) is manual-by-design. A reader who has engineering context cannot substitute. | AC1, AC2 | Manual-by-design | The test requires someone without engineering context; no automated test can faithfully replicate this. | Results recorded in `verification/m5-test-results.md`. AC2's blocking gate is enforced by the story not being signed off until a Q1-passing test result exists. |
| Tamper-evidence mechanism test (AC3) requires manual file modification. | AC3 | Manual-by-design | The test simulates a real-world tampering scenario (editing a prior trace entry). An automated test would just mock the filesystem, not demonstrate the mechanism works in practice. **Prior automated coverage:** S3's NFR test "Dev trace integrity — trace file is unchanged after review agent run" (hash-before/hash-after) already verifies that the review agent cannot modify prior trace entries. S6 AC3 extends this to deliberate external tampering; S3 is the canonical source for the hash-comparison mechanism. See DL-002 in `decisions.md`. | Procedure documented in test plan and recorded in `verification/m6-test-results.md`. |
| AC4 (README 4-element check) has only a manual checklist. | AC4 | Manual-by-design | README content cannot be verified by TypeScript compiler or test runner. | Checklist in verification script with 4 explicit pass/fail items. |

---

## Test Data Strategy

**Source:** Real trace log produced by a completed loop run (S2–S4); the trace is the subject of both the legibility test and the tampering test.

**PCI/sensitivity in scope:** No — all trace content is synthetic (prototype only processes synthetic tasks).

**Availability:** Requires a completed loop run (S4 operational, full trace log exists). Non-engineer test participant must be arranged before starting S6.

**Owner:** The builder administers both manual tests; results committed to the `verification/` directory.

---

## Unit Tests

### `tsc --strict` — zero type errors after schema changes

- **Verifies:** AC5
- **Mechanism:** Run TypeScript compiler in strict mode on the full project: `npx tsc --strict --noEmit`. All three agent source files and `src/types/trace.ts` are in scope.
- **Action:** `npm run typecheck` (or `npx tsc --strict --noEmit` directly).
- **Expected result:** Exit code 0. Zero errors, zero warnings. If any agent file fails to conform to the updated `TraceEntry` or `AssuranceRecord` interface, the compiler reports the specific field name and file.
- **Pass condition:** `tsc --strict --noEmit` exits 0. This is the sole automated test for this story.

---

## Manual Test Protocol

### Protocol 1 — Non-engineer legibility test (AC1, AC2)

**Preconditions:**
- Full trace log exists from a completed loop run (3 entries: dev, review, assurance).
- Test participant identified: must be from a non-engineering background (risk, compliance, audit, or delivery). Must not have been briefed on the prototype's trace format.

**Step 1 — Prepare the test:**
1. Print or display the raw trace log file (JSON).
2. Provide no explanation — hand the file to the participant.

**Step 2 — Ask the three governance questions in order:**
1. Q1: "What policy governed the dev agent's decision?" (expected: skill name + version or prompt hash)
2. Q2: "How was compliance verified?" (expected: review agent read the trace and checked criteria completeness + hash match)
3. Q3: "Who or what made the assurance call?" (expected: assurance agent, cold-start, produced an assurance record)

**Step 3 — Record results in `verification/m5-test-results.md`:**
```
| participant-role    | <role of test participant, not name>     |
| trace-presented     | <path to trace log used>                 |
| Q1-answer           | <verbatim answer given>                  |
| Q1-ground-truth     | <correct answer>                         |
| Q1-result           | PASS / FAIL                              |
| Q2-answer           | <verbatim answer>                        |
| Q2-ground-truth     | <correct answer>                         |
| Q2-result           | PASS / FAIL                              |
| Q3-answer           | <verbatim answer>                        |
| Q3-ground-truth     | <correct answer>                         |
| Q3-result           | PASS / FAIL                              |
| overall-result      | PASS (all 3 correct) / FAIL              |
```

**AC2 blocking gate:** If Q1 is `FAIL`, the schema is revised immediately. Rename any field or rewrite any structure that caused Q1 to fail. Re-run the legibility test before marking this story done. Q1 failure is not advisory.

**Pass condition:** All three questions answered correctly. `overall-result: PASS`. File committed.

---

### Protocol 2 — Tamper-evidence test (AC3)

**Preconditions:**
- Full trace log with assurance record (3 entries) on disk.
- The tamper-evidence mechanism is documented (e.g. filesystem append-only semantics, or a hash chain).

**Step 1 — Establish pre-tamper state:**
1. Record the current state of the trace log (line count, last-modified time, SHA-256 of the file):
   ```
   node -e "const crypto = require('crypto'); const fs = require('fs'); console.log(crypto.createHash('sha256').update(fs.readFileSync('./trace.log')).digest('hex'))"
   ```

**Step 2 — Simulate tampering:**
1. Open the trace log in a text editor.
2. Locate the dev agent's entry.
3. Change one field value (e.g. change `decisionOutcome` from `"proceed"` to `"reject"` — simulating a post-hoc alteration).
4. Save the file.
5. Record: which field was changed, what value was used.

**Step 3 — Run the next assurance verification:**
1. Run the assurance agent in re-verification mode (or re-run it against the tampered trace log): `npx ts-node src/agents/assurance-agent.ts --traceFile ./trace.log`.
2. Observe the assurance record output.

**Step 4 — Confirm detectable inconsistency:**
- If the mechanism is a SHA-256 file hash: the file's hash no longer matches a stored pre-assurance hash. Record whether this is detected.
- If the mechanism is append-only filesystem semantics: the modification itself constitutes the inconsistency (the mechanism claims no modification is possible; the test demonstrates it can be detected by re-hashing the file).

**Step 5 — Record in `verification/m6-test-results.md`:**
```
| mechanism-used          | <description of mechanism>          |
| tampered-field          | <field name changed>                |
| tampered-value          | <new value used>                    |
| pre-tamper-hash         | <SHA-256 pre-tamper>                |
| post-tamper-hash        | <SHA-256 post-tamper>               |
| inconsistency-detected  | yes / no                            |
| detection-method        | <how inconsistency was identified>  |
| result                  | PASS / FAIL                         |
| mechanism-limitation    | <one sentence on what this doesn't protect against> |
```

**Pass condition:** Tampering produces a detectable change (hash change, or structural validation failure on re-run). Result recorded as `PASS`. Limitation documented honestly. File committed.

---

### Protocol 3 — README 4-element checklist (AC4)

**Steps:** Read the README's tamper-evidence section and confirm all 4 elements are present:

| Element | Present? |
|---------|---------|
| The specific mechanism used (e.g. "append-only file write mode") | ⬜ |
| What the mechanism protects against (e.g. "concurrent writes that would corrupt entry order") | ⬜ |
| What it does NOT protect against (e.g. "direct file editing after assurance record is written") | ⬜ |
| What next-phase production hardening looks like (e.g. "hash chaining, write-once storage, signed entries") | ⬜ |

**Pass condition:** All 4 elements checked. If any are absent, README is updated and re-checked.

---

## NFR Tests

### Field names are plain English without abbreviations

- **Verifies:** NFR (Accessibility)
- **Mechanism:** Read all field names in `src/types/trace.ts`. Flag any that use abbreviations, camelCase-truncations that change meaning (e.g. `algId` instead of `hashAlgorithm`), or require cross-referencing another document to understand.
- **Pass condition:** Zero fields require a glossary or abbreviation expansion to understand. `hashAlgorithm` not `hashAlg`; `agentIdentity` not `agentId`; etc.

### `verification/m5-test-results.md` and `verification/m6-test-results.md` are committed

- **Verifies:** NFR (Evidence, Integrity)
- **Mechanism:** `git status verification/m5-test-results.md verification/m6-test-results.md` shows both files tracked and clean.
- **Pass condition:** Both files committed.

---

## Out of Scope for this test plan

- Production-grade cryptographic tamper-evidence (hash chaining, signed entries) — prototype-level control only; explicitly deferred in discovery
- Internationalisation or accessibility of the trace format — out of scope for the prototype
- Automated legibility scoring — manual protocol is sufficient
