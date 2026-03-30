# AC Verification Script: Assurance agent runs cold-start, validates both traces, confirms hashes, emits assurance record

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s4-assurance-agent-cold-start.md`
**Technical test plan:** `artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s4-assurance-agent-cold-start-test-plan.md`
**Script version:** 1
**Verified by:** ____________ | **Date:** ____________ | **Context:** [ ] Pre-code  [ ] Post-merge  [ ] Demo

---

## Setup

**Before you start:**
1. S1, S2, and S3 are complete — the dev agent, review agent, and assurance agent
   scripts all exist and the prior stories' tests pass.
2. Run `docker compose up` to start Mission Control.
3. Create a new task in the Mission Control Inbox column (give it any title — e.g.
   "Add health check endpoint").
4. Run the dev agent script (`npm run agent:dev`). Confirm the task moves to the
   Review column and a trace log file appears (e.g. `trace.log`).
5. Run the review agent script (`npm run agent:review`). Confirm the task moves to
   the Quality Review column and a second entry appears in `trace.log`.
6. You now have two trace entries in the log and a task in Quality Review. This is the
   starting state for every scenario below.

**Reset between scenarios:** Delete `trace.log` and reset the task to Inbox by
repeating steps 3–5 above. Do not re-run the assurance agent between scenarios.

---

## Scenarios

---

### Scenario 1: Assurance agent reads only from the trace file — not from any prior session

**Covers:** AC1 — agent reads trace log from filesystem only, not from session context

**Why this matters:** The governance claim depends on the assurance agent being
genuinely independent. If it can silently inherit context from the dev or review agent
sessions, the independence guarantee is asserted rather than verified. This scenario
checks that the assurance agent has no other information source.

**Steps:**
1. Open a brand new terminal window. Do not reuse the terminal where you ran the dev
   or review agent scripts.
2. In the new terminal, run the assurance agent script: `npm run agent:assurance`.
3. Open `trace.log` in a text editor.

**Expected outcome:**
> The file now contains three entries. The third entry shows `"agentIdentity": "assurance"`.
> There are no errors or warnings in the terminal output.
> The assurance agent produced its record using only the two entries already in the
> file — you did not need to take any action in the agent's terminal beyond running
> the script.

**Result:** [ ] Pass  [ ] Fail
**Notes:**

---

### Scenario 2: Assurance agent independently recomputes the dev agent's hash

**Covers:** AC2 — independent SHA-256 of `feature-dev` SKILL.md; `dev-hash-match` recorded explicitly

**Steps:**
1. Open `trace.log`. Find the first entry (`agentIdentity: "dev"`). Copy the value
   of the `promptHash` field (a long string of letters and numbers).
2. Open a terminal and run: `node -e "const c=require('crypto'),f=require('fs'); console.log(c.createHash('sha256').update(f.readFileSync(require('./skills-registry.json')['feature-dev'])).digest('hex'))"`
   — this independently computes the SHA-256 of the `feature-dev` skill file.
3. Compare the printed hash to the one you copied from the dev trace entry.
4. Open the third entry in `trace.log` (`agentIdentity: "assurance"`). Find the
   field `devHashMatch`.

**Expected outcome:**
> The hash you computed in step 2 matches the hash from the dev trace entry exactly
> (same characters, same length — no differences).
>
> In the assurance record (third entry), `devHashMatch` is `true`.
> The field is present and explicit — not absent or inferred.

**Result:** [ ] Pass  [ ] Fail
**Notes:**

---

### Scenario 3: Assurance agent independently recomputes the review agent's hash

**Covers:** AC3 — independent hash of `feature-review` SKILL.md; review agent's own `hash-match` result re-confirmed

**Steps:**
1. Open `trace.log`. Find the second entry (`agentIdentity: "review"`). Copy its
   `promptHash` value.
2. Run: `node -e "const c=require('crypto'),f=require('fs'); console.log(c.createHash('sha256').update(f.readFileSync(require('./skills-registry.json')['feature-review'])).digest('hex'))"`
3. Compare the printed hash to the one copied from the review trace entry.
4. In the assurance record (third entry), find `reviewHashMatch`.
5. In the review trace entry (second entry), find the `hashMatch` field (this is the
   review agent's own record of whether the dev hash matched). In the assurance
   record, find the field that records the assurance agent's own check of that value.

**Expected outcome:**
> The independently computed hash matches the review trace entry's `promptHash` exactly.
>
> In the assurance record: `reviewHashMatch` is `true`.
> The assurance record also records whether the review agent's own `hashMatch` result
> was confirmed — this field is present and explicitly `true`.

**Result:** [ ] Pass  [ ] Fail
**Notes:**

---

### Scenario 4: Assurance record contains all required fields and task moves to Done

**Covers:** AC4 — complete assurance record emitted; task moves to Done in Mission Control

**Steps:**
1. Open `trace.log` and read the third entry (the assurance record) in full.
2. Check that each of the following fields is present with a non-empty value:
   - `agentIdentity` (should be `"assurance"`)
   - `skillName` (should name the `feature-assurance` skill)
   - `skillVersion`
   - `promptHash` (a SHA-256 hex string)
   - `devHashMatch`
   - `reviewHashMatch`
   - `criteriaOutcomes` (a list — may be empty if no individual criteria are evaluated, but the field must be present)
   - `verdict` (should be `"closed"` on a clean run)
   - `timestamp` (an ISO 8601 date string — looks like `2026-03-30T...`)
3. Open Mission Control in your browser. Find the task you created in Setup step 3.

**Expected outcome:**
> All nine fields listed above are present and non-empty in the assurance record.
> The task is in the Done column in Mission Control — not Quality Review, not any
> other column.

**Result:** [ ] Pass  [ ] Fail
**Notes:**

---

### Scenario 5: Cold-start independence mechanism is documented and verifiable 🟡

**Covers:** AC5 — verifiable cold-start independence mechanism documented in README

*🟡 This scenario is manual-only. It cannot be fully verified by automated tests
until the cold-start mechanism is finalised (see Decisions Gate in story artefact).
Do not skip this scenario at post-merge smoke test time.*

**Steps:**
1. Open the project README.
2. Find the section describing cold-start independence (it should be a named section,
   not buried in a paragraph).
3. Read the description. Without looking at the source code, write down: in one
   sentence, what prevents the assurance agent from sharing state with the dev and
   review agents?
4. Now look at the relevant source file (ask the builder which file if you are
   unsure). Check that the mechanism described in the README corresponds to something
   you can see in the code — it should not require you to trust an assertion.
5. Ask yourself: if I were a sceptical regulator, would I accept this as evidence of
   independence, or would I need more?

**Expected outcome:**
> Step 3: You were able to write a one-sentence description without help. If you
> could not, the README is not specific enough — record as a finding.
>
> Step 4: The mechanism described matches something observable in the code or
> invocation pattern — not just a policy statement.
>
> Step 5: Your honest assessment is: "yes, this is evidence, not assertion" — or
> note what additional evidence would be needed.

**Result:** [ ] Pass  [ ] Fail  [ ] Partial (finding noted below)
**Notes:**

---

### Scenario 6 (gap): What happens when a hash does not match

**Covers:** Design-level gap scenario — confirms the assurance agent escalates rather than silently passing on a hash mismatch

*This scenario does not test a specific AC in isolation — it tests the behaviour
that AC4 escalate path and AC5's hash-mismatch edge case together describe. It is
included here because it is the most important failure mode of the governance loop.*

**Steps:**
1. Make a note of the current content of `trace.log`.
2. Open `trace.log` in a text editor. In the dev trace entry (`agentIdentity: "dev"`),
   change one character in the `promptHash` field (e.g. change the first character
   from `a` to `b`). Save the file.
3. Run the assurance agent: `npm run agent:assurance`.
4. Open `trace.log` and read the new (fourth) assurance record entry.
5. Check the Mission Control board.

**Expected outcome:**
> The assurance record shows `devHashMatch: false`.
> The `verdict` field is `"escalate"` — not `"closed"`.
> The findings list is non-empty and names the hash mismatch as the reason.
> The task has NOT been moved to Done — it remains in Quality Review (or is flagged
> for human review, per the story out-of-scope note: escalate verdict is recorded
> but triggers no notification).

**Result:** [ ] Pass  [ ] Fail
**Notes:**

---

## Summary

**Scenarios completed:** _____ / 6
**Failures or findings:** ___________________
**Overall result:** [ ] Pass  [ ] Fail  [ ] Pass with findings
**Sign-off:** ____________ | **Date:** ____________
