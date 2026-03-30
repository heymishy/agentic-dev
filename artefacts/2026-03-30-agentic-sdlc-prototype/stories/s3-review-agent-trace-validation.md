# Story: Review agent validates dev trace and emits its own trace

**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`

## User Story

As an **internal auditor**,
I want the review agent to load the `feature-review` skill, read the dev agent's trace
entry, validate that every criterion was checked and every result was recorded, verify
that the prompt hash in the trace resolves to the currently registered `feature-dev`
skill version on disk, and emit its own trace entry — without re-executing or
re-evaluating the implementation work itself,
So that the audit record proves the governance record was independently verified, not
just that the work was done — distinguishing review-as-audit from review-as-repetition,
and directly advancing M2 (per-decision traceability) for the review leg of the loop.

## Benefit Linkage

**Metric moved:** M2 — Per-decision traceability to versioned skill
**How:** After this story, a second trace entry exists, governed by the `feature-review`
skill, containing its own prompt hash. M2 now requires 100% of three trace entries to
contain all required fields; this story provides the second entry and validates the
first — both move M2 forward.

## Architecture Constraints

- TypeScript strict mode (discovery constraint)
- Trace schema interface (`src/types/trace.ts` from S2) — the review agent's trace
  entry must conform to the same interface; no new schema fields introduced without
  updating the shared interface
- The review agent must read the dev agent's trace from the filesystem (append-only
  trace log) — it must not have access to the dev agent's execution session or in-memory
  state; the trace file is the only allowed input from the dev agent
- Prompt hash verification: the review agent computes SHA-256 of the current
  `feature-dev` SKILL.md on disk and compares it to the hash in the dev agent's trace;
  the comparison result must appear explicitly in the review agent's trace entry
- Skills read from local filesystem only (discovery constraint)
- No external system connections; no credentials in code (discovery constraint)
- Fully open / publicly shareable (discovery constraint)

## Dependencies

- **Upstream:** S2 must be complete and producing a valid trace entry — the review
  agent has no useful work to do without a dev agent trace to validate
- **Downstream:** S4 (Assurance agent) reads and validates both the dev trace
  (S2) and the review trace (this story)

## Acceptance Criteria

**AC1:** Given the dev agent's trace entry exists as a written file and the review
  agent script is invoked, When the review agent loads the trace, Then it reads the
  trace file from the filesystem (not from any in-memory or session context) and
  confirms the trace contains all required fields: agent identity, skill name, skill
  version, prompt hash, hash algorithm, criteria results array, decision outcome, and
  timestamp.

**AC2:** Given the dev agent's trace contains a prompt hash, When the review agent
  verifies it, Then it independently computes SHA-256 of the current `feature-dev`
  SKILL.md file on disk, compares it to the hash in the trace, and records the
  comparison as `hash-match: true` or `hash-match: false` in its own trace entry —
  the comparison result is explicit, not inferred.

**AC3:** Given the dev agent's trace contains a criteria results array, When the
  review agent validates completeness, Then it confirms that every criterion defined
  in the `feature-dev` skill appears in the results array with a recorded outcome
  (pass, fail, or not-applicable) — a missing criterion is recorded as a validation
  finding, not silently ignored.

**AC4:** Given its validation is complete, When the review agent emits its trace entry,
  Then the entry contains: agent identity (`review`), `feature-review` skill name and
  version, review agent's own prompt hash, hash-match result for the dev trace, list of
  validation findings (empty if none), decision outcome (`proceed-to-quality-review` /
  `reject-to-inbox`), and timestamp.

**AC5:** Given the dev agent's trace contains a `hash-match: false` result (simulated
  by modifying the dev trace to contain an incorrect hash), When the review agent
  validates it, Then the review agent's decision outcome is `reject-to-inbox` and the
  rejection reason explicitly references the hash mismatch.

## Out of Scope

- Re-executing or re-evaluating the implementation work — the review agent reads the
  trace, not the code; this distinction is foundational to the governance claim
- Independent assurance validation — that is S4 (Assurance agent); the review agent
  validates the dev trace, not both traces
- Notification or escalation workflows — excluded per discovery out-of-scope item 5

## NFRs

- **Integrity:** The review agent must not write to or modify the dev agent's trace
  file — it reads only; the dev trace must be identical before and after review agent
  invocation
- **Security:** No credentials or organisational data referenced in any script or
  trace entry
- **Traceability:** The review agent's trace entry must be written to the same
  append-only trace log as the dev agent's trace entry, in sequence

## Complexity Rating

**Rating:** 1
**Scope stability:** Stable — the review agent's behaviour is fully specified by the
dev trace format (S2) and the `feature-review` skill's criteria. The key constraint
(read trace from filesystem only, not from session context) is an architectural rule,
not an ambiguity.
