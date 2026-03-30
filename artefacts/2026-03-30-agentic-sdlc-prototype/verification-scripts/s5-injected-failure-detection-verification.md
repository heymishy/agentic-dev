## AC Verification Script: Assurance agent detects injected criterion failure (and passes clean run)

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s5-injected-failure-detection.md`
**Test plan reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s5-injected-failure-detection-test-plan.md`
**Verification author:** Copilot
**Date:** 2026-03-30

---

## Prerequisites

1. S4 is complete — assurance agent accepts `--traceFile` path argument and produces an assurance record.
2. A valid trace log exists from a completed loop run (dev + review + assurance entries).
3. `verification/` directory exists in the repository root.
4. The builder has access to a second person for the AC5 legibility check (or can revisit cold after 24 hours).

---

## Scenario 1 — AC1 + AC2: Injected-failure test

**Setup:** Copy an existing valid trace log to `verification/injected-failure-trace.json`.

**Steps:**
1. Open `verification/injected-failure-trace.json` and locate the dev agent's `criteriaResults` array.
2. Find one criterion with `result: "pass"`.
3. Change that criterion's `result` to `"fail"`. Do not modify any other field. Save the file.
4. Record the criterion text word-for-word — you will need it for the results file.
5. Run: `npx ts-node src/agents/assurance-agent.ts --traceFile verification/injected-failure-trace.json`
6. Open the resulting assurance record from the output or trace log.
7. Read the `verdict` field.
8. Read the `criteriaOutcomes` field — confirm it names the injected criterion explicitly.
9. Write the following to `verification/m3-test-results.md`:

```
| test-name           | injected-failure                           |
| injected-criterion  | <exact criterion text from Step 4>         |
| trace-file-used     | verification/injected-failure-trace.json   |
| assurance-verdict   | <actual value from assurance record>       |
| expected-verdict    | escalate                                   |
| criterion-named     | <yes/no — did criteriaOutcomes name the injected criterion?> |
| result              | PASS / FAIL                                |
```

**Expected result:** Assurance verdict is `escalate`. `criteriaOutcomes` names the injected criterion. No other criteria are flagged incorrectly.

**Pass condition:** `verdict: "escalate"`, criterion explicitly named in `criteriaOutcomes`. Record written as `PASS`.

**Blocking defect:** If verdict is `closed` (false negative), the assurance agent's detection logic has a defect — raise against S4 before this story can pass. If verdict is `escalate` but `criteriaOutcomes` is empty or generic, AC1 fails (criterion must be identified, not just detected).

---

## Scenario 2 — AC3 + AC4: Clean-run test

**Setup:** Mission Control running via Docker Compose. New task in Inbox.

**Steps:**
1. Create a new task in Mission Control Inbox. Record the task ID.
2. Run the full three-agent sequence:
   - `npx ts-node src/agents/dev-agent.ts --taskId <id>`
   - `npx ts-node src/agents/review-agent.ts --taskId <id>`
   - `npx ts-node src/agents/assurance-agent.ts --taskId <id>`
3. Confirm the task reached `Done` in Mission Control.
4. Open the trace log. Locate the assurance record for this run.
5. Read the `verdict` and `criteriaOutcomes` fields.
6. Append the following to `verification/m3-test-results.md`:

```
| test-name           | clean-run                            |
| trace-used          | <trace log path, timestamp of run>   |
| assurance-verdict   | <actual value>                       |
| expected-verdict    | closed                               |
| findings            | <contents of criteriaOutcomes — "none" if empty> |
| result              | PASS / FAIL                          |
```

**Expected result:** Verdict is `closed`. `criteriaOutcomes` is empty or contains no findings. Task is in `Done`.

**Pass condition:** `verdict: "closed"`. `criteriaOutcomes` has no findings. Record written as `PASS`.

**Blocking defect:** If verdict is `escalate` on a clean trace (false positive), the assurance agent is miscalibrated — raise against S4.

---

## Scenario 3 — AC5: Legibility check — `m3-test-results.md` is self-interpreting

**Setup:** `verification/m3-test-results.md` is complete with both test results from Scenarios 1 and 2.

**Steps:**
1. Give `verification/m3-test-results.md` to a second person (or return to it yourself after 24 hours without context).
2. Ask them to read only the file — no verbal briefing.
3. Ask: (a) which criterion was injected? (b) what did the assurance agent conclude for the injected-failure test? (c) what did it conclude for the clean run? (d) did both tests pass?

**Expected result:** All four questions answered correctly from the file alone. No follow-up questions asked.

**Pass condition:** 4/4 correct. If any question is unanswered or wrong, identify which field in the results file was missing or unclear and update it; repeat the legibility check.

---

## Scenario 4 — NFR: Results file is committed

**Steps:**
1. Run: `git status verification/m3-test-results.md`
2. Confirm the file is tracked and the working tree is clean (committed, not modified).

**Pass condition:** `git status` shows the file is tracked and up to date. If not committed, commit it: `git add verification/m3-test-results.md && git commit -m "chore: add M3 test results"`.

---

## Summary

| Scenario | AC | Pass condition | Status |
|----------|----|----------------|--------|
| 1 | AC1, AC2 | Verdict `escalate`, criterion named in outcomes, record written as PASS | ⬜ |
| 2 | AC3, AC4 | Verdict `closed`, no findings, record written as PASS | ⬜ |
| 3 | AC5 | Legibility check — 4/4 questions answered from file alone | ⬜ |
| 4 | NFR | `verification/m3-test-results.md` committed to repository | ⬜ |
