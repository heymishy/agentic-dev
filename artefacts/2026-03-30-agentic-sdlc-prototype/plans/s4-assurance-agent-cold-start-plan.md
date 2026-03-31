# Assurance agent runs cold-start, validates both traces — Implementation Plan

> **For agent execution:** Use /subagent-execution (if subagents available)
> or /tdd per task if executing in this session.

**Goal:** Extend the assurance agent to independently validate dev and review traces, confirm prompt hashes against versioned skill files, emit a complete assurance record, and document the cold-start independence mechanism.
**Branch:** `feature/s4-assurance-agent-cold-start`
**Worktree:** `.worktrees/s4-assurance-agent-cold-start`
**Test command:** `npm test -- --no-coverage` (unit), `npm run test:integration -- --no-coverage --runInBand` (integration)

---

## File map

```
Create:
  tests/fixtures/feature-assurance.skill.md               — assurance skill fixture for hash computation
  src/lib/assurance-validator.ts                           — domain logic: readTraceLog, validateDevTrace,
                                                             validateReviewTrace, buildAssuranceRecord,
                                                             emitAssuranceRecord
  tests/unit/s4-assurance-agent.test.ts                    — 9 unit tests (AC1–AC4)
  tests/integration/s4-assurance-agent.integration.test.ts — 4 integration + 3 NFR tests (AC1–AC5)

Modify:
  src/types/trace.ts                                       — replace AssuranceRecord stub with full interface
  src/agents/assurance-agent.ts                            — replace S1 stub with trace validation + DL-008
                                                             guard + S1 backward-compat
  README.md                                                — add cold-start independence section (AC5)
```

---

## Task 1: AssuranceRecord type extension + readTraceLog (AC1)

**AC covered:** AC1
**Files:**
- Modify: `src/types/trace.ts`
- Create: `src/lib/assurance-validator.ts`
- Create: `tests/fixtures/feature-assurance.skill.md`
- Create: `tests/unit/s4-assurance-agent.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/s4-assurance-agent.test.ts`:

```typescript
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { readTraceLog } from '../../src/lib/assurance-validator';

// ── AC1: readTraceLog ────────────────────────────────────────────────────────

describe('readTraceLog', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's4-unit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('parses valid trace log file and returns two typed entries', () => {
    const devEntry = {
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
      timestamp: '2026-03-30T00:00:00.000Z',
    };
    const reviewEntry = {
      agentIdentity: 'review',
      skillName: 'feature-review',
      skillVersion: '1.0.0',
      promptHash: 'b'.repeat(64),
      hashAlgorithm: 'sha256',
      devHashMatch: true,
      validationFindings: [],
      decisionOutcome: 'proceed-to-quality-review',
      timestamp: '2026-03-30T00:01:00.000Z',
    };
    const tracePath = path.join(tmpDir, 'trace.jsonl');
    fs.writeFileSync(
      tracePath,
      JSON.stringify(devEntry) + '\n' + JSON.stringify(reviewEntry) + '\n',
    );

    const result = readTraceLog(tracePath);

    expect(result).toHaveLength(2);
    expect(result[0].agentIdentity).toBe('dev');
    expect(result[1].agentIdentity).toBe('review');
    expect(result[0].promptHash).toBe('a'.repeat(64));
    expect(result[1].promptHash).toBe('b'.repeat(64));
  });

  test('throws if required fields missing from an entry', () => {
    const badEntry = {
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      // missing: skillVersion, promptHash, hashAlgorithm, timestamp
    };
    const tracePath = path.join(tmpDir, 'trace.jsonl');
    fs.writeFileSync(tracePath, JSON.stringify(badEntry) + '\n');

    expect(() => readTraceLog(tracePath)).toThrow(/missing required field/i);
  });
});
```

- [ ] **Step 2: Run test — must fail**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/unit/s4-assurance-agent.test.ts --no-coverage 2>&1
```

Expected output: `FAIL — Cannot find module '../../src/lib/assurance-validator'`

- [ ] **Step 3: Write minimal implementation**

**3a.** Replace the `AssuranceRecord` stub in `src/types/trace.ts`.

Find and replace:

```typescript
// Stub — extended in S4
export interface AssuranceRecord {
  agentIdentity: 'assurance';
  traceFilePath: string;
  outcome: 'approved' | 'rejected';
  timestamp: string;
}
```

With:

```typescript
export interface AssuranceRecord {
  agentIdentity: 'assurance';
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  devHashMatch: boolean;
  reviewHashMatch: boolean;
  criteriaOutcomes: CriterionResult[];
  verdict: 'closed' | 'escalate';
  timestamp: string;
}
```

**3b.** Create `src/lib/assurance-validator.ts`:

```typescript
import * as fs from 'fs';

export interface TraceLogEntry {
  agentIdentity: string;
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  timestamp: string;
  [key: string]: unknown;
}

const REQUIRED_TRACE_FIELDS: readonly string[] = [
  'agentIdentity',
  'skillName',
  'skillVersion',
  'promptHash',
  'hashAlgorithm',
  'timestamp',
];

export function readTraceLog(filePath: string): TraceLogEntry[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Trace file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error(`Trace file is empty: ${filePath}`);
  }
  return lines.map((line, i) => {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    for (const field of REQUIRED_TRACE_FIELDS) {
      if (parsed[field] === undefined) {
        throw new Error(`Trace entry ${i} missing required field: ${field}`);
      }
    }
    return parsed as unknown as TraceLogEntry;
  });
}
```

**3c.** Create `tests/fixtures/feature-assurance.skill.md`:

```markdown
---
name: feature-assurance
version: 1.0.0
---

# Feature Assurance Skill — Governance Policy

This skill governs the assurance agent's cold-start validation.

## Criteria

- DEV_TRACE_VERIFIED
- REVIEW_TRACE_VERIFIED
- ALL_CRITERIA_PASS
```

- [ ] **Step 4: Run test — must pass**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/unit/s4-assurance-agent.test.ts --no-coverage 2>&1
```

Expected output: `PASS — 2 tests passed`

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npm test -- --no-coverage 2>&1
```

Expected output: all existing tests + 2 new tests passing

- [ ] **Step 6: Commit**

```bash
cd .worktrees/s4-assurance-agent-cold-start
git add src/types/trace.ts src/lib/assurance-validator.ts tests/unit/s4-assurance-agent.test.ts tests/fixtures/feature-assurance.skill.md
git commit -m "feat(s4): extend AssuranceRecord type and add readTraceLog with AC1 unit tests"
```

---

## Task 2: validateDevTrace + validateReviewTrace (AC2, AC3)

**ACs covered:** AC2, AC3
**Files:**
- Modify: `src/lib/assurance-validator.ts` (add functions)
- Modify: `tests/unit/s4-assurance-agent.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/s4-assurance-agent.test.ts`:

```typescript
import * as crypto from 'crypto';
import { computeSkillHash } from '../../src/lib/skill-loader';
import { readTraceLog, validateDevTrace, validateReviewTrace, TraceLogEntry } from '../../src/lib/assurance-validator';

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');
const DEV_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');
const REVIEW_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-review.skill.md');

// ── AC2/AC3: computeSkillHash ────────────────────────────────────────────────

describe('computeSkillHash', () => {
  test('produces correct SHA-256 hex string for a known fixture', () => {
    const buf = fs.readFileSync(DEV_FIXTURE_SKILL);
    const expected = crypto.createHash('sha256').update(buf).digest('hex');

    const result = computeSkillHash(DEV_FIXTURE_SKILL);

    expect(result).toBe(expected);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  test('throws if file does not exist at given path', () => {
    expect(() =>
      computeSkillHash(path.join(FIXTURE_DIR, 'does-not-exist.md')),
    ).toThrow();
  });
});

// ── AC2: validateDevTrace ────────────────────────────────────────────────────

describe('validateDevTrace', () => {
  test('records dev-hash-match: true when hash matches fixture', () => {
    const actualHash = computeSkillHash(DEV_FIXTURE_SKILL);
    const devEntry: TraceLogEntry = {
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: actualHash,
      hashAlgorithm: 'sha256',
      timestamp: '2026-03-30T00:00:00.000Z',
    };

    const result = validateDevTrace(devEntry, DEV_FIXTURE_SKILL);

    expect(result.devHashMatch).toBe(true);
  });

  test('records dev-hash-match: false when hash does not match', () => {
    const devEntry: TraceLogEntry = {
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: 'b'.repeat(64),
      hashAlgorithm: 'sha256',
      timestamp: '2026-03-30T00:00:00.000Z',
    };

    const result = validateDevTrace(devEntry, DEV_FIXTURE_SKILL);

    expect(result.devHashMatch).toBe(false);
  });
});

// ── AC3: validateReviewTrace ─────────────────────────────────────────────────

describe('validateReviewTrace', () => {
  test('confirms review hash-match and review agent dev-hash-match result', () => {
    const reviewHash = computeSkillHash(REVIEW_FIXTURE_SKILL);
    const reviewEntry: TraceLogEntry = {
      agentIdentity: 'review',
      skillName: 'feature-review',
      skillVersion: '1.0.0',
      promptHash: reviewHash,
      hashAlgorithm: 'sha256',
      timestamp: '2026-03-30T00:01:00.000Z',
      devHashMatch: true,
    };

    const result = validateReviewTrace(reviewEntry, true, REVIEW_FIXTURE_SKILL);

    expect(result.reviewHashMatch).toBe(true);
    expect(result.reviewsDevHashMatch).toBe(true);
  });
});
```

> **Note:** The `computeSkillHash` tests verify existing S2 behaviour. They will
> pass immediately once the import resolves. The `validateDevTrace` and
> `validateReviewTrace` tests are the RED tests — they will fail until the
> functions are implemented below.

Consolidate the imports at the top of the test file. The final import block should be:

```typescript
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { computeSkillHash } from '../../src/lib/skill-loader';
import {
  readTraceLog,
  validateDevTrace,
  validateReviewTrace,
  TraceLogEntry,
} from '../../src/lib/assurance-validator';
```

- [ ] **Step 2: Run test — must fail**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/unit/s4-assurance-agent.test.ts --no-coverage 2>&1
```

Expected output: `FAIL — validateDevTrace is not a function` (computeSkillHash tests pass; validateDevTrace / validateReviewTrace tests fail)

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/assurance-validator.ts` (add `computeSkillHash` import at the top, then append these functions):

Add import at top of file:

```typescript
import { computeSkillHash } from './skill-loader';
```

Append after `readTraceLog`:

```typescript
export function validateDevTrace(
  devEntry: TraceLogEntry,
  skillPath: string,
): { devHashMatch: boolean } {
  const actualHash = computeSkillHash(skillPath);
  return { devHashMatch: devEntry.promptHash === actualHash };
}

export function validateReviewTrace(
  reviewEntry: TraceLogEntry,
  devHashMatch: boolean,
  skillPath: string,
): { reviewHashMatch: boolean; reviewsDevHashMatch: boolean } {
  const actualHash = computeSkillHash(skillPath);
  const reviewHashMatch = reviewEntry.promptHash === actualHash;
  const reviewRecordedDevHash = reviewEntry['devHashMatch'];
  const reviewsDevHashMatch =
    typeof reviewRecordedDevHash === 'boolean'
      ? reviewRecordedDevHash === devHashMatch
      : false;
  return { reviewHashMatch, reviewsDevHashMatch };
}
```

- [ ] **Step 4: Run test — must pass**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/unit/s4-assurance-agent.test.ts --no-coverage 2>&1
```

Expected output: `PASS — 7 tests passed`

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npm test -- --no-coverage 2>&1
```

Expected output: all existing tests + 7 new tests passing

- [ ] **Step 6: Commit**

```bash
cd .worktrees/s4-assurance-agent-cold-start
git add src/lib/assurance-validator.ts tests/unit/s4-assurance-agent.test.ts
git commit -m "feat(s4): add validateDevTrace and validateReviewTrace with AC2/AC3 unit tests"
```

---

## Task 3: buildAssuranceRecord + emitAssuranceRecord (AC4)

**AC covered:** AC4
**Files:**
- Modify: `src/lib/assurance-validator.ts` (add functions)
- Modify: `tests/unit/s4-assurance-agent.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/s4-assurance-agent.test.ts`:

```typescript
import { buildAssuranceRecord } from '../../src/lib/assurance-validator';

// ── AC4: buildAssuranceRecord ────────────────────────────────────────────────

describe('buildAssuranceRecord', () => {
  test('emits record with all required fields and closed verdict', () => {
    const record = buildAssuranceRecord({
      skillName: 'feature-assurance',
      skillVersion: '1.0.0',
      promptHash: 'c'.repeat(64),
      devResult: { devHashMatch: true },
      reviewResult: { reviewHashMatch: true, reviewsDevHashMatch: true },
    });

    expect(record.agentIdentity).toBe('assurance');
    expect(record.skillName).toBe('feature-assurance');
    expect(record.skillVersion).toBe('1.0.0');
    expect(record.promptHash).toBe('c'.repeat(64));
    expect(record.hashAlgorithm).toBe('sha256');
    expect(record.devHashMatch).toBe(true);
    expect(record.reviewHashMatch).toBe(true);
    expect(record.verdict).toBe('closed');
    expect(Array.isArray(record.criteriaOutcomes)).toBe(true);
    expect(record.criteriaOutcomes).toHaveLength(3);
    expect(record.criteriaOutcomes.every(c => c.result === 'pass')).toBe(true);
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
  });

  test('emits escalate verdict when dev hash does not match', () => {
    const record = buildAssuranceRecord({
      skillName: 'feature-assurance',
      skillVersion: '1.0.0',
      promptHash: 'c'.repeat(64),
      devResult: { devHashMatch: false },
      reviewResult: { reviewHashMatch: true, reviewsDevHashMatch: false },
    });

    expect(record.verdict).toBe('escalate');
    expect(record.devHashMatch).toBe(false);
    const devCriterion = record.criteriaOutcomes.find(
      c => c.criterion === 'DEV_TRACE_VERIFIED',
    );
    expect(devCriterion?.result).toBe('fail');
    expect(devCriterion?.reason).toBeDefined();
  });
});
```

Add `buildAssuranceRecord` to the import from `assurance-validator` at the top:

```typescript
import {
  readTraceLog,
  validateDevTrace,
  validateReviewTrace,
  buildAssuranceRecord,
  TraceLogEntry,
} from '../../src/lib/assurance-validator';
```

- [ ] **Step 2: Run test — must fail**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/unit/s4-assurance-agent.test.ts --no-coverage 2>&1
```

Expected output: `FAIL — buildAssuranceRecord is not a function`

- [ ] **Step 3: Write minimal implementation**

Add imports at top of `src/lib/assurance-validator.ts`:

```typescript
import * as path from 'path';
import { AssuranceRecord, CriterionResult } from '../types/trace';
```

Append after `validateReviewTrace`:

```typescript
export function buildAssuranceRecord(params: {
  skillName: string;
  skillVersion: string;
  promptHash: string;
  devResult: { devHashMatch: boolean };
  reviewResult: { reviewHashMatch: boolean; reviewsDevHashMatch: boolean };
}): AssuranceRecord {
  const devVerified = params.devResult.devHashMatch;
  const reviewVerified =
    params.reviewResult.reviewHashMatch && params.reviewResult.reviewsDevHashMatch;
  const allPass = devVerified && reviewVerified;

  const criteriaOutcomes: CriterionResult[] = [
    {
      criterion: 'DEV_TRACE_VERIFIED',
      result: devVerified ? 'pass' : 'fail',
      ...(devVerified
        ? {}
        : { reason: 'Dev trace prompt hash does not match feature-dev SKILL.md' }),
    },
    {
      criterion: 'REVIEW_TRACE_VERIFIED',
      result: reviewVerified ? 'pass' : 'fail',
      ...(reviewVerified ? {} : { reason: 'Review trace validation failed' }),
    },
    {
      criterion: 'ALL_CRITERIA_PASS',
      result: allPass ? 'pass' : 'fail',
      ...(allPass ? {} : { reason: 'Not all criteria passed' }),
    },
  ];

  return {
    agentIdentity: 'assurance',
    skillName: params.skillName,
    skillVersion: params.skillVersion,
    promptHash: params.promptHash,
    hashAlgorithm: 'sha256',
    devHashMatch: params.devResult.devHashMatch,
    reviewHashMatch: params.reviewResult.reviewHashMatch,
    criteriaOutcomes,
    verdict: allPass ? 'closed' : 'escalate',
    timestamp: new Date().toISOString(),
  };
}

export function emitAssuranceRecord(tracePath: string, record: AssuranceRecord): void {
  fs.mkdirSync(path.dirname(tracePath), { recursive: true });
  fs.appendFileSync(tracePath, JSON.stringify(record) + '\n', 'utf-8');
}
```

- [ ] **Step 4: Run test — must pass**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/unit/s4-assurance-agent.test.ts --no-coverage 2>&1
```

Expected output: `PASS — 9 tests passed`

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npm test -- --no-coverage 2>&1
```

Expected output: all existing tests + 9 new tests passing

- [ ] **Step 6: Commit**

```bash
cd .worktrees/s4-assurance-agent-cold-start
git add src/lib/assurance-validator.ts tests/unit/s4-assurance-agent.test.ts
git commit -m "feat(s4): add buildAssuranceRecord and emitAssuranceRecord with AC4 unit tests"
```

---

## Task 4: Assurance agent + integration/NFR tests + README (AC1–AC5)

**ACs covered:** AC1, AC2, AC3, AC4, AC5
**Files:**
- Modify: `src/agents/assurance-agent.ts` (full rewrite)
- Create: `tests/integration/s4-assurance-agent.integration.test.ts`
- Modify: `README.md` (add cold-start independence section)

- [ ] **Step 1: Write the failing tests**

Create `tests/integration/s4-assurance-agent.integration.test.ts`:

```typescript
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runAssuranceAgent } from '../../src/agents/assurance-agent';
import { computeSkillHash } from '../../src/lib/skill-loader';
import { AssuranceRecord, ReviewTraceEntry, TraceEntry } from '../../src/types/trace';

jest.setTimeout(30000);

const WORKTREE = path.resolve(__dirname, '..', '..');
const FIXTURE_DIR = path.join(WORKTREE, 'tests', 'fixtures');
const DEV_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');
const REVIEW_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-review.skill.md');
const ASSURANCE_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-assurance.skill.md');

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

function makeReviewTrace(overrides?: Partial<ReviewTraceEntry>): ReviewTraceEntry {
  const reviewSkillHash = computeSkillHash(REVIEW_FIXTURE_SKILL);
  return {
    agentIdentity: 'review',
    skillName: 'feature-review',
    skillVersion: '1.0.0',
    promptHash: reviewSkillHash,
    hashAlgorithm: 'sha256',
    devHashMatch: true,
    validationFindings: [],
    decisionOutcome: 'proceed-to-quality-review',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function writeTraceLog(
  tracePath: string,
  devTrace: TraceEntry,
  reviewTrace: ReviewTraceEntry,
): void {
  const content =
    JSON.stringify(devTrace) + '\n' + JSON.stringify(reviewTrace) + '\n';
  fs.writeFileSync(tracePath, content, 'utf-8');
}

function allThreeSkills(): Record<string, string> {
  return {
    'feature-dev': DEV_FIXTURE_SKILL,
    'feature-review': REVIEW_FIXTURE_SKILL,
    'feature-assurance': ASSURANCE_FIXTURE_SKILL,
  };
}

// ── AC1/AC2/AC3/AC4: Full assurance agent run ─────────────────────────────────

test('Full assurance agent run — reads trace log, validates both hashes, writes assurance record', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's4-full-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);
  writeTraceLog(tracePath, makeDevTrace(), makeReviewTrace());

  await runAssuranceAgent({ registryPath, tracePath });

  const lines = fs
    .readFileSync(tracePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(l => l.length > 0);
  expect(lines).toHaveLength(3); // dev + review + assurance
  const entry = JSON.parse(lines[2]) as AssuranceRecord;

  // AC1: read from file
  expect(entry.agentIdentity).toBe('assurance');
  // AC2: dev hash verified
  expect(entry.devHashMatch).toBe(true);
  // AC3: review hash verified
  expect(entry.reviewHashMatch).toBe(true);
  // AC4: all required fields
  expect(entry.skillName).toBe('feature-assurance');
  expect(typeof entry.skillVersion).toBe('string');
  expect(typeof entry.promptHash).toBe('string');
  expect(entry.hashAlgorithm).toBe('sha256');
  expect(Array.isArray(entry.criteriaOutcomes)).toBe(true);
  expect(entry.criteriaOutcomes).toHaveLength(3);
  expect(entry.verdict).toBe('closed');
  expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);

  // NFR: prior two entries unchanged
  const devAfter = JSON.parse(lines[0]) as TraceEntry;
  const reviewAfter = JSON.parse(lines[1]) as ReviewTraceEntry;
  expect(devAfter.agentIdentity).toBe('dev');
  expect(reviewAfter.agentIdentity).toBe('review');

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: Prior trace entries not modified ──────────────────────────────────────

test('Assurance agent — does not modify prior trace entries when appending', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's4-integrity-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);
  writeTraceLog(tracePath, makeDevTrace(), makeReviewTrace());

  const contentBefore = fs.readFileSync(tracePath, 'utf-8');
  const hashBefore = crypto
    .createHash('sha256')
    .update(contentBefore)
    .digest('hex');

  await runAssuranceAgent({ registryPath, tracePath });

  const contentAfter = fs.readFileSync(tracePath, 'utf-8');
  const priorContent = contentAfter.substring(0, contentBefore.length);
  const hashAfter = crypto
    .createHash('sha256')
    .update(priorContent)
    .digest('hex');
  expect(hashAfter).toBe(hashBefore);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── Skills path from registry ──────────────────────────────────────────────────

test('Assurance agent — skills path resolved from skills-registry.json, not hardcoded', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's4-registry-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  // Use fixture paths explicitly — confirms the registry is the authority
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);
  writeTraceLog(tracePath, makeDevTrace(), makeReviewTrace());

  await runAssuranceAgent({ registryPath, tracePath });

  const lines = fs
    .readFileSync(tracePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(l => l.length > 0);
  const entry = JSON.parse(lines[2]) as AssuranceRecord;

  // Hash in assurance record matches the fixture at the registry path
  const expectedAssuranceHash = computeSkillHash(ASSURANCE_FIXTURE_SKILL);
  expect(entry.promptHash).toBe(expectedAssuranceHash);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC5: Cold-start independence ───────────────────────────────────────────────

test('Cold-start independence — assurance agent reads fresh trace, not stale cache', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's4-stale-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);

  // First invocation: valid trace, all hashes match
  writeTraceLog(tracePath, makeDevTrace(), makeReviewTrace());
  await runAssuranceAgent({ registryPath, tracePath });

  // Overwrite trace log with tampered dev hash to prove fresh read
  const tamperedDev = makeDevTrace({ promptHash: 'f'.repeat(64) });
  writeTraceLog(tracePath, tamperedDev, makeReviewTrace({ devHashMatch: false }));
  await runAssuranceAgent({ registryPath, tracePath });

  // Read last line (second assurance record)
  const lines = fs
    .readFileSync(tracePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(l => l.length > 0);
  const lastEntry = JSON.parse(lines[lines.length - 1]) as AssuranceRecord;

  // If agent cached first trace (matching hashes): verdict would be 'closed'
  // If agent read fresh from disk (tampered hash): verdict is 'escalate'
  expect(lastEntry.verdict).toBe('escalate');
  expect(lastEntry.devHashMatch).toBe(false);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: Completes within 5 seconds ────────────────────────────────────────────

test('NFR: Full assurance run completes within 5 seconds', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's4-perf-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);
  writeTraceLog(tracePath, makeDevTrace(), makeReviewTrace());

  const start = Date.now();
  await runAssuranceAgent({ registryPath, tracePath });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(5000);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: No cross-agent imports ────────────────────────────────────────────────

test('NFR: No cross-agent imports in assurance agent module', () => {
  const agentSource = fs.readFileSync(
    path.join(WORKTREE, 'src', 'agents', 'assurance-agent.ts'),
    'utf-8',
  );
  const validatorSource = fs.readFileSync(
    path.join(WORKTREE, 'src', 'lib', 'assurance-validator.ts'),
    'utf-8',
  );
  const combined = agentSource + validatorSource;

  expect(combined).not.toMatch(/from\s+['"].*dev-agent/);
  expect(combined).not.toMatch(/from\s+['"].*review-agent/);
  expect(combined).not.toMatch(/require\s*\(\s*['"].*dev-agent/);
  expect(combined).not.toMatch(/require\s*\(\s*['"].*review-agent/);
});

// ── NFR: Trace log append-only ─────────────────────────────────────────────────

test('NFR: Trace log write is append-only — no truncation or overwrite', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's4-append-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);
  writeTraceLog(tracePath, makeDevTrace(), makeReviewTrace());

  const sizeBefore = fs.statSync(tracePath).size;

  await runAssuranceAgent({ registryPath, tracePath });

  const sizeAfter = fs.statSync(tracePath).size;
  expect(sizeAfter).toBeGreaterThan(sizeBefore);

  // First two entries parseable and unchanged
  const lines = fs
    .readFileSync(tracePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(l => l.length > 0);
  expect(lines).toHaveLength(3);
  expect((JSON.parse(lines[0]) as TraceEntry).agentIdentity).toBe('dev');
  expect((JSON.parse(lines[1]) as ReviewTraceEntry).agentIdentity).toBe('review');

  fs.rmSync(tmpDir, { recursive: true });
});
```

- [ ] **Step 2: Run test — must fail**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/integration/s4-assurance-agent.integration.test.ts --no-coverage --runInBand --testTimeout=30000 2>&1
```

Expected output: `FAIL — runAssuranceAgent is not a function` (the current S1 stub does not export `runAssuranceAgent`)

- [ ] **Step 3: Write minimal implementation**

**3a.** Replace `src/agents/assurance-agent.ts` entirely with:

```typescript
import * as fs from 'fs';
import * as path from 'path';

import {
  computeSkillHash,
  loadSkillFromRegistry,
  parseSkillVersion,
} from '../lib/skill-loader';
import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client';
import {
  readTraceLog,
  validateDevTrace,
  validateReviewTrace,
  buildAssuranceRecord,
  emitAssuranceRecord,
} from '../lib/assurance-validator';

export async function runAssuranceAgent(config: {
  registryPath: string;
  tracePath: string;
}): Promise<void> {
  const { registryPath, tracePath } = config;

  // AC1: read both trace entries from trace log file only — no module-level cache
  const entries = readTraceLog(tracePath);
  const devEntry = entries.find(e => e.agentIdentity === 'dev');
  const reviewEntry = entries.find(e => e.agentIdentity === 'review');
  if (!devEntry || !reviewEntry) {
    throw new Error('Trace log must contain both dev and review entries');
  }

  // Load assurance skill (for this agent's own promptHash + version)
  const assuranceSkillPath = loadSkillFromRegistry(registryPath, 'feature-assurance');
  const assuranceSkillContent = fs.readFileSync(assuranceSkillPath, 'utf-8');
  const assurancePromptHash = computeSkillHash(assuranceSkillPath);
  const assuranceSkillVersion = parseSkillVersion(assuranceSkillContent);

  // AC2: independently validate dev trace hash
  const devSkillPath = loadSkillFromRegistry(registryPath, 'feature-dev');
  const devResult = validateDevTrace(devEntry, devSkillPath);

  // AC3: independently validate review trace hash + confirm review's dev hash result
  const reviewSkillPath = loadSkillFromRegistry(registryPath, 'feature-review');
  const reviewResult = validateReviewTrace(
    reviewEntry,
    devResult.devHashMatch,
    reviewSkillPath,
  );

  // AC4: build and emit assurance record
  const record = buildAssuranceRecord({
    skillName: 'feature-assurance',
    skillVersion: assuranceSkillVersion,
    promptHash: assurancePromptHash,
    devResult,
    reviewResult,
  });

  emitAssuranceRecord(tracePath, record);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idx = (flag: string) => args.indexOf(flag);

  // S1 backward-compat: if --queueRoot is passed, run queue-moving mode
  if (idx('--queueRoot') >= 0) {
    const queueRoot = args[idx('--queueRoot') + 1];
    const taskId = idx('--taskId') >= 0 ? args[idx('--taskId') + 1] : null;
    const qualityReview = path.join(queueRoot, 'quality-review');
    const done = path.join(queueRoot, 'done');
    const historyPath = path.join(queueRoot, 'history.jsonl');
    const resolvedTaskId = taskId ?? getTaskInDir(qualityReview);
    moveTask(resolvedTaskId, qualityReview, done);
    appendHistory(resolvedTaskId, 'quality-review', 'done', historyPath);
    return;
  }

  const registryPath =
    idx('--registryPath') >= 0 ? args[idx('--registryPath') + 1] : './skills-registry.json';
  const tracePath =
    idx('--tracePath') >= 0 ? args[idx('--tracePath') + 1] : './trace.jsonl';

  await runAssuranceAgent({ registryPath, tracePath });
}

// DL-008: guard required — prevents main() firing at import time (breaks integration tests)
if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
  });
}
```

**3b.** Add cold-start independence section to `README.md`.

Insert before the `## Repo structure` section (around line 815):

```markdown
## Cold-start independence

Each agent in the quality loop — dev, review, and assurance — runs as a separate Node.js process invocation. No agent shares module-level state, conversation context, or execution environment with any other agent. The only artefact that flows between agents is the append-only trace log file on the local filesystem.

The assurance agent enforces this boundary explicitly:

1. **Import-level isolation.** `assurance-agent.ts` has zero imports from `dev-agent.ts` or `review-agent.ts`. An automated test asserts this at build time.
2. **Filesystem-only input.** The assurance agent reads the trace log file path from a command-line argument and loads both prior trace entries from disk on every invocation. It holds no cached or module-level copy of any prior agent's output.
3. **Independent hash computation.** The assurance agent loads `feature-dev` and `feature-review` SKILL.md files directly from the filesystem and computes SHA-256 hashes independently. It does not reuse hashes recorded by any prior agent.

This design means the assurance record's cryptographic claims are independently verifiable: the same versioned policy documents that governed the original decisions also governed the validation of those decisions. A reviewer can confirm this by inspecting the assurance agent's source and running the no-cross-imports test and cold-start integration test.

---
```

- [ ] **Step 4: Run test — must pass**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npx jest tests/integration/s4-assurance-agent.integration.test.ts --no-coverage --runInBand --testTimeout=30000 2>&1
```

Expected output: `PASS — 7 tests passed`

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd .worktrees/s4-assurance-agent-cold-start && npm test -- --no-coverage 2>&1 && npm run test:integration -- --no-coverage --runInBand 2>&1
```

Expected output: all unit tests (existing + 9 new) passing; all integration tests (existing + 7 new) passing.

Known pre-existing: S2 `tsc --strict --noEmit` integration test may timeout (status `null`) — this is a pre-existing baseline issue, not S4-related.

- [ ] **Step 6: Commit**

```bash
cd .worktrees/s4-assurance-agent-cold-start
git add src/agents/assurance-agent.ts tests/integration/s4-assurance-agent.integration.test.ts README.md
git commit -m "feat(s4): rewrite assurance agent with trace validation, add integration/NFR tests and README cold-start section"
```
