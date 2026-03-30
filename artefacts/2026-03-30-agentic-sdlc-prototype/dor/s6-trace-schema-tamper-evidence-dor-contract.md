# Contract Proposal — Trace schema finalised — tamper-evidence and non-engineer legibility

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s6-trace-schema-tamper-evidence.md`
**Assessed by:** Copilot
**Date:** 2026-03-31

---

## What will be built

- `verification/m5-test-results.md` — results of the non-engineer legibility test (Protocol 1
  in test plan): participant role, trace presented, Q1–Q3 answers, ground truth, PASS/FAIL
  per question, overall result. Committed as M5 evidence artefact.
- `verification/m6-test-results.md` — results of the tamper-evidence test (Protocol 2 in test
  plan): mechanism used, tampered field, pre/post SHA-256 hashes, inconsistency detected,
  detection method. Committed as M6 evidence artefact.
- README tamper-evidence paragraph — 4 elements per AC4: mechanism, what it protects, what it
  does not protect, next-phase production hardening path. Added to the README cold-start section
  or as a separate "Audit trail integrity" section.
- Schema revision (conditional): if Q1 fails in the legibility test, `src/types/trace.ts` field
  names are revised for plain-English readability and all agent files are updated to conform.
  `tsc --strict --noEmit` must pass after any revision.

## What will NOT be built

- Production-grade cryptographic tamper-evidence (hash chaining, signed entries, write-once
  storage) — explicitly deferred per discovery out-of-scope item 3; filesystem append-only
  semantics are the prototype-level control
- Automated legibility scoring — the non-engineer reader test is a manual protocol
- New automated tests beyond `tsc --strict` — S3's hash-before/hash-after NFR test is the
  canonical automated coverage for trace-file integrity (see DL-002); this story does not
  duplicate it

## How each AC will be verified

| AC | Test approach | Type |
|----|---------------|------|
| AC1 | Manual Protocol 1: non-engineer reader answers Q1–Q3 without briefing | Manual |
| AC2 | Manual gate: Q1 failure is blocking; schema revision + retest required before story passes | Manual gate |
| AC3 | Manual Protocol 2: manually edit a prior trace entry; run assurance agent; confirm detectable inconsistency | Manual |
| AC4 | Manual checklist: confirm README tamper-evidence section contains all 4 elements | Manual checklist |
| AC5 | Automated: `npx tsc --strict --noEmit` exits 0 after any schema changes | Automated (tsc) |

## Assumptions

- A non-engineer test participant (risk, compliance, audit, or delivery background) is
  identified and available before this story begins — Q1 failure is a blocking gate;
  do not start without confirming participant availability
- A complete trace log from a finished full-loop run (S1–S4) is available for both tests
- The tamper-evidence mechanism available at prototype level is SHA-256 file hashing +
  filesystem append-only semantics (write new entry, never overwrite)

## Estimated touch points

**Files created:**
- `verification/m5-test-results.md`
- `verification/m6-test-results.md`

**Files conditionally modified (if Q1 fails):**
- `src/types/trace.ts`
- `src/agents/dev-agent.ts`, `src/agents/review-agent.ts`, `src/agents/assurance-agent.ts`

**Files modified regardless:**
- `README.md` (tamper-evidence section added)

**Services:** Mission Control (Docker) for tamper-evidence re-run test

---

## Contract review result

✅ **Contract review passed** — proposed implementation aligns with all 5 ACs.  
AC2 blocking gate noted: story does not pass until Q1 produces a PASS from the
non-engineer reader. Schema revision loop is explicit in this contract.
