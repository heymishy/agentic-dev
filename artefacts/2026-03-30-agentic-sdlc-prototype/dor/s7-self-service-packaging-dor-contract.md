# Contract Proposal — Self-service packaging — Docker Compose, README, 30-minute bar validated

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s7-self-service-packaging.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## What will be built

- `README.md` — complete self-service instruction set structured as numbered sequential steps;
  each step is a command or action followed by "You should see: [exact or representative output]";
  sections: Prerequisites, Start the system, Create a task, Run the three agents, Read the audit
  trail, Cold-start independence (one plain-English paragraph per S4 AC5 + ADR-001), Audit trail
  integrity (tamper-evidence reference per S6 AC4)
- Finalised `docker-compose.yml` — verified that a single `docker compose up` starts Mission
  Control and all runtime dependencies; no additional manual steps required after clone
  (beyond Docker and Git as prerequisites)
- `verification/m4-dry-run-results.md` — dry-run execution results: participant role, start time,
  end time, elapsed time, assistance requests (each with question asked and README fix applied),
  final pass/fail

## What will NOT be built

- CI/CD pipeline or automated deployment — excluded per discovery out-of-scope item 6
- Multi-OS (Windows/Mac/Linux) variant documentation — prototype targets the builder's primary
  environment; cross-OS variation is next-phase
- Automated README link checking or linting
- Presentation materials or guided demo scripts — the prototype is self-demonstrating

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 | Manual dry run: uninitiated participant clones repo, follows README; Mission Control running within first 3 steps with no manual dependency resolution | Manual dry run |
| AC2 | Manual dry run: participant follows agent invocation steps; task in Done, 3-entry trace log produced, no deviations | Manual dry run |
| AC3 | Manual dry run: participant reads trace log as directed; answers all 3 governance questions using only trace + README | Manual dry run |
| AC4 | Manual dry run: record elapsed time; confirm ≤ 30 minutes and ≤ 2 assistance requests | Manual dry run timing |
| AC5 | If > 2 requests: identify specific README defect per request, fix, re-run dry run until ≤ 2 requests | Manual iteration gate |

## Assumptions

- S1–S6 are all complete with no open defects before this story begins
- Finalized trace schema (S6) is the schema used in the README's "read the audit trail" section
- Cold-start independence README paragraph from S4 is already drafted; this story incorporates
  it into the sequential instruction set
- S6 tamper-evidence README description is already drafted; this story incorporates it
- Dry-run participant is available and uninitiated (has not seen the prototype before the run)

## Estimated touch points

**Files created:**
- `README.md` (greenfield or replacing a placeholder)
- `verification/m4-dry-run-results.md`

**Files modified:**
- `docker-compose.yml` (confirmed or finalized)

**Services:** Full prototype stack (Mission Control + all 3 agents) run end-to-end

---

## Contract review result

✅ **Contract review passed** — proposed implementation aligns with all 5 ACs.  
S6 AC4 and S4 AC5 pre-requisite gate noted: README cannot be finalised until schema
is finalised (S6) and cold-start mechanism is documented (S4). Both gates are closed.
