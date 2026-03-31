# Story: Trace schema finalised — tamper-evidence and non-engineer legibility

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/verification-and-demonstrability.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As an **external regulator**,
I want the trace log to answer three specific questions without requiring a technical
interpreter — what policy governed this decision, how was compliance verified, and who
or what made the assurance call — and to be structured so that entries written before
the assurance record cannot be silently modified after the fact,
So that the audit trail is genuinely self-interpreting and tamper-evident: a reader
from risk, compliance, or audit can open the trace log and independently reconstruct
the governance record without assistance, and the integrity of that record is
mechanically supported rather than only asserted, directly satisfying M5 (trace
self-interpreting) and M6 (trace integrity / tamper-evidence).

## Benefit Linkage

**Metric moved:** M5 — Trace log is self-interpreting to a non-engineer reader; M6 —
Trace log integrity / tamper-evidence
**How:** The trace schema and field naming established in S2–S4 are functional but not
yet validated for legibility. This story finalises the schema by applying the M5 test
(non-engineer reader answers three questions) and adds the M6 tamper-evidence
mechanism. Without this story, the trace log is a log file; after it, the trace log
is an audit trail.

## Architecture Constraints

- TypeScript strict mode; `src/types/trace.ts` is updated in this story with any
  schema changes — all agents must be updated to conform to the revised interface;
  no breaking changes that invalidate prior trace entries
- Tamper-evidence mechanism scope: the prototype uses filesystem-level append-only
  semantics as the baseline; the mechanism chosen must be: (a) documented explicitly
  in the README, (b) verifiable without running the prototype (inspectable), and (c)
  acknowledged as a prototype-level control (not a production-grade cryptographic
  guarantee) — this distinction must appear in the README so a sceptical auditor
  sees it rather than discovers it
- Field naming in the trace must use plain English labels readable without a
  data dictionary — no internal abbreviations, no technical jargon in field names,
  no fields that require cross-referencing another document to interpret
- The three questions (what policy, how verified, who made the call) must be
  answerable from a single trace entry in sequence — a reader must not need to
  cross-reference multiple entries to reconstruct a single decision's governance record
- No external system connections; no credentials in code (discovery constraint)

## Dependencies

- **Upstream:** S2, S3, S4 must be complete — this story finalises the schema those
  stories established; it cannot run until the trace entries from all three agents exist
  and can be read by a test participant
- **Upstream:** S5 should be complete or in-progress — the injected-failure test
  results (S5) implicitly validate that the schema is machine-readable; S6's
  non-engineer legibility test validates it is human-readable; both should be done
  before external demonstration
- **Downstream:** S7 (packaging) depends on the finalised trace schema; the README
  produced in S7 references the trace format established here

## Acceptance Criteria

**AC1:** Given the complete trace log from a full agent loop run (three entries: dev,
  review, assurance), When at least one person from a non-engineering background (risk,
  compliance, audit, or delivery) reads the raw trace log file without any briefing or
  technical interpretation, Then they can write correct answers to all three questions:
  (1) what policy governed the dev agent's decision, (2) how was compliance verified,
  (3) who or what made the assurance call — answers judged against ground truth.

**AC2:** Given the non-engineer reader test from AC1, When Q1 ("what policy governed
  this decision") produces an incorrect or unanswered response, Then this is a blocking
  defect — the story does not pass regardless of Q2 and Q3 results; the trace field
  names and structure are revised and the test is repeated.

**AC3:** Given the trace log contains entries from all three agents, When a prior trace
  entry (dev or review) is modified after the assurance record has been written —
  including modifications to field values within the `criteriaResults` array (e.g.,
  changing `result: "fail"` to `result: "pass"` for a specific criterion) — Then the
  modification is either blocked by the mechanism or produces a detectable inconsistency
  that is identified during the next assurance verification run. The tamper-evidence
  mechanism must address `criteriaResults` integrity explicitly, not only trace-level
  structural changes. See DL-010.

**AC4:** Given the tamper-evidence mechanism has been tested per AC3, When the
  mechanism and its limitations are described in the README, Then the description
  states: the specific mechanism used, what it protects against, what it does not
  protect against, and what the next-phase production hardening looks like — all four
  elements present.

**AC5:** Given the schema has been finalised through this story's changes, When the
  TypeScript compiler runs on the project with strict mode, Then there are no type
  errors — all agents conform to the updated `src/types/trace.ts` interface.

## Out of Scope

- Production-grade cryptographic tamper-evidence (hash chaining, signed log entries,
  write-once storage) — explicitly deferred per discovery out-of-scope item 3;
  filesystem append-only semantics are the prototype-level control
- Internationalisation or accessibility of the trace format — out of scope for this
  prototype entirely
- Automated legibility scoring — the non-engineer reader test is a manual protocol;
  automation is a next-phase concern

## NFRs

- **Accessibility:** Trace field names must not require a glossary — plain English,
  full words, no abbreviations
- **Evidence:** The non-engineer reader test results must be recorded (test participant
  role, questions asked, answers given, ground-truth comparison, pass/fail per
  question) and committed to `verification/m5-test-results.md`
- **Integrity:** The tamper-evidence test procedure and results must be committed to
  `verification/m6-test-results.md`

## Complexity Rating

**Rating:** 2
**Scope stability:** Stable — schema changes and legibility improvements are
well-scoped. The unknown is the non-engineer reader test: if the test participant is
not available before S7 is complete, the external demonstration cannot proceed (M5
blocking on Q1 is a hard gate). Arrange the test participant before starting this
story.
