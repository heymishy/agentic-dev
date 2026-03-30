# Epic: Agent Loop and Governance Layer

**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`
**Slicing strategy:** Walking skeleton — prove the queue plumbing first (S1), then add governance incrementally (S2, S3, S4). Each story leaves the system in a runnable state.

## Goal

A trivial feature task can flow from a filesystem queue Inbox folder to Done through three
sequentially invoked, stateless TypeScript agents. Each agent loads a versioned skill
from the local filesystem, performs defined work, checks that work against the skill's
falsifiable criteria, and emits a structured trace entry containing a prompt hash that
resolves to the exact skill file that governed it. At the end of this epic, the
governance loop is closed: the work is done, the trace exists, and the assurance agent
has independently verified both prior traces against the same versioned skill files
that governed the original decisions.

## Out of Scope

- Autonomous agent polling or self-invocation — agents are triggered manually or via
  script; the queue state is what matters, not what reads it (deferred per discovery)
- Injected-failure detection testing — this is a separate verification story in Epic 2
  (S5); the governance loop must work before its failure modes are formally tested
- Trace schema finalisation and tamper-evidence mechanism — Epic 2 (S6); this epic
  establishes the schema, Epic 2 locks and validates it
- Self-service packaging and 30-minute bar validation — Epic 2 (S7)
- Production security hardening — explicitly deferred per discovery out-of-scope

## Benefit Metrics Addressed

| Metric | Current baseline | Target | How this epic moves it |
|--------|-----------------|--------|------------------------|
| M1: Autonomous loop completion | 0% — system doesn't exist | 100% on unseen task | S1 proves the bare loop closes; S2–S4 add governance without breaking it |
| M2: Per-decision traceability | 0% | 100% of trace entries contain name, version, prompt hash | S2–S4 add skill loading, hashing, and trace emission to each agent |
| M3: Assurance detects injected failure | Not measurable | 1/1 detected; 0 false positives | S4 establishes the independent assurance mechanism; S5 (Epic 2) tests failure modes |

## Stories in This Epic

- [ ] S1: Three-agent bare loop closes end-to-end
- [ ] S2: Dev agent loads skill, self-checks against falsifiable criteria, emits trace
- [ ] S3: Review agent validates dev trace and emits its own trace
- [ ] S4: Assurance agent runs cold-start, validates both traces, confirms hashes, emits assurance record

## Human Oversight Level

**Oversight:** Medium
**Rationale:** Novel architecture on a greenfield codebase. Queue semantics under
programmatic invocation are well-understood (filesystem ops) but the governance layer
(skill loading, trace emission, hash verification, assurance agent independence) is new.
Single builder — no pairing. Human review at PR is appropriate before moving to Epic 2.

## Complexity Rating

**Rating:** 2
**Rationale:** Filesystem queue mechanics are well-understood (no alpha software). Primary
ambiguity is in enforcing genuine agent independence in a single-operator environment,
and confirming that the governance layer (skill loading, hash verification, assurance) is
correctly wired end-to-end.

## Scope Stability

**Stability:** Stable
**Rationale:** Filesystem queue is a well-understood mechanism with no external service
dependency. S1 validates queue semantics before governance complexity is added; the
walking skeleton approach ensures each story leaves the system in a runnable state.
