## Test Plan: Self-service packaging — Docker Compose, README, 30-minute bar validated

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s7-self-service-packaging.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/verification-and-demonstrability.md`
**Test plan author:** Copilot
**Date:** 2026-03-30

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Repo cloned → running Mission Control in ≤3 README steps (no manual dep resolution beyond Docker) | — | 1 | — | 1 | Manual-by-design (dry-run) | 🟡 |
| AC2 | Uninitiated person creates task, runs all 3 agents, task reaches Done and trace log has 3 entries — following README only | — | — | — | 1 | Manual-by-design | 🟡 |
| AC3 | Trace readable per README direction → all 3 governance questions answered without assistance | — | — | — | 1 | Manual-by-design | 🟡 |
| AC4 | Total time from `git clone` to completing audit trail ≤30 minutes; ≤2 assistance requests | — | — | — | 1 | Manual-by-design | 🟡 |
| AC5 | >2 assistance requests → README defect identified and fixed per request; dry run repeated until ≤2 | — | — | — | 1 | Manual-by-design | 🟡 |

---

## Coverage gaps

| Gap | AC | Gap type | Reason | Handling |
|-----|----|----------|--------|---------|
| All ACs are validated by a manual dry-run. There is no automated test that can replicate "uninitiated person following README". | ALL | Manual-by-design | The story's governance claim is that the prototype is self-demonstrating. The only valid test is a person who has never seen the prototype running it from scratch. | Automated Docker Compose health check verifies the technical starting condition. The dry-run with a real participant is the AC gate. |
| AC4's 30-minute threshold cannot be measured without a real participant and a clock. | AC4 | Manual-by-design | Self-assessment by the builder is not a valid substitute — the builder already knows the prototype. | The dry-run participant records start and end times. Results committed to `verification/m4-dry-run-results.md`. |

---

## Test Data Strategy

**Source:** Real system from scratch — the dry-run participant clones the repo fresh; no pre-existing state used.

**PCI/sensitivity in scope:** No — all tasks and trace data are synthetic; no real credentials or org data at any point.

**Availability:** Requires a dry-run participant (cannot be the builder). Must be arranged before S7 is started.

**Owner:** Builder administers the dry run and records results. Participant drives the session.

---

## Integration Tests

### Docker Compose health check — Mission Control is reachable after `docker compose up`

- **Verifies:** AC1 (technical precondition — `docker compose up` starts the system)
- **Tag:** `@integration`
- **Precondition:** Docker is installed and running on the test machine.
- **Action:** Run `docker compose up -d` from the repository root. After 10 seconds, issue an HTTP GET to Mission Control's health endpoint (`http://localhost:<PORT>/api/health` or equivalent).
- **Expected result:** `docker compose up -d` exits 0. Health endpoint returns 200 OK within 10 seconds of `up` completing.
- **Pass condition:** Health check returns 200 within the timeout. This is the sole automated test for S7 — it validates the `docker compose up` step works before the dry run is attempted.
- **Edge case:** No — happy path only. If this fails, Docker Compose configuration is broken; fix before running the dry run.

---

## Manual Test Protocol

### Protocol 1 — Full dry-run (all ACs)

**Preconditions:**
- S1–S6 are complete with no open defects.
- A dry-run participant is identified (non-builder; may have technical background but must not have seen this prototype before).
- A fresh machine (or Docker Desktop + Git only, no Node.js pre-installed is ideal but not required if README documents the Node requirement).
- A clock or timer is available (participant will record start time at `git clone` step).

**Step 1 — Start the clock at `git clone`:**
1. Participant records the start time.
2. Participant runs `git clone <repo-url>` and `cd <repo>`.

**Step 2 — Follow the README from the beginning:**
1. Participant reads and executes each README step in sequence.
2. They must not ask for help unless genuinely blocked (confused by an instruction, receiving an unexpected error, or missing a required pre-condition).
3. Each assistance request is counted. The builder records: the question asked, the step it references, and the README fix applied.

> **Assistance request threshold:** 2 or fewer = story PASS candidate. 3 or more = README has defects; each request becomes a specific fix; dry run is repeated.

**Step 3 — Verify AC1:** Participant reaches a running Mission Control instance. Count the README steps required to get there. Must be 3 or fewer from `git clone`.

**Step 4 — Verify AC2:** Participant creates a task and runs all 3 agent scripts following README instructions. After running, confirm: task is in Done column; `trace.log` (or equivalent) exists and has 3 entries.

**Step 5 — Verify AC3:** Participant reads the trace log as directed by the README. Builder asks the 3 governance questions:
- Q1: What policy governed the dev agent's decision?
- Q2: How was compliance verified?
- Q3: Who or what made the assurance call?

All 3 must be answered correctly using the trace log and README only.

**Step 6 — Stop the clock:** Participant records end time after completing AC3. Calculate elapsed time. Must be ≤30 minutes.

**Step 7 — Record results in `verification/m4-dry-run-results.md`:**
```
| participant-role        | <role, not name>                     |
| start-time              | <HH:MM>                              |
| end-time                | <HH:MM>                              |
| elapsed-minutes         | <number>                             |
| ac1-steps-to-running    | <count of README steps to reach running MC> |
| ac2-task-reached-done   | yes / no                             |
| ac2-trace-entries       | <count of entries in trace log>      |
| ac3-q1-result           | PASS / FAIL                          |
| ac3-q2-result           | PASS / FAIL                          |
| ac3-q3-result           | PASS / FAIL                          |
| assistance-requests     | <count>                              |
| assistance-details      | <for each request: question asked + README fix applied> |
| overall-result          | PASS / FAIL                          |
```

**Pass condition:**
- AC1: ≤3 steps to running Mission Control
- AC2: Task in Done, trace has 3 entries
- AC3: All 3 governance questions answered correctly
- AC4: Elapsed time ≤30 minutes
- AC5: Assistance requests ≤2 (or all requests have README fixes applied and dry run is repeated)
- `verification/m4-dry-run-results.md` committed

---

## NFR Tests

### No credentials or org data anywhere in repository

- **Verifies:** NFR (Security)
- **Mechanism:** Run a grep over the entire repository for credential patterns before the dry run:
  ```
  grep -r "Bearer\|sk-\|password\|secret\|token" --include="*.ts" --include="*.json" --include="*.md" --include="*.yml" .
  ```
  Exclude `node_modules/` and `.git/`.
- **Pass condition:** Zero matches except in test fixture files where the word "secret" appears as a test pattern name (not a real credential). If any real credential pattern is found, remove it before the dry run.

### README is the complete and sole instruction set

- **Verifies:** NFR (Reproducibility)
- **Mechanism:** Confirm there is no other setup guide (no `SETUP.md`, no wiki link, no separate `getting-started.md`). The README is the one document a participant would reach from `git clone`.
- **Pass condition:** No supplementary setup document exists. README alone is sufficient.

---

## Out of Scope for this test plan

- Automated README testing or link checking — manual dry run is sufficient for the prototype
- Multi-OS testing (Windows/Mac/Linux differences) — builder's primary machine only for the prototype
- CI/CD pipeline or automated deployment — excluded per discovery out-of-scope item 6
- Presentation materials — the prototype is self-demonstrating; guided materials are out of scope
