## AC Verification Script: Trace schema finalised — tamper-evidence and non-engineer legibility

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s6-trace-schema-tamper-evidence.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s6-trace-schema-tamper-evidence-test-plan.md`
**Verification author:** Copilot
**Date:** 2026-03-30

---

## Prerequisites

1. S2, S3, S4 complete — full trace log with three entries (dev, review, assurance record) exists on disk.
2. S5 complete (or in-progress) — injected-failure test results confirm the schema is machine-readable before the human-legibility test runs.
3. Non-engineer test participant arranged — must not have been briefed on the trace format.
4. `npm run typecheck` exits 0 before this story begins.

---

## Scenario 1 — AC5: TypeScript strict compilation passes with 0 errors

**Steps:**
1. Make any schema changes to `src/types/trace.ts` required by this story (field renaming for legibility, etc.).
2. Update all agent sources to conform to the revised interface.
3. Run: `npm run typecheck` (or `npx tsc --strict --noEmit`)
4. Confirm exit code 0 and no errors printed.

**Expected result:** Exit code 0. Zero errors. Zero warnings.

**Pass condition:** Clean compile. Any type error names the specific field and file — fix before proceeding to manual scenarios.

> **Run this scenario first.** The legibility test is run on a trace produced by correctly-compiling agents. Do not test legibility on output from agents with type errors.

---

## Scenario 2 — AC1 + AC2: Non-engineer legibility test

**Setup:** Full trace log on disk. Test participant present.

**Steps:**
1. Display or print the raw trace log (JSON), unformatted.
2. Hand it to the participant without explanation.
3. Ask each question in order, one at a time. Record the verbatim answer before asking the next question.
   - **Q1:** "What policy governed the dev agent's decision in this trace?"
   - **Q2:** "How was compliance with that policy verified?"
   - **Q3:** "Who or what made the final assurance call?"
4. Compare each answer to ground truth:
   - Q1 ground truth: the skill name and version (or prompt hash) visible in the trace
   - Q2 ground truth: review agent read the dev trace, checked criteria completeness, verified the hash independently
   - Q3 ground truth: assurance agent, running in isolation from the prior agents, produced the assurance record
5. Record all results in `verification/m5-test-results.md` per the test plan template.

**AC2 blocking gate:** If Q1 is wrong or unanswered, STOP. Do not proceed. Identify which field name or structure caused the confusion and revise `src/types/trace.ts` and/or the field naming. Re-run Scenario 1 after changes. Repeat this scenario with a fresh trace log.

**Pass condition:** All 3 questions answered correctly. `overall-result: PASS` in `verification/m5-test-results.md`.

---

## Scenario 3 — AC3: Tamper-evidence test

**Setup:** Full trace log on disk. Note its current SHA-256.

**Steps:**
1. Compute the pre-tamper hash:
   ```
   node -e "const crypto = require('crypto'); const fs = require('fs'); const h = crypto.createHash('sha256').update(fs.readFileSync('./trace.log')).digest('hex'); console.log('pre-tamper:', h)"
   ```
2. Open `trace.log` in a text editor. Find the dev agent's entry. Change `decisionOutcome` from `"proceed"` to `"reject"`. Save.
3. Compute the post-tamper hash:
   ```
   node -e "const crypto = require('crypto'); const fs = require('fs'); const h = crypto.createHash('sha256').update(fs.readFileSync('./trace.log')).digest('hex'); console.log('post-tamper:', h)"
   ```
4. Confirm the two hashes differ.
5. Run the assurance agent against the tampered file:
   `npx ts-node src/agents/assurance-agent.ts --traceFile ./trace.log`
6. Observe whether the assurance record flags the inconsistency.
7. Record the full procedure and result in `verification/m6-test-results.md`.
8. **Restore** the trace log to its original state after the test (copy the original back).

**Pass condition:** Post-tamper hash differs from pre-tamper hash (modification is detectable by re-hashing). Result recorded in `verification/m6-test-results.md` as `PASS`. Limitation documented in the same file.

---

## Scenario 4 — AC4: README tamper-evidence 4-element checklist

**Steps:** Read the README's tamper-evidence section. Tick each element:

| Element | Present? |
|---------|---------|
| 1. Specific mechanism used | ⬜ |
| 2. What it protects against | ⬜ |
| 3. What it does NOT protect against | ⬜ |
| 4. Next-phase production hardening path | ⬜ |

**Pass condition:** All 4 elements present. If any are missing, update the README and re-check.

---

## Scenario 5 — NFR: Evidence files committed

**Steps:**
1. `git status verification/m5-test-results.md` — confirm tracked and clean.
2. `git status verification/m6-test-results.md` — confirm tracked and clean.

**Pass condition:** Both files committed. If not: `git add verification/m5-test-results.md verification/m6-test-results.md && git commit -m "chore: add M5 and M6 test results"`.

---

## Summary

| Scenario | AC | Pass condition | Status |
|----------|----|----------------|--------|
| 1 | AC5 | `tsc --strict --noEmit` exits 0 | ⬜ |
| 2 | AC1, AC2 | Non-engineer answers all 3 questions; Q1 is blocking if wrong | ⬜ |
| 3 | AC3 | Tampered hash differs; inconsistency detectable; result in m6-test-results.md | ⬜ |
| 4 | AC4 | README 4-element checklist all present | ⬜ |
| 5 | NFR | m5-test-results.md and m6-test-results.md committed | ⬜ |
