# Definition of Done: Assurance agent runs cold-start, validates both traces, confirms hashes, emits assurance record

**PR:** https://github.com/heymishy/agentic-dev/pull/4 | **Merged:** 2026-04-01
**Story:** artefacts/2026-03-30-agentic-sdlc-prototype/stories/s4-assurance-agent-cold-start.md
**Test plan:** artefacts/2026-03-30-agentic-sdlc-prototype/test-plans/s4-assurance-agent-cold-start-test-plan.md
**DoR artefact:** artefacts/2026-03-30-agentic-sdlc-prototype/dor/s4-assurance-agent-cold-start-dor.md
**Assessed by:** Copilot
**Date:** 2026-04-01

---

## AC Coverage

| AC | Satisfied? | Evidence | Deviation |
|----|-----------|----------|-----------|
| AC1: Reads both trace entries from trace log file only; schema validated before processing | ✅ | `readTraceLog()` in assurance-validator.ts validates all required fields per entry on every invocation; `runAssuranceAgent()` has no module-level cache. Integration test `Full assurance agent run` confirms dev+review entries read from file and third entry appended. | None |
| AC2: Independently loads feature-dev SKILL.md, computes SHA-256, records devHashMatch explicitly | ✅ | `validateDevTrace(devEntry, skillPath)` calls `computeSkillHash(skillPath)` independently; returns `{ devHashMatch: boolean }` recorded explicitly in AssuranceRecord. Unit tests cover true and false paths. Integration test confirms `devHashMatch: true` in emitted record. | None |
| AC3: Independently loads feature-review SKILL.md, computes hash, confirms review's devHashMatch result; records both | ✅ | `validateReviewTrace(reviewEntry, devHashMatch, skillPath)` independently recomputes review hash and confirms `reviewEntry.devHashMatch === devHashMatch`. Returns `{ reviewHashMatch, reviewsDevHashMatch }`. Unit and integration tests cover all paths. `Skills path from registry` integration test confirms registry is the hash authority. | None |
| AC4: Complete assurance record with all 9 required fields + criteriaOutcomes[3] + verdict emitted; trace append-only | ✅ | `buildAssuranceRecord()` produces AssuranceRecord with: agentIdentity='assurance', skillName, skillVersion, promptHash, hashAlgorithm='sha256', devHashMatch, reviewHashMatch, criteriaOutcomes[3] (DEV_TRACE_VERIFIED, REVIEW_TRACE_VERIFIED, ALL_CRITERIA_PASS), verdict, timestamp. `emitAssuranceRecord()` uses fs.appendFileSync. Integration test asserts all fields by name. NFR: append-only test confirms no truncation. | None |
| AC5: Documented, verifiable cold-start independence mechanism in README | ✅ | `## Cold-start independence` section added to README with 3 verifiable mechanisms: (1) import-level isolation — no cross-agent imports, asserted by NFR test; (2) filesystem-only input — `readTraceLog` reads fresh from disk on every call; (3) independent hash computation. Cold-start integration test proves: tampered hash on second invocation → `escalate` verdict (not `closed` from cached first run). | None |

---

## Scope Deviations

None. The implementation stayed within story scope. Escalation notification (out-of-scope item 5) was not implemented — verdict is recorded but triggers no notification, per story out-of-scope.

---

## Test Plan Coverage

**Tests from plan implemented:** 16 / 16 planned (32 unit tests written; 25 integration tests passing)
**Tests passing in CI:** 57/57 (32 unit + 25 integration)

| Test | Implemented | Passing | Notes |
|------|-------------|---------|-------|
| readTraceLog — valid JSONL parsed correctly | ✅ | ✅ | |
| readTraceLog — missing required field throws | ✅ | ✅ | |
| computeSkillHash — correct SHA-256 for fixture | ✅ | ✅ | |
| computeSkillHash — throws on missing file | ✅ | ✅ | |
| validateDevTrace — devHashMatch: true when hash matches | ✅ | ✅ | |
| validateDevTrace — devHashMatch: false when hash does not match | ✅ | ✅ | |
| validateReviewTrace — confirms review hash and devHashMatch result | ✅ | ✅ | |
| buildAssuranceRecord — closed verdict, all fields present | ✅ | ✅ | |
| buildAssuranceRecord — escalate verdict when devHashMatch false | ✅ | ✅ | |
| Integration: Full assurance run — reads trace, validates, writes record | ✅ | ✅ | |
| Integration: Prior trace entries not modified | ✅ | ✅ | NFR: immutability |
| Integration: Skills path resolved from registry | ✅ | ✅ | |
| Integration: Cold-start independence — fresh read, not stale cache | ✅ | ✅ | AC5 |
| NFR: Full run completes within 5 seconds | ✅ | ✅ | |
| NFR: No cross-agent imports | ✅ | ✅ | ADR-001 |
| NFR: Trace log append-only | ✅ | ✅ | |

**Gaps:** None.

---

## NFR Status

| NFR | Addressed? | Evidence |
|-----|------------|---------|
| Integrity: assurance agent must not modify prior trace entries | ✅ | `emitAssuranceRecord` uses `fs.appendFileSync`. Integration test `does not modify prior trace entries` computes SHA-256 of prior content before and after run — hashes match. NFR append-only test confirms file grows, not shrinks. |
| Security: no credentials, runnable on personal machine with public tooling only | ✅ | No credentials in any source file. Only Node.js built-ins (crypto, fs, path) + Jest. |
| Verifiability: cold-start mechanism described in enough detail to verify without running code | ✅ | README `## Cold-start independence` section names three specific, observable mechanisms. No-cross-imports NFR test is executable verification. |

---

## Metric Signal

**M1 — Autonomous loop completion on an unseen task**
Signal: `on-track`
Evidence: S4 complete — all three agents (dev, review, assurance) now instrumented and tested via integration test. The full three-agent loop closes end-to-end in the integration suite (s1-bare-loop passes, each subsequent story verified the governance leg). Unseen-task measurement against a live Mission Control instance is not yet performed (requires docker + running session), but the code path is proven by automated integration tests.
Date measured: 2026-04-01

**M2 — Per-decision traceability to versioned skill**
Signal: `on-track`
Evidence: All three trace legs now complete. Dev trace (S2): agentIdentity, skillName, skillVersion, promptHash (SHA-256), hashAlgorithm. Review trace (S3): same fields + devHashMatch. Assurance trace (S4): same fields + devHashMatch, reviewHashMatch, criteriaOutcomes[3], verdict, timestamp. 3/3 agents emit resolvable prompt hashes. Integration test suite verifies hash integrity independently for every agent. M2 target (100% of trace entries contain skill name, version, resolvable prompt hash) is now satisfied across all three agents.
Date measured: 2026-04-01

**M3 — Assurance agent detects injected criterion failure**
Signal: `not-yet-measured`
Evidence: S4 establishes the independent validation path M3 requires. The cold-start integration test demonstrates that a tampered dev hash produces `verdict: 'escalate'` and `devHashMatch: false` — the detection mechanism is proven. Formal M3 measurement (deliberate criterion injection) is S5's scope. Foundation is confirmed.
Date measured: null

---

## Outcome

**COMPLETE**

**Follow-up actions:**
- Run `/definition-of-done` after S5 merges to record M3 signal.
- The worktree `.worktrees/s4-assurance-agent-cold-start` can be removed.
