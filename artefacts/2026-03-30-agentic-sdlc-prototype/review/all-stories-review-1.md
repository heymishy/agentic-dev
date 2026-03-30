# Review Report: All Stories (S1–S7) — Run 1

**Story references:**
- `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s1-three-agent-bare-loop.md`
- `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s2-dev-agent-skill-trace.md`
- `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s3-review-agent-trace-validation.md`
- `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s4-assurance-agent-cold-start.md`
- `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s5-injected-failure-detection.md`
- `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s6-trace-schema-tamper-evidence.md`
- `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s7-self-service-packaging.md`

**Date:** 2026-03-30
**Run:** 1 (first review — no diff)
**Categories run:** A — Traceability, B — Scope integrity, C — AC quality, D — Completeness, E — Architecture compliance
**Outcome:** PASS — HIGH finding present; blocks /test-plan until resolved

---

## HIGH findings — must resolve before /test-plan

**[1-H1] Category A/D — Authority registry has no explicit deliverable**
**STATUS: RESOLVED in same session — see S2 changes below.**

The discovery MVP scope uses the phrase "currently registered `feature-dev` skill version"
three times (discovery.md lines 71, 76, 83). S3's user story repeats it verbatim. S4's
benefit linkage says "confirms both prompt hashes match the registered skill versions."

No story defines:
- What the registry IS (a config file? a path convention? hardcoded?)
- How agents resolve the skill name `feature-dev` to a filesystem path
- Where the config lives in the repository

S2 AC1 says *"the `feature-dev` SKILL.md file exists at the configured local path"* —
this is the only reference to configuration, but the config mechanism is left completely
undefined. An implementing agent will either hardcode the path or invent a config format.
Neither is an explicit deliverable.

This breaks the traceability chain at S3: AC2 requires the review agent to "independently
compute SHA-256 of the current `feature-dev` SKILL.md file on disk" — but "current" and
"registered" mean nothing without a defined authoritative source.

**Fix:** Add an AC to S2 and extend its Architecture Constraints to define a
`skills-registry.json` config file (or equivalent) that maps skill names to relative
filesystem paths. This file must be committed as an explicit deliverable, making
"registered version" concrete and independently verifiable.

Minimum content of the fix (not a new story — a new AC in S2):

> **AC6 (proposed):** Given the prototype repository is cloned, When a
> `skills-registry.json` file exists at the repository root and maps skill names
> (e.g. `feature-dev`, `feature-review`, `feature-assurance`) to relative paths
> to the corresponding SKILL.md files, Then all three agent scripts resolve skill
> file paths by reading this registry — not by hardcoding paths — and the registry
> file is committed as part of the repository.

The Architecture Constraints section of S2 should additionally specify:
- Registry format: a flat JSON object `{ "skill-name": "./relative/path/to/SKILL.md" }`
- Location: repository root (`skills-registry.json`)
- Governance implication: this is the authority registry — changing a skill path requires
  updating this file; this is the audit hook for skill version changes

---

## MEDIUM findings — resolve or acknowledge in /decisions

**[1-M1] Category C — S2 AC1 describes internal implementation state**

> S2 AC1: "...Then it reads the file, computes a SHA-256 hash of its raw bytes, and
> **stores both the hash and the file path in memory** before performing any work."

"Stores in memory" is implementation state, not observable behaviour. A test cannot
directly observe what is held in memory. The underlying intent (hash is computed before
work begins, and the hash in the trace matches the file at the time of invocation) is
valid and important — but the AC should describe what is observable.

Risk if proceeding: the implementing agent may cache the hash differently (e.g. compute
it after work, read it from a config, etc.) and this AC would not catch it.

**Fix (minor rewrite of AC1 then-clause):**
> "Then its trace entry contains a SHA-256 hash that matches the hash of the SKILL.md
> file at the configured path at the time of invocation — not a cached or pre-computed
> value; and no implementation work is reflected in the trace before this hash appears."

Or split into two ACs:
- AC1 — hash is in trace entry, matches current file bytes
- AC6 (existing proposed) — skills path resolved from registry

To acknowledge without fixing: run `/decisions`, category RISK-ACCEPT.

---

## LOW findings — note for retrospective

**[1-L1] Category C — S4 AC5 "e.g." weakens testability**

> S4 AC5: "...there is a documented, verifiable mechanism **(e.g. separate process
> invocation, no shared module-level state, explicit context boundary)**..."

The "(e.g.)" signals the specific mechanism is not yet committed to. The AC tests
that *a* mechanism exists and is documented, but doesn't lock down *which* one. This
is a deliberate design choice (flexibility before S1 reveals what's practical), but
it means AC5 cannot be evaluated until implementation decides on the mechanism. In
practice this is fine — but it should not surprise the implementing agent that it
must choose and then document the choice.

No fix required. Note for implementation: the mechanism decision at S4 should be
logged via `/decisions` as it constrains S7 (the README cold-start description
references the mechanism chosen here).

**[1-L2] Category B — Epic 2 out-of-scope section doesn't cross-reference discovery**

The verification-and-demonstrability epic's out-of-scope section doesn't name which
discovery out-of-scope items it maps to (Epic 1 does this implicitly; Epic 2's OOS
section is shorter). Not a blocking issue — story-level OOS sections are all clean.

---

## Scope integrity check — all discovery out-of-scope items

| Discovery OOS item | Present in any story? | Finding |
|---|---|---|
| 1. Autonomous agent polling / self-invocation | Absent ✅ | S1 OOS explicitly excludes it |
| 2. Bitbucket/GitHub API integration | Absent ✅ | No story references API-based skill resolution |
| 3. Production-grade security hardening | Absent ✅ | Every NFR section labels prototype-level controls |
| 4. Complex or realistic feature tasks | Absent ✅ | — |
| 5. Human-in-the-loop approval flows | Absent ✅ | S4 OOS explicitly excludes escalation notification |
| 6. Integration with real external systems | Absent ✅ | All stories carry no-external-connections NFR |

Epic 1 OOS deferred items (injected failure → S5, tamper evidence → S6,
self-service packaging → S7) all correctly assigned to Epic 2 only. ✅

---

## Score summary

| Category | Score | Pass/Fail | Notes |
|---|---|---|---|
| A — Traceability | 3 | PASS | "Registered skill version" concept from discovery is unresolved as a concrete mechanism |
| B — Scope integrity | 5 | PASS | All OOS items confirmed absent; no stories implement anything out of scope |
| C — AC quality | 4 | PASS | S2 AC1 describes internal state (1-M1); all other ACs are Given/When/Then, observable, edge cases separated |
| D — Completeness | 3 | PASS | Skills path config mechanism is referenced but not captured as a deliverable (1-H1) |
| E — Architecture | 4 | PASS | ADRs govern this repo's viz/scripts, not prototype code; prototype architectural rules are well-defined in Architecture Constraints fields across all stories |

**Findings:** 1 HIGH (resolved in session), 1 MEDIUM, 2 LOW

---

## Verdict

**PASS — HIGH finding resolved; /test-plan unblocked**

All criteria scored 3 or above. The one HIGH finding (1-H1) was resolved in this
session by adding AC6 + an Authority Registry Architecture Constraint to S2. The
out-of-scope surface is clean. The remaining MEDIUM finding (1-M1, S2 AC1 describes
internal state) is addressable at /test-plan time or by RISK-ACCEPT in /decisions.
