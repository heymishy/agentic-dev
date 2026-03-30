## Test Plan: Dev agent loads skill, self-checks against falsifiable criteria, emits trace

**Story reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/stories/s2-dev-agent-skill-trace.md`
**Epic reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/epics/agent-loop-and-governance-layer.md`
**Test plan author:** Copilot
**Date:** 2026-03-30

---

## AC Coverage

| AC | Description | Unit | Integration | E2E | Manual | Gap type | Risk |
|----|-------------|------|-------------|-----|--------|----------|------|
| AC1 | Reads feature-dev SKILL.md, computes SHA-256 of raw bytes, stores hash + file path before work begins | 2 | 1 | — | — | — | 🟢 |
| AC2 | Evaluates output against criteria; produces per-criterion list (criterion text, result, reason on fail) | 2 | — | — | — | — | 🟢 |
| AC3 | Trace entry contains all 8 required fields (agent identity, skill name, version, prompt hash, hash algorithm, criteria results, decision outcome, timestamp) | 2 | 1 | — | — | — | 🟢 |
| AC4 | Hash in trace is independently verifiable — SHA-256 of current skill file on disk matches trace prompt hash | 1 | 1 | — | — | — | 🟢 |
| AC5 | Failing criterion produces `fail` result with reason string; decision outcome becomes `reject`; agent does not advance task | 2 | — | — | — | — | 🟢 |
| AC6 | All three agents resolve skill paths from `skills-registry.json` at repo root; file is committed; no hardcoded paths | 2 | 1 | — | — | — | 🟢 |

---

## Coverage gaps

None — all ACs have automated test coverage. The 1-M1 MEDIUM finding (AC1 says "stores in
memory" which is internal state) is addressed by testing the observable behaviour: the hash
and file path appear correctly in the emitted trace entry, not by asserting internal storage.

---

## Test Data Strategy

**Source:** Synthetic — all trace entries and SKILL.md fixtures generated/committed in the
test directory; no real skill content required.

**PCI/sensitivity in scope:** No — all data is synthetic; no credentials, org data, or PII.

**Availability:** Self-contained — fixture files committed to `tests/fixtures/`; no external
services or running system required.

**Owner:** Self-contained — each test creates its own state; no shared global state.

### Data requirements per AC

| AC | Data needed | Source | Sensitive fields | Notes |
|----|-------------|--------|-----------------|-------|
| AC1 | `fixtures/feature-dev.skill.md` with known byte content; pre-computed SHA-256 constant | Synthetic fixture | None | Hash pre-computed at fixture creation time; never computed at test-write time |
| AC2 | Minimal criteria list in fixture SKILL.md (at least 3 criteria); synthetic "implementation output" object satisfying / failing specific criteria | Synthetic | None | Two scenarios: all-pass and one-fail |
| AC3 | Full happy-path run output from dev agent | Synthetic | None | Must cover all 8 required fields; assert each explicitly |
| AC4 | `fixtures/feature-dev.skill.md`; a written trace file on disk containing the pre-computed hash | Synthetic fixture | None | Hash must be independently re-computable from the fixture without reading the trace |
| AC5 | A `fixtures/feature-dev.skill.md` variant where one criterion is not satisfied by the synthetic output | Synthetic | None | Fail path only; verify reason string is non-empty |
| AC6 | `skills-registry.json` as a temp file mapping `feature-dev`, `feature-review`, `feature-assurance` to relative fixture paths | Synthetic | None | Don't hardcode the skill path in the test — always pass through the registry read |

### Gaps

None — all test data is synthetic and self-contained.

---

## Unit Tests

### `loadSkillFromRegistry` — resolves correct file path for a known skill name

- **Verifies:** AC6
- **Precondition:** A temp `skills-registry.json` file containing `{ "feature-dev": "./fixtures/feature-dev.skill.md", "feature-review": "./fixtures/feature-review.skill.md", "feature-assurance": "./fixtures/feature-assurance.skill.md" }`.
- **Action:** Call `loadSkillFromRegistry('./skills-registry.json', 'feature-dev')`.
- **Expected result:** Returns the string `"./fixtures/feature-dev.skill.md"`; no hardcoded path fallback used.
- **Edge case:** No — happy path only.

### `loadSkillFromRegistry` — throws when requested skill name is absent from registry

- **Verifies:** AC6 (error path — registry key missing guards against stale/hardcoded path)
- **Precondition:** A `skills-registry.json` with only `feature-dev` and `feature-review` entries; `feature-assurance` absent.
- **Action:** Call `loadSkillFromRegistry('./skills-registry.json', 'feature-assurance')`.
- **Expected result:** Throws a typed error naming the missing skill; does not return `undefined` or fall back to a hardcoded path.
- **Edge case:** Yes — missing registry key.

### `computeSkillHash` — produces correct SHA-256 hex string for a known fixture

- **Verifies:** AC1, AC4
- **Precondition:** `fixtures/feature-dev.skill.md` with fixed byte content; expected SHA-256 pre-computed as a test constant.
- **Action:** Call `computeSkillHash('./fixtures/feature-dev.skill.md')`.
- **Expected result:** Returns the pre-computed SHA-256 hex string exactly; lowercase hex, no padding, no newline.
- **Edge case:** No.

### `computeSkillHash` — throws if skill file does not exist at resolved path

- **Verifies:** AC1 (file must be readable before work begins; missing file is not silently ignored)
- **Precondition:** No file exists at the given path.
- **Action:** Call `computeSkillHash('./fixtures/does-not-exist.md')`.
- **Expected result:** Throws a file-not-found error; does not return null or empty string.
- **Edge case:** Yes — missing skill file.

### `evaluateCriteria` — returns all-pass list when output satisfies every criterion

- **Verifies:** AC2
- **Precondition:** Synthetic `featureDevSkill` criteria list (3 criteria: has implementation file, has test file, has changelog entry); synthetic output object satisfying all three.
- **Action:** Call `evaluateCriteria(criteria, output)`.
- **Expected result:** Returns an array of 3 objects; every entry has `result: "pass"`; no `reason` field present on any passing entry.
- **Edge case:** No.

### `evaluateCriteria` — marks failing criterion with `fail` result and non-empty reason string

- **Verifies:** AC2, AC5
- **Precondition:** Same criteria list; synthetic output object with the changelog entry absent.
- **Action:** Call `evaluateCriteria(criteria, output)`.
- **Expected result:** The changelog criterion entry has `result: "fail"` and a non-empty `reason` string; the other two entries have `result: "pass"`; reason string is not an empty string or whitespace.
- **Edge case:** Yes — failing criterion.

### `buildTraceEntry` — produces trace entry containing all 8 required fields

- **Verifies:** AC3
- **Precondition:** Valid criteria results array (all-pass); pre-computed skill hash; skill metadata (name: `feature-dev`, version from frontmatter). 
- **Action:** Call `buildTraceEntry({ agentIdentity: 'dev', skillName: 'feature-dev', skillVersion: '1.0.0', promptHash: '<precomputed>', hashAlgorithm: 'sha256', criteriaResults: [...], decisionOutcome: 'proceed' })`.
- **Expected result:** Returned object has all 8 fields: `agentIdentity`, `skillName`, `skillVersion`, `promptHash`, `hashAlgorithm`, `criteriaResults`, `decisionOutcome`, `timestamp`. `timestamp` is a valid ISO 8601 string. TypeScript compiler enforces completeness via `TraceEntry` interface.
- **Edge case:** No.

### `buildTraceEntry` — sets `decisionOutcome: "reject"` when any criterion fails

- **Verifies:** AC5 (agent does not proceed when criterion fails)
- **Precondition:** Criteria results array with one `fail` entry.
- **Action:** Call `buildTraceEntry` with the failing criteria results and `decisionOutcome: "reject"`.
- **Expected result:** Returned entry has `decisionOutcome: "reject"`; the failing criterion's reason string is preserved in `criteriaResults`.
- **Edge case:** Yes — reject path.

---

## Integration Tests

### Full dev agent run — trace written to log, all fields verifiable on disk

- **Verifies:** AC1, AC3, AC4
- **Precondition:** `skills-registry.json` pointing to `fixtures/feature-dev.skill.md`; temp trace log path; synthetic implementation output (all-pass).
- **Action:** Run `devAgent({ registryPath: './skills-registry.json', tracePath: '<temp>', output: syntheticOutput })` end-to-end.
- **Expected result:** (1) Trace log file exists on disk after run. (2) Trace entry is valid JSON parseable as `TraceEntry`. (3) `promptHash` in the trace matches SHA-256 of `fixtures/feature-dev.skill.md` computed independently in the test. (4) `hashAlgorithm` is `"sha256"`. (5) All 8 required fields present.
- **Edge case:** No — happy path integration.

### Registry resolution integration — skill path read from `skills-registry.json`, not hardcoded

- **Verifies:** AC6
- **Precondition:** `skills-registry.json` pointing to a fixture path; the path differs from any path that could be arrived at by convention (to rule out coincidental correctness). A second skills-registry.json pointing to a different fixture file. Dev agent module has no hardcoded path.
- **Action:** Run dev agent with registry pointing to alternate fixture; verify trace contains hash matching the alternate fixture, not the default fixture.
- **Expected result:** `promptHash` in the trace matches SHA-256 of the alternate fixture; confirms path resolution is dynamic, not static.
- **Edge case:** Yes — alternate registry path.

### Reject path integration — failing criterion stops task from advancing

- **Verifies:** AC5
- **Precondition:** Skill fixture with one criterion the synthetic output does not satisfy; mock Mission Control queue in `Inbox` state for the task.
- **Action:** Run dev agent with the failing output.
- **Expected result:** (1) Trace entry has `decisionOutcome: "reject"`. (2) Failing criterion appears as `fail` with reason string. (3) Task remains in `Inbox` queue column — not moved to `Review`. (4) Trace is written to disk (reject does not suppress the trace).
- **Edge case:** Yes — reject path.

---

## NFR Tests

### TypeScript strict mode — `TraceEntry` interface enforces all fields at compile time

- **Verifies:** NFR (Integrity)
- **Mechanism:** The TypeScript compiler is invoked with `--strict` in CI. Any `buildTraceEntry` call that omits a required field causes a type error. This is verified by a negative compile test: introduce a `TraceEntry` object missing `hashAlgorithm`, confirm `tsc --strict` exits non-zero.
- **Pass condition:** `tsc --strict` exits 0 on the valid code; exits non-zero when a required field is removed in the negative test fixture.

### Hash + criteria evaluation complete in under 2 seconds on a standard fixture

- **Verifies:** NFR (Performance — AC1 performance constraint)
- **Mechanism:** Time the combined `computeSkillHash` + `evaluateCriteria` calls with a 10 KB fixture file on the test runner. Jest timeout set to 2000 ms.
- **Pass condition:** Combined call completes within the 2-second Jest timeout; no timeout error.

### No credentials or org data in trace output

- **Verifies:** NFR (Security)
- **Mechanism:** Run grep over the written trace file for known credential patterns (`Bearer`, `sk-`, `password`, `secret`, env variable names). Can be implemented as a regex assertion on the serialised trace JSON.
- **Pass condition:** No matches found in trace output for any credential pattern.

---

## Out of Scope for this test plan

- Review agent reading or validating the trace produced here — that is S3's test plan
- Assurance agent — S4
- Trace tamper-evidence mechanism — S6
- Evolving criteria content in `feature-dev` SKILL.md — post-prototype concern
- Automated hash-verification tooling beyond the manual check in the verification script
