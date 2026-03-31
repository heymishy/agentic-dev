# S3: Review agent validates dev trace and emits its own trace — Implementation Plan

> **For agent execution:** Use /subagent-execution (if subagents available) or /tdd per task if executing in this session.

**Goal:** Make every test in the test plan pass — review-agent reads dev trace from filesystem, verifies hash, validates criteria completeness, and emits a review trace entry with all required fields.
**Branch:** `feature/s3-review-agent-trace-validation`
**Worktree:** `.worktrees/s3-review-agent-trace-validation`
**Test command (unit):** `npm test -- --no-coverage`
**Test command (integration):** `npm run test:integration -- --no-coverage --runInBand`
**TSC check:** `npx tsc --strict --noEmit`
**Model class:** balanced (all tasks)

---

## Hard rules (read before writing any code)

- **DL-008:** `review-agent.ts` must guard `main()` with `if (require.main === module)`. Add in Task 4 Step 3. See `src/agents/dev-agent.ts` for canonical pattern.
- **AC1 (HARD RULE):** `runReviewAgent` must read the dev trace from the `devTraceFile` path argument **only**. No module-level cache, no shared state.
- **ADR-001 (HARD RULE):** `review-agent.ts` and all its direct imports must contain **zero** imports from `dev-agent` or `assurance-agent` module paths.
- **Append-only:** review trace is appended to `tracePath` — never modifies existing entries.

---

## File map

```
Create:
  src/lib/trace-reader.ts           — loadTraceFromFile(): reads + validates TraceEntry from file path
  src/lib/review-validator.ts       — verifyDevTraceHash(), validateCriteriaCompleteness(),
                                      buildReviewTraceEntry(), emitReviewTraceEntry()
  src/agents/review-agent.ts        — runReviewAgent() exported; DL-008 require.main guard
  tests/unit/s3-review-agent.test.ts            — 8 unit tests (4 functions × 2 tests each)
  tests/integration/s3-review-agent-trace.integration.test.ts — 4 integration + 3 NFR tests
  tests/fixtures/feature-review.skill.md        — review skill fixture for integration tests

Modify:
  src/types/trace.ts                — add ReviewTraceEntry interface
```

---

## Task 1: `ReviewTraceEntry` type + `trace-reader.ts` + AC1 unit tests

**Model class:** balanced

**Files:**
- Modify: `src/types/trace.ts`
- Create: `src/lib/trace-reader.ts`
- Create: `tests/unit/s3-review-agent.test.ts` (AC1 tests only — 2 tests)

---

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/s3-review-agent.test.ts`:

```typescript
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadTraceFromFile } from '../../src/lib/trace-reader';
import { TraceEntry } from '../../src/types/trace';

const VALID_DEV_TRACE: TraceEntry = {
  agentIdentity: 'dev',
  skillName: 'feature-dev',
  skillVersion: '1.0.0',
  promptHash: 'a'.repeat(64),
  hashAlgorithm: 'sha256',
  criteriaResults: [
    { criterion: 'HAS_IMPLEMENTATION_FILE', result: 'pass' },
    { criterion: 'HAS_TEST_FILE', result: 'pass' },
    { criterion: 'HAS_CHANGELOG_ENTRY', result: 'pass' },
  ],
  decisionOutcome: 'proceed',
  timestamp: new Date().toISOString(),
};

// ── AC1: loadTraceFromFile ───────────────────────────────────────────────────

describe('loadTraceFromFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-unit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('parses a valid TraceEntry from a temp file path', () => {
    const tracePath = path.join(tmpDir, 'trace.jsonl');
    fs.writeFileSync(tracePath, JSON.stringify(VALID_DEV_TRACE) + '\n', 'utf-8');

    const result = loadTraceFromFile(tracePath);

    expect(result.agentIdentity).toBe('dev');
    expect(result.skillName).toBe('feature-dev');
    expect(Array.isArray(result.criteriaResults)).toBe(true);
    expect(typeof result.timestamp).toBe('string');
  });

  test('throws when file does not exist at given path', () => {
    const missingPath = path.join(tmpDir, 'does-not-exist.jsonl');

    expect(() => loadTraceFromFile(missingPath)).toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run tests — must fail**

```bash
cd .worktrees/s3-review-agent-trace-validation
npx jest tests/unit/s3-review-agent.test.ts --no-coverage 2>&1
```

Expected output: `FAIL — Cannot find module '../../src/lib/trace-reader'`

- [ ] **Step 3: Add `ReviewTraceEntry` to `src/types/trace.ts`**

Append to the end of the existing file (after the `AssuranceRecord` stub):

```typescript
export interface ReviewTraceEntry {
  agentIdentity: 'review';
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  devHashMatch: boolean;
  validationFindings: string[];
  decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox';
  timestamp: string;
}
```

- [ ] **Step 3b: Create `src/lib/trace-reader.ts`**

```typescript
import * as fs from 'fs';

import { TraceEntry } from '../types/trace';

const REQUIRED_FIELDS: ReadonlyArray<keyof TraceEntry> = [
  'agentIdentity',
  'skillName',
  'skillVersion',
  'promptHash',
  'hashAlgorithm',
  'criteriaResults',
  'decisionOutcome',
  'timestamp',
];

export function loadTraceFromFile(filePath: string): TraceEntry {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Trace file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const firstLine = raw.split('\n').find(l => l.trim().length > 0);
  if (!firstLine) {
    throw new Error(`Trace file is empty: ${filePath}`);
  }
  const parsed = JSON.parse(firstLine) as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (parsed[field as string] === undefined) {
      throw new Error(`Trace entry missing required field: ${String(field)}`);
    }
  }
  return parsed as TraceEntry;
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx jest tests/unit/s3-review-agent.test.ts --no-coverage 2>&1
```

Expected output:
```
PASS  tests/unit/s3-review-agent.test.ts
  loadTraceFromFile
    ✓ parses a valid TraceEntry from a temp file path
    ✓ throws when file does not exist at given path

Tests: 2 passed, 2 total
```

- [ ] **Step 5: TSC check**

```bash
npx tsc --strict --noEmit 2>&1
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/types/trace.ts src/lib/trace-reader.ts tests/unit/s3-review-agent.test.ts
git commit -m "feat: add ReviewTraceEntry type and loadTraceFromFile (AC1)"
```

---

## Task 2: `review-validator.ts` — hash verification + criteria completeness + AC2/AC3 unit tests

**Model class:** balanced

**Files:**
- Create: `src/lib/review-validator.ts` (partial — `verifyDevTraceHash` + `validateCriteriaCompleteness`)
- Extend: `tests/unit/s3-review-agent.test.ts` (add AC2 + AC3 describe blocks — 4 tests)

---

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/s3-review-agent.test.ts` (add imports and describe blocks):

Add to imports at the top:
```typescript
import * as crypto from 'crypto';

import { verifyDevTraceHash, validateCriteriaCompleteness } from '../../src/lib/review-validator';
import { CriterionResult } from '../../src/types/trace';
```

Add the fixture constant after the `VALID_DEV_TRACE` declaration:
```typescript
const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');
const FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');
```

Append these describe blocks after the existing `loadTraceFromFile` describe:

```typescript
// ── AC2: verifyDevTraceHash ──────────────────────────────────────────────────

describe('verifyDevTraceHash', () => {
  test('returns devHashMatch: true when promptHash matches current skill file', () => {
    const buf = fs.readFileSync(FIXTURE_SKILL);
    const actualHash = crypto.createHash('sha256').update(buf).digest('hex');
    const trace = { ...VALID_DEV_TRACE, promptHash: actualHash };

    const result = verifyDevTraceHash(trace, FIXTURE_SKILL);

    expect(result.devHashMatch).toBe(true);
  });

  test('returns devHashMatch: false when promptHash does not match skill file', () => {
    const trace = { ...VALID_DEV_TRACE, promptHash: 'b'.repeat(64) };

    const result = verifyDevTraceHash(trace, FIXTURE_SKILL);

    expect(result.devHashMatch).toBe(false);
  });
});

// ── AC3: validateCriteriaCompleteness ───────────────────────────────────────

describe('validateCriteriaCompleteness', () => {
  const SKILL_CRITERIA = ['HAS_IMPLEMENTATION_FILE', 'HAS_TEST_FILE', 'HAS_CHANGELOG_ENTRY'];

  test('returns empty findings when all criteria are covered', () => {
    const criteriaResults: CriterionResult[] = SKILL_CRITERIA.map(c => ({
      criterion: c,
      result: 'pass' as const,
    }));

    const findings = validateCriteriaCompleteness(SKILL_CRITERIA, criteriaResults);

    expect(findings).toEqual([]);
  });

  test('records a finding for each missing criterion', () => {
    const criteriaResults: CriterionResult[] = [
      { criterion: 'HAS_IMPLEMENTATION_FILE', result: 'pass' },
      { criterion: 'HAS_TEST_FILE', result: 'pass' },
      // HAS_CHANGELOG_ENTRY is absent
    ];

    const findings = validateCriteriaCompleteness(SKILL_CRITERIA, criteriaResults);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('HAS_CHANGELOG_ENTRY');
  });
});
```

- [ ] **Step 2: Run tests — must fail**

```bash
npx jest tests/unit/s3-review-agent.test.ts --no-coverage 2>&1
```

Expected output: `FAIL — Cannot find module '../../src/lib/review-validator'`

- [ ] **Step 3: Create `src/lib/review-validator.ts`**

```typescript
import * as crypto from 'crypto';
import * as fs from 'fs';

import { CriterionResult, TraceEntry } from '../types/trace';

export function verifyDevTraceHash(
  devTrace: TraceEntry,
  skillFilePath: string,
): { devHashMatch: boolean } {
  const buf = fs.readFileSync(skillFilePath);
  const actualHash = crypto.createHash('sha256').update(buf).digest('hex');
  return { devHashMatch: devTrace.promptHash === actualHash };
}

export function validateCriteriaCompleteness(
  skillCriteria: string[],
  criteriaResults: CriterionResult[],
): string[] {
  const coveredCriteria = new Set(criteriaResults.map(r => r.criterion));
  return skillCriteria
    .filter(c => !coveredCriteria.has(c))
    .map(c => `Missing criterion: ${c}`);
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx jest tests/unit/s3-review-agent.test.ts --no-coverage 2>&1
```

Expected output:
```
PASS  tests/unit/s3-review-agent.test.ts
  loadTraceFromFile
    ✓ parses a valid TraceEntry from a temp file path
    ✓ throws when file does not exist at given path
  verifyDevTraceHash
    ✓ returns devHashMatch: true when promptHash matches current skill file
    ✓ returns devHashMatch: false when promptHash does not match skill file
  validateCriteriaCompleteness
    ✓ returns empty findings when all criteria are covered
    ✓ records a finding for each missing criterion

Tests: 6 passed, 6 total
```

- [ ] **Step 5: TSC check**

```bash
npx tsc --strict --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/review-validator.ts tests/unit/s3-review-agent.test.ts
git commit -m "feat: add verifyDevTraceHash and validateCriteriaCompleteness (AC2, AC3)"
```

---

## Task 3: `buildReviewTraceEntry` + `emitReviewTraceEntry` + AC4/AC5 unit tests + review fixture

**Model class:** balanced

**Files:**
- Extend: `src/lib/review-validator.ts` (add `buildReviewTraceEntry`, `emitReviewTraceEntry`)
- Create: `tests/fixtures/feature-review.skill.md`
- Extend: `tests/unit/s3-review-agent.test.ts` (add AC4 + AC5 describe block — 2 tests)

---

- [ ] **Step 1: Write the failing tests**

Add to the imports at the top of `tests/unit/s3-review-agent.test.ts`:
```typescript
import { buildReviewTraceEntry } from '../../src/lib/review-validator';
import { ReviewTraceEntry } from '../../src/types/trace';
```

Append after the `validateCriteriaCompleteness` describe block:

```typescript
// ── AC4 + AC5: buildReviewTraceEntry ────────────────────────────────────────

describe('buildReviewTraceEntry', () => {
  const BASE_PARAMS = {
    agentIdentity: 'review' as const,
    skillName: 'feature-review',
    skillVersion: '1.0.0',
    promptHash: 'a'.repeat(64),
    hashAlgorithm: 'sha256',
  };

  test('produces entry with all required fields on happy path (AC4)', () => {
    const entry: ReviewTraceEntry = buildReviewTraceEntry({
      ...BASE_PARAMS,
      devHashMatch: true,
      validationFindings: [],
      decisionOutcome: 'proceed-to-quality-review',
    });

    expect(entry.agentIdentity).toBe('review');
    expect(entry.skillName).toBe('feature-review');
    expect(typeof entry.skillVersion).toBe('string');
    expect(typeof entry.promptHash).toBe('string');
    expect(entry.hashAlgorithm).toBe('sha256');
    expect(entry.devHashMatch).toBe(true);
    expect(Array.isArray(entry.validationFindings)).toBe(true);
    expect(entry.decisionOutcome).toBe('proceed-to-quality-review');
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  test('sets reject-to-inbox and references hash mismatch in validationFindings (AC5)', () => {
    const mismatchFinding =
      'Hash mismatch: dev trace promptHash does not match current feature-dev SKILL.md on disk';

    const entry: ReviewTraceEntry = buildReviewTraceEntry({
      ...BASE_PARAMS,
      devHashMatch: false,
      validationFindings: [mismatchFinding],
      decisionOutcome: 'reject-to-inbox',
    });

    expect(entry.decisionOutcome).toBe('reject-to-inbox');
    expect(entry.devHashMatch).toBe(false);
    expect(
      entry.validationFindings.some(
        f => f.toLowerCase().includes('hash') || f.toLowerCase().includes('prompthash'),
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — must fail**

```bash
npx jest tests/unit/s3-review-agent.test.ts --no-coverage 2>&1
```

Expected output: `FAIL — buildReviewTraceEntry is not exported from '../../src/lib/review-validator'`

- [ ] **Step 3a: Create `tests/fixtures/feature-review.skill.md`**

```markdown
---
name: feature-review
version: 1.0.0
---

# Feature Review Skill — Governance Policy

This skill governs the review agent's validation work.

## Criteria

- HAS_DEV_TRACE
- HAS_VALID_HASH
- HAS_CRITERIA_COMPLETENESS
```

- [ ] **Step 3b: Extend `src/lib/review-validator.ts` — add `buildReviewTraceEntry` and `emitReviewTraceEntry`**

Append to the existing file content (after `validateCriteriaCompleteness`):

```typescript
import { ReviewTraceEntry } from '../types/trace';

export function buildReviewTraceEntry(params: {
  agentIdentity: 'review';
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  devHashMatch: boolean;
  validationFindings: string[];
  decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox';
}): ReviewTraceEntry {
  return { ...params, timestamp: new Date().toISOString() };
}

export function emitReviewTraceEntry(tracePath: string, entry: ReviewTraceEntry): void {
  fs.appendFileSync(tracePath, JSON.stringify(entry) + '\n', 'utf-8');
}
```

**Note:** `ReviewTraceEntry` import must be added to the top of the file (merge with the existing import from `'../types/trace'`). The full imports block at the top of `src/lib/review-validator.ts` should become:

```typescript
import * as crypto from 'crypto';
import * as fs from 'fs';

import { CriterionResult, ReviewTraceEntry, TraceEntry } from '../types/trace';
```

And the full `buildReviewTraceEntry` + `emitReviewTraceEntry` functions appended after `validateCriteriaCompleteness`.

- [ ] **Step 4: Run tests — must pass**

```bash
npx jest tests/unit/s3-review-agent.test.ts --no-coverage 2>&1
```

Expected output:
```
PASS  tests/unit/s3-review-agent.test.ts
  loadTraceFromFile
    ✓ parses a valid TraceEntry from a temp file path
    ✓ throws when file does not exist at given path
  verifyDevTraceHash
    ✓ returns devHashMatch: true when promptHash matches current skill file
    ✓ returns devHashMatch: false when promptHash does not match skill file
  validateCriteriaCompleteness
    ✓ returns empty findings when all criteria are covered
    ✓ records a finding for each missing criterion
  buildReviewTraceEntry
    ✓ produces entry with all required fields on happy path (AC4)
    ✓ sets reject-to-inbox and references hash mismatch in validationFindings (AC5)

Tests: 8 passed, 8 total
```

- [ ] **Step 5: Run full unit suite — no regressions**

```bash
npm test -- --no-coverage 2>&1
```

Expected output: `Tests: 15 passed, 15 total` (prior 15 + 0 new failures)

- [ ] **Step 6: TSC check**

```bash
npx tsc --strict --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/review-validator.ts tests/unit/s3-review-agent.test.ts tests/fixtures/feature-review.skill.md
git commit -m "feat: add buildReviewTraceEntry, emitReviewTraceEntry, review fixture (AC4, AC5)"
```

---

## Task 4: `review-agent.ts` + integration tests + NFR tests

**Model class:** balanced

**Files:**
- Create: `src/agents/review-agent.ts`
- Create: `tests/integration/s3-review-agent-trace.integration.test.ts`

---

- [ ] **Step 1: Write the failing integration tests**

Create `tests/integration/s3-review-agent-trace.integration.test.ts`:

```typescript
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runReviewAgent } from '../../src/agents/review-agent';
import { computeSkillHash } from '../../src/lib/skill-loader';
import { ReviewTraceEntry, TraceEntry } from '../../src/types/trace';

jest.setTimeout(30000);

const WORKTREE = path.resolve(__dirname, '..', '..');
const FIXTURE_DIR = path.join(WORKTREE, 'tests', 'fixtures');
const DEV_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');
const REVIEW_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-review.skill.md');

function makeRegistry(entries: Record<string, string>, dir: string): string {
  const registryPath = path.join(dir, 'skills-registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(entries), 'utf-8');
  return registryPath;
}

function makeDevTrace(overrides?: Partial<TraceEntry>): TraceEntry {
  const devSkillHash = computeSkillHash(DEV_FIXTURE_SKILL);
  return {
    agentIdentity: 'dev',
    skillName: 'feature-dev',
    skillVersion: '1.0.0',
    promptHash: devSkillHash,
    hashAlgorithm: 'sha256',
    criteriaResults: [
      { criterion: 'HAS_IMPLEMENTATION_FILE', result: 'pass' },
      { criterion: 'HAS_TEST_FILE', result: 'pass' },
      { criterion: 'HAS_CHANGELOG_ENTRY', result: 'pass' },
    ],
    decisionOutcome: 'proceed',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ── AC1 / AC2 / AC4: Full review agent run ────────────────────────────────────

test('Full review agent run — reads dev trace from file, hashes skill, emits review trace', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-full-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const devTraceFile = path.join(tmpDir, 'dev-trace.jsonl');
  const registryPath = makeRegistry(
    { 'feature-dev': DEV_FIXTURE_SKILL, 'feature-review': REVIEW_FIXTURE_SKILL },
    tmpDir,
  );
  const devTrace = makeDevTrace();
  fs.writeFileSync(devTraceFile, JSON.stringify(devTrace) + '\n', 'utf-8');

  await runReviewAgent({ registryPath, tracePath, devTraceFile });

  expect(fs.existsSync(tracePath)).toBe(true);
  const lines = fs.readFileSync(tracePath, 'utf-8').trim().split('\n').filter(l => l.length > 0);
  expect(lines).toHaveLength(1);
  const entry = JSON.parse(lines[0]) as ReviewTraceEntry;

  // AC1: read from file
  expect(entry.agentIdentity).toBe('review');
  // AC2: hash verified
  expect(entry.devHashMatch).toBe(true);
  // AC4: all required fields
  expect(entry.skillName).toBe('feature-review');
  expect(typeof entry.skillVersion).toBe('string');
  expect(typeof entry.promptHash).toBe('string');
  expect(entry.hashAlgorithm).toBe('sha256');
  expect(Array.isArray(entry.validationFindings)).toBe(true);
  expect(entry.decisionOutcome).toBe('proceed-to-quality-review');
  expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  // dev trace file is unchanged
  const devTraceAfter = JSON.parse(fs.readFileSync(devTraceFile, 'utf-8').trim()) as TraceEntry;
  expect(devTraceAfter.promptHash).toBe(devTrace.promptHash);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC1 gap: filesystem-only read ─────────────────────────────────────────────

test('Filesystem-only read — review agent reads fresh trace, not stale cache', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-stale-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const devTraceFile = path.join(tmpDir, 'dev-trace.jsonl');
  const registryPath = makeRegistry(
    { 'feature-dev': DEV_FIXTURE_SKILL, 'feature-review': REVIEW_FIXTURE_SKILL },
    tmpDir,
  );

  // Write original, delete it, write fresh trace with different timestamp at same path
  const originalTrace = makeDevTrace();
  fs.writeFileSync(devTraceFile, JSON.stringify(originalTrace) + '\n', 'utf-8');
  fs.unlinkSync(devTraceFile);
  const freshTrace = makeDevTrace({ timestamp: new Date(Date.now() + 5000).toISOString() });
  fs.writeFileSync(devTraceFile, JSON.stringify(freshTrace) + '\n', 'utf-8');

  await runReviewAgent({ registryPath, tracePath, devTraceFile });

  const lines = fs.readFileSync(tracePath, 'utf-8').trim().split('\n').filter(l => l.length > 0);
  expect(lines).toHaveLength(1);
  const entry = JSON.parse(lines[0]) as ReviewTraceEntry;
  // Fresh trace has valid hash — agent read from disk, not stale cache
  expect(entry.decisionOutcome).toBe('proceed-to-quality-review');

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC5: Hash mismatch → reject-to-inbox ──────────────────────────────────────

test('Hash mismatch integration — tampered dev trace causes reject-to-inbox', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-mismatch-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const devTraceFile = path.join(tmpDir, 'dev-trace.jsonl');
  const registryPath = makeRegistry(
    { 'feature-dev': DEV_FIXTURE_SKILL, 'feature-review': REVIEW_FIXTURE_SKILL },
    tmpDir,
  );
  // Tampered: promptHash is valid hex but not the actual skill hash
  const tamperedTrace = makeDevTrace({ promptHash: 'c'.repeat(64) });
  fs.writeFileSync(devTraceFile, JSON.stringify(tamperedTrace) + '\n', 'utf-8');

  await runReviewAgent({ registryPath, tracePath, devTraceFile });

  const lines = fs.readFileSync(tracePath, 'utf-8').trim().split('\n').filter(l => l.length > 0);
  const entry = JSON.parse(lines[0]) as ReviewTraceEntry;

  expect(entry.decisionOutcome).toBe('reject-to-inbox');
  expect(entry.devHashMatch).toBe(false);
  expect(entry.validationFindings.some(f => f.toLowerCase().includes('hash'))).toBe(true);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC3: Missing criterion → finding ──────────────────────────────────────────

test('Criteria completeness integration — missing criterion in dev trace becomes a finding', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-criteria-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const devTraceFile = path.join(tmpDir, 'dev-trace.jsonl');
  const registryPath = makeRegistry(
    { 'feature-dev': DEV_FIXTURE_SKILL, 'feature-review': REVIEW_FIXTURE_SKILL },
    tmpDir,
  );
  // Dev trace missing HAS_CHANGELOG_ENTRY
  const incompleteTrace = makeDevTrace({
    criteriaResults: [
      { criterion: 'HAS_IMPLEMENTATION_FILE', result: 'pass' },
      { criterion: 'HAS_TEST_FILE', result: 'pass' },
    ],
  });
  fs.writeFileSync(devTraceFile, JSON.stringify(incompleteTrace) + '\n', 'utf-8');

  await runReviewAgent({ registryPath, tracePath, devTraceFile });

  const lines = fs.readFileSync(tracePath, 'utf-8').trim().split('\n').filter(l => l.length > 0);
  const entry = JSON.parse(lines[0]) as ReviewTraceEntry;

  expect(entry.decisionOutcome).toBe('reject-to-inbox');
  expect(entry.validationFindings).toHaveLength(1);
  expect(entry.validationFindings[0]).toContain('HAS_CHANGELOG_ENTRY');

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: Dev trace integrity ───────────────────────────────────────────────────

test('NFR: Dev trace file is unchanged after review agent run', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-nfr-integrity-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const devTraceFile = path.join(tmpDir, 'dev-trace.jsonl');
  const registryPath = makeRegistry(
    { 'feature-dev': DEV_FIXTURE_SKILL, 'feature-review': REVIEW_FIXTURE_SKILL },
    tmpDir,
  );
  const devTrace = makeDevTrace();
  fs.writeFileSync(devTraceFile, JSON.stringify(devTrace) + '\n', 'utf-8');

  const hashBefore = crypto
    .createHash('sha256')
    .update(fs.readFileSync(devTraceFile))
    .digest('hex');

  await runReviewAgent({ registryPath, tracePath, devTraceFile });

  const hashAfter = crypto
    .createHash('sha256')
    .update(fs.readFileSync(devTraceFile))
    .digest('hex');

  expect(hashAfter).toBe(hashBefore);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: Review trace appended to same log ────────────────────────────────────

test('NFR: Review trace appended to same log as dev trace', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-nfr-append-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const devTraceFile = path.join(tmpDir, 'dev-trace.jsonl');
  const registryPath = makeRegistry(
    { 'feature-dev': DEV_FIXTURE_SKILL, 'feature-review': REVIEW_FIXTURE_SKILL },
    tmpDir,
  );
  const devTrace = makeDevTrace();
  fs.writeFileSync(devTraceFile, JSON.stringify(devTrace) + '\n', 'utf-8');
  // Seed trace log with dev entry first
  fs.writeFileSync(tracePath, JSON.stringify(devTrace) + '\n', 'utf-8');

  await runReviewAgent({ registryPath, tracePath, devTraceFile });

  const lines = fs.readFileSync(tracePath, 'utf-8').trim().split('\n').filter(l => l.length > 0);
  expect(lines).toHaveLength(2);
  expect((JSON.parse(lines[0]) as TraceEntry).agentIdentity).toBe('dev');
  expect((JSON.parse(lines[1]) as ReviewTraceEntry).agentIdentity).toBe('review');

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: No credentials in review trace ───────────────────────────────────────

test('NFR: No credentials or org data in review trace output', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's3-nfr-creds-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const devTraceFile = path.join(tmpDir, 'dev-trace.jsonl');
  const registryPath = makeRegistry(
    { 'feature-dev': DEV_FIXTURE_SKILL, 'feature-review': REVIEW_FIXTURE_SKILL },
    tmpDir,
  );
  const devTrace = makeDevTrace();
  fs.writeFileSync(devTraceFile, JSON.stringify(devTrace) + '\n', 'utf-8');

  await runReviewAgent({ registryPath, tracePath, devTraceFile });

  const reviewEntry = fs.readFileSync(tracePath, 'utf-8').trim();
  expect(reviewEntry).not.toMatch(/Bearer|sk-|password|secret/i);

  fs.rmSync(tmpDir, { recursive: true });
});
```

- [ ] **Step 2: Run integration tests — must fail**

```bash
npx jest tests/integration/s3-review-agent-trace.integration.test.ts --no-coverage --runInBand 2>&1
```

Expected output: `FAIL — Cannot find module '../../src/agents/review-agent'`

- [ ] **Step 3: Create `src/agents/review-agent.ts`**

```typescript
import * as fs from 'fs';

import {
  computeSkillHash,
  loadSkillFromRegistry,
  parseCriteria,
  parseSkillVersion,
} from '../lib/skill-loader';
import { loadTraceFromFile } from '../lib/trace-reader';
import {
  buildReviewTraceEntry,
  emitReviewTraceEntry,
  validateCriteriaCompleteness,
  verifyDevTraceHash,
} from '../lib/review-validator';

export async function runReviewAgent(config: {
  registryPath: string;
  tracePath: string;
  devTraceFile: string;
}): Promise<void> {
  const { registryPath, tracePath, devTraceFile } = config;

  // AC1: read dev trace from file path argument only — no module-level cache
  const devTrace = loadTraceFromFile(devTraceFile);

  // Load review skill (for this agent's own promptHash + version)
  const reviewSkillPath = loadSkillFromRegistry(registryPath, 'feature-review');
  const reviewSkillContent = fs.readFileSync(reviewSkillPath, 'utf-8');
  const reviewPromptHash = computeSkillHash(reviewSkillPath);
  const reviewSkillVersion = parseSkillVersion(reviewSkillContent);

  // AC2: independently compute SHA-256 of feature-dev SKILL.md on disk
  const devSkillPath = loadSkillFromRegistry(registryPath, 'feature-dev');
  const { devHashMatch } = verifyDevTraceHash(devTrace, devSkillPath);

  // AC3: validate all criteria from feature-dev skill appear in dev trace results
  const devSkillContent = fs.readFileSync(devSkillPath, 'utf-8');
  const devCriteria = parseCriteria(devSkillContent);
  const hashMismatchFindings: string[] = devHashMatch
    ? []
    : [
        'Hash mismatch: dev trace promptHash does not match current feature-dev SKILL.md on disk',
      ];
  const criteriaFindings = validateCriteriaCompleteness(devCriteria, devTrace.criteriaResults);
  const validationFindings = [...hashMismatchFindings, ...criteriaFindings];

  // AC4 / AC5: decision outcome
  const decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox' =
    validationFindings.length === 0 ? 'proceed-to-quality-review' : 'reject-to-inbox';

  // AC4: build review trace entry with all required fields
  const reviewEntry = buildReviewTraceEntry({
    agentIdentity: 'review',
    skillName: 'feature-review',
    skillVersion: reviewSkillVersion,
    promptHash: reviewPromptHash,
    hashAlgorithm: 'sha256',
    devHashMatch,
    validationFindings,
    decisionOutcome,
  });

  // Append-only write to trace log
  emitReviewTraceEntry(tracePath, reviewEntry);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idx = (flag: string) => args.indexOf(flag);
  const registryPath =
    idx('--registryPath') >= 0 ? args[idx('--registryPath') + 1] : './skills-registry.json';
  const tracePath =
    idx('--tracePath') >= 0 ? args[idx('--tracePath') + 1] : './trace.jsonl';
  const devTraceFile =
    idx('--devTraceFile') >= 0 ? args[idx('--devTraceFile') + 1] : './trace.jsonl';
  await runReviewAgent({ registryPath, tracePath, devTraceFile });
}

// DL-008: guard required — prevents main() firing at import time (breaks integration tests)
if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run integration tests — must pass**

```bash
npx jest tests/integration/s3-review-agent-trace.integration.test.ts --no-coverage --runInBand 2>&1
```

Expected output:
```
PASS  tests/integration/s3-review-agent-trace.integration.test.ts
  ✓ Full review agent run — reads dev trace from file, hashes skill, emits review trace
  ✓ Filesystem-only read — review agent reads fresh trace, not stale cache
  ✓ Hash mismatch integration — tampered dev trace causes reject-to-inbox
  ✓ Criteria completeness integration — missing criterion in dev trace becomes a finding
  ✓ NFR: Dev trace file is unchanged after review agent run
  ✓ NFR: Review trace appended to same log as dev trace
  ✓ NFR: No credentials or org data in review trace output

Tests: 7 passed, 7 total
```

- [ ] **Step 5: Run full test suite — no regressions**

```bash
npm test -- --no-coverage 2>&1
```

Expected output: `Tests: 23 passed, 23 total` (15 prior unit + 8 new unit = 23 total unit; prior integration noted separately)

- [ ] **Step 5b: Run full integration suite**

```bash
npm run test:integration -- --no-coverage --runInBand 2>&1
```

Expected output: `Tests: 18 passed, 18 total` (11 prior + 7 new — all integration suites passing)

- [ ] **Step 6: TSC check**

```bash
npx tsc --strict --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 6b: ADR-001 structural check — verify no cross-agent imports**

```bash
Select-String -Path .worktrees/s3-review-agent-trace-validation/src/agents/review-agent.ts -Pattern "dev-agent|assurance-agent" 2>&1
```

Expected output: (no matches — empty)

- [ ] **Step 7: Commit**

```bash
git add src/agents/review-agent.ts tests/integration/s3-review-agent-trace.integration.test.ts
git commit -m "feat: implement review-agent — trace validation, hash check, review trace emission (AC1-AC5)"
```

---

## Self-review checklist

- [x] Exact file paths — no `[placeholder]` remaining
- [x] Complete code in every Step 3 — no "add validation here"
- [x] Failing test written before implementation step in every task
- [x] Expected output for every run command
- [x] Commit messages in imperative mood
- [x] No scope beyond the relevant ACs
- [x] DL-008 guard in `review-agent.ts` Step 3 (present with explicit comment)
- [x] ADR-001 satisfied — `review-agent.ts` imports only from `lib/skill-loader`, `lib/trace-reader`, `lib/review-validator` (zero dev-agent/assurance-agent imports)
- [x] AC1 constraint — `runReviewAgent` receives `devTraceFile` as argument; `loadTraceFromFile` reads fresh from disk every call; no module-level state
- [x] Append-only — `emitReviewTraceEntry` uses `fs.appendFileSync`
