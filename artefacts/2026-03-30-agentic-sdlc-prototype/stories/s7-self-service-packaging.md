# Story: Self-service packaging — Docker Compose, README, 30-minute bar validated

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/verification-and-demonstrability.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As a **delivery and programme manager**,
I want to clone the prototype repository, follow only the README, run the system, create
a task, trigger the three-agent loop, and read a complete audit trail — with no
assistance, in under 30 minutes, with no more than 2 clarifying questions needed —
So that I can independently verify the governance model is embedded in the running
system rather than described alongside it: if the system requires explanation to
demonstrate that governance works, the governance is not embedded — which is exactly
the problem the prototype was built to solve, directly satisfying M4 (30-minute
self-service bar).

## Benefit Linkage

**Metric moved:** M4 — Time to complete audit trail — uninitiated person
**How:** This story packages the proven governance loop (S1–S4), verification tests
(S5), and finalised trace schema (S6) into a form that an uninitiated person can
operate independently. Without this story, the prototype requires a guided walkthrough.
With it, the prototype is self-demonstrating — which is the governance claim itself
made operational.

## Architecture Constraints

- `docker compose up` must be the single command that starts Mission Control and all
  runtime dependencies — no manual dependency installation steps after clone (beyond
  Docker itself, which is a prerequisite, not a step)
- Agent invocation scripts must be documented with exact commands including expected
  output — the reader must be able to confirm each step completed correctly without
  engineering knowledge
- README must be structured in strict sequential steps with explicit success criteria
  per step — not prose; each step is a command or action followed by "you should see:
  [exact or representative output]"
- The README must document the cold-start independence mechanism (from S4 AC5) in
  plain language — one paragraph, no code, readable by a non-engineer
- The README must contain the tamper-evidence description from S6 AC4 — verbatim
  or summarised, with a reference to the full description
- TypeScript strict mode (discovery constraint)
- No external system connections at runtime; fully runnable on a personal machine
  with only Docker and Git as prerequisites (discovery constraint)
- Fully open / publicly shareable (discovery constraint)

## Dependencies

- **Upstream:** S1–S6 must all be complete — this story packages what they produced;
  it cannot produce a valid self-service experience if any prior story has open defects
- **Downstream:** None — this is the final story; after it, the prototype is ready for
  external demonstration (MM1 measurement)

## Acceptance Criteria

**AC1:** Given a machine with only Git and Docker installed (no prior knowledge of the
  prototype), When a person who has never seen the prototype clones the repository and
  follows the README from the beginning, Then they reach a running Mission Control
  instance within the first 3 README steps with no manual dependency resolution.

**AC2:** Given the system is running, When the uninitiated person follows the README
  instructions to create a task and sequentially invoke the three agent scripts, Then
  the task moves to Done in Mission Control and a trace log containing three entries
  is produced — all by following the documented steps without any deviation.

**AC3:** Given the trace log exists, When the uninitiated person reads it as directed
  by the README, Then they can answer all three governance questions (what policy, how
  verified, who made the assurance call) using only the trace log and the README —
  without asking for help.

**AC4:** Given the dry-run has completed (AC1–AC3), When the elapsed time is recorded,
  Then the total time from `git clone` to reading a complete audit trail is under 30
  minutes — and the number of assistance requests made during the run is no more than 2.

**AC5:** Given more than 2 assistance requests were made during the dry run (blocking
  defect threshold), When each request is reviewed, Then a specific README defect is
  identified for each one (missing step, ambiguous instruction, missing expected
  output) and the README is updated before the dry run is repeated — the story does
  not pass until a complete dry run is done with 2 or fewer requests.

## Out of Scope

- Automated README testing or link checking — manual dry-run protocol is sufficient
  for the prototype
- Onboarding for multiple operating systems beyond the builder's primary environment
  — the prototype targets a personal machine with Docker; Windows/Mac/Linux variation
  is a next-phase concern
- CI/CD pipeline or automated deployment — excluded per discovery out-of-scope item 6
- Presentation materials, slide decks, or guided demo scripts — the prototype is
  self-demonstrating; guided materials would undermine the governance claim

## NFRs

- **Evidence:** Dry-run results must be recorded and committed to
  `verification/m4-dry-run-results.md`: participant role, start time, end time,
  elapsed time, assistance requests (each with the question asked and the README
  fix applied), final pass/fail
- **Reproducibility:** The README must be the complete and sole instruction set —
  no verbal supplements, no wiki page, no separate setup guide
- **Security:** No credentials, tokens, or organisational data anywhere in the
  repository; all content publicly shareable

## Complexity Rating

**Rating:** 1
**Scope stability:** Stable — the packaging work is well-scoped given completed S1–S6.
The only risk is README quality: a README that seems clear to the builder may be
opaque to an uninitiated reader. The dry-run protocol with a real participant is the
only valid test — do not substitute self-assessment.
