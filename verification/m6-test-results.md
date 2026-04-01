# Verification: M6 — Tamper-evidence protocol (S6 AC3 / Protocol 2)

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s6-trace-schema-tamper-evidence.md`
**Verification script:** `artefacts/2026-03-30-agentic-sdlc-prototype/verification-scripts/s6-trace-schema-tamper-evidence-verification.md`
**Test run date:** 2026-04-01
**Executed by:** Copilot (automated integration test — see Protocol 2 note below)

---

## Protocol 2 execution note

The test plan specified Protocol 2 as a manual test (edit trace file, re-run agent, observe output). During implementation it became clear that the mechanism — storing per-entry SHA-256 hashes inside the assurance record and re-checking them on the next invocation — is fully mechanistic and repeatable. An automated integration test faithfully exercises the same scenario without approximation. The manual steps were therefore replaced by a committed integration test at `tests/integration/s6-tamper-evidence.integration.test.ts`, which is the canonical evidence for this protocol. This is recorded as a deviation because the test plan called for a manual test.

---

## Mechanism implemented

SHA-256 hashes of the serialised dev and review trace entries are computed at the time of the first assurance run and stored as `devEntryHash` and `reviewEntryHash` inside the `AssuranceRecord`. On any subsequent assurance invocation, if a prior assurance record is found in the trace log, the agent recomputes the hashes from the current entries and compares them against the stored values. A mismatch produces an `escalate` verdict with a `ENTRY_INTEGRITY` criterion failure.

---

## Test 1 — Tampered `criteriaResults` detected

| field | value |
|-------|-------|
| mechanism-used | SHA-256 of `JSON.stringify(devEntry)` stored in `AssuranceRecord.devEntryHash`; recomputed on re-verification and compared |
| tampered-field | `criteriaResults[0].result` on dev trace entry |
| pre-tamper-value | `"pass"` (criterion: `HAS_IMPLEMENTATION_FILE`) |
| tampered-value | `"fail"` (post-hoc result alteration simulating fraud) |
| inconsistency-detected | yes |
| detection-method | Recomputed SHA-256 of tampered dev entry did not match `devEntryHash` in stored assurance record; `detectEntryTampering()` returned `tampered: true` with reason matching `/criteriaResults/` |
| second-run-verdict | `escalate` |
| ENTRY_INTEGRITY-criterion | `fail` — reason text references `criteriaResults` tampering |
| result | **PASS** |
| mechanism-limitation | A sophisticated attacker who modifies the trace entry AND updates the stored `devEntryHash` in the assurance record would defeat this check; the mechanism does not use asymmetric cryptography or an independent audit log. Next-phase hardening: cryptographically signed assurance records and write-once storage. |

---

## Test 2 — Unmodified entries produce no false positive

| field | value |
|-------|-------|
| mechanism-used | Same as above |
| tampered-field | none |
| inconsistency-detected | no |
| second-run-verdict | `closed` (returned existing assurance record unchanged) |
| `devEntryHash` match | yes — second run returned the same hash value as first run |
| `reviewEntryHash` match | yes |
| result | **PASS** |

---

## Overall result: PASS

Both pass conditions met:
1. Post-hoc `criteriaResults` alteration produced an `escalate` verdict with `ENTRY_INTEGRITY` criterion fail. ✅
2. Unmodified re-verification produced no false positive and returned the existing closed record. ✅

Limitation documented honestly (see Test 1). ✅

---

## Automated test evidence

File: `tests/integration/s6-tamper-evidence.integration.test.ts`

```
PASS  tests/integration/s6-tamper-evidence.integration.test.ts (12.584 s)
  ✓ S6 AC3 — re-verification detects tampered criteriaResults and escalates
  ✓ S6 AC3 — re-verification passes when entries are unmodified
```

Full suite on this branch after S6 implementation:

```
Unit:        36/36 passed  (32 baseline + 4 new S6 unit tests)
Integration: 27/27 passed  (25 baseline + 2 new S6 Protocol 2 tests)
tsc:         0 errors, 0 warnings
```
