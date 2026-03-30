# Epic: Verification and Demonstrability

**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Benefit-metric reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/benefit-metric.md`
**Slicing strategy:** Walking skeleton — Epic 1 must be complete before this epic begins.
Builds verification and packaging on top of a proven governance loop.

## Goal

The governance loop proven in Epic 1 is verified to be genuinely doing assurance (not
confirmation), produces a trace log that a non-engineer reader can interpret without
assistance, is tamper-evident after the assurance record is written, and is packaged
such that an uninitiated person can clone the repository, run the system, and read a
complete audit trail in under 30 minutes with no more than 2 assistance requests. At
the end of this epic, the prototype is ready for external demonstration and the six
product metrics (M1–M6) are measurable.

## Out of Scope

*All items below are excluded per `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md` Out of Scope section.*

- Automated hash resolution (comparing trace hashes against skills-repo
  programmatically) — next-phase hardening item; manual verification is sufficient
  for the prototype (discovery OOS item 2 / M2 feedback loop note)
- Human-in-the-loop approval flows — excluded per discovery OOS item 5; the
  prototype's core claim requires assurance to be independently verifiable without
  human judgement
- Integration with real external systems — no live issue trackers, CI/CD, or IAM
  (discovery OOS item 6)
- Production security hardening — mTLS, secrets management, network isolation
  (discovery OOS item 3)

## Benefit Metrics Addressed

| Metric | Current baseline | Target | How this epic moves it |
|--------|-----------------|--------|------------------------|
| M3: Assurance detects injected failure | Not measurable | 1/1 detected; 0 false positives | S5 runs both formal test runs (failure injection + clean run) |
| M4: 30-minute self-service bar | Not established | Under 30 min, ≤2 assistance requests | S7 packages and validates via dry run |
| M5: Trace self-interpreting | 0/3 | 3/3 questions; Q1 always answered | S6 finalises trace schema and field naming; validated by non-engineer reader |
| M6: Trace integrity / tamper-evidence | Not established | Append-only confirmed; modification blocked or detectable | S6 builds and validates the tamper-evidence mechanism |
| MM1: Stakeholder concept conviction | No outside reviews | ≥1 next-phase question from outside reviewer | Measured via structured demo after S7; not a buildable story |

## Stories in This Epic

- [ ] S5: Assurance agent detects injected criterion failure (and passes clean run)
- [ ] S6: Trace schema finalised — tamper-evidence and non-engineer legibility
- [ ] S7: Self-service packaging — Docker Compose, README, 30-minute bar validated

## Human Oversight Level

**Oversight:** Medium
**Rationale:** Prototype is close to external demonstration. The packaging and
README quality gate (S7) and the trace legibility test (S6) involve subjective
judgement that benefits from human verification before external stakeholders see it.

## Complexity Rating

**Rating:** 2
**Rationale:** S5 is well-specified (formal test protocol defined). S6 requires
judgement on trace readability that can't be fully automated. S7 depends on a
willing dry-run participant. Known unknowns; no unknown unknowns.

## Scope Stability

**Stability:** Stable
**Rationale:** This epic only begins after Epic 1 is complete. The scope is fully
determined by what Epic 1 produced. No new architectural decisions expected.
