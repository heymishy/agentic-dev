# S2: Dev agent loads skill, self-checks against falsifiable criteria, emits trace — Implementation Plan

> **For agent execution:** use /tdd per task in this session.

**Goal:** Make all 11 AC-mapped tests in the test plan pass. Extend the dev agent to load `feature-dev` skill from the local filesystem via `skills-registry.json`, compute SHA-256 hash, evaluate output against falsifiable criteria, and emit a structured `TraceEntry`. No external services. TypeScript strict throughout.

**Branch:** `feature/s2-dev-agent-skill-trace`
**Worktree:** `.worktrees/s2-dev-agent-skill-trace`
**Test command (unit):** `npm test -- --no-coverage`
**Test command (integration):** `npm run test:integration -- --no-coverage`
**TSC check:** `npx tsc --strict --noEmit`

**Model routing:** Tasks 1–3 → balanced. Tasks 4–5 → balanced (no ambiguity; DL-007 applies to integration).

---

## File map

```
Create:
  src/types/trace.ts                              — TraceEntry, CriterionResult, DevAgentOutput, AssuranceRecord stub
  src/lib/skill-loader.ts                         — loadSkillFromRegistry, computeSkillHash, parseCriteria,
                                                    parseSkillVersion, evaluateCriteria, buildTraceEntry, emitTraceEntry
  skills/feature-dev/SKILL.md                    — production feature-dev skill (3 criteria, version: 1.0.0)
  skills/feature-review/SKILL.md                 — stub for S3
  skills/feature-assurance/SKILL.md              — stub for S4
  skills-registry.json                           — maps feature-dev/review/assurance → ./skills/*/SKILL.md (repo root)
  tests/fixtures/feature-dev.skill.md            — synthetic fixture with fixed LF-only content
  tests/fixtures/feature-dev-alt.skill.md        — alternate fixture (version: 2.0.0) for registry resolution test
  tests/unit/s2-dev-agent.test.ts                — 8 unit tests
  tests/integration/s2-dev-agent-trace.integration.test.ts  — 3 integration tests + 3 NFR checks

Modify:
  src/agents/dev-agent.ts                        — export runDevAgent(), add --registryPath/--tracePath CLI args,
                                                    wire skill loading, criteria evaluation, trace emission into main()
```

---

## Task 1: Types, fixtures, skills, and registry (ground truth — no failing tests)

**Files:**
- Create: `src/types/trace.ts`
- Create: `tests/fixtures/feature-dev.skill.md`
- Create: `tests/fixtures/feature-dev-alt.skill.md`
- Create: `skills/feature-dev/SKILL.md`
- Create: `skills/feature-review/SKILL.md`
- Create: `skills/feature-assurance/SKILL.md`
- Create: `skills-registry.json`

No test file — TypeScript compiler is the assertion for types.

- [ ] **Step 1: Create `src/types/trace.ts`**

```typescript
export interface CriterionResult {
  criterion: string;
  result: 'pass' | 'fail' | 'not-applicable';
  reason?: string;
}

export interface DevAgentOutput {
  implementationFile: string | null;
  testFile: string | null;
  changelogEntry: string | null;
}

export interface TraceEntry {
  agentIdentity: string;
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  criteriaResults: CriterionResult[];
  decisionOutcome: 'proceed' | 'reject';
  timestamp: string;
}

// Stub — extended in S4
export interface AssuranceRecord {
  agentIdentity: 'assurance';
  traceFilePath: string;
  outcome: 'approved' | 'rejected';
  timestamp: string;
}
```

- [ ] **Step 2: Create fixture files using Node.js (ensures LF-only line endings — critical for hash determinism)**

Run in PowerShell from the worktree root:

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"

# Primary fixture
node -e "
const fs = require('fs');
const content = [
  '---',
  'name: feature-dev',
  'version: 1.0.0',
  '---',
  '',
  '# Feature Dev Skill — Governance Policy',
  '',
  'This skill governs the dev agent\'s implementation work.',
  '',
  '## Criteria',
  '',
  '- HAS_IMPLEMENTATION_FILE',
  '- HAS_TEST_FILE',
  '- HAS_CHANGELOG_ENTRY',
  ''
].join('\n');
fs.mkdirSync('tests/fixtures', { recursive: true });
fs.writeFileSync('tests/fixtures/feature-dev.skill.md', content, { encoding: 'utf-8' });
console.log('fixture written, bytes:', Buffer.byteLength(content, 'utf-8'));
"

# Alternate fixture (version: 2.0.0 — different bytes, different hash)
node -e "
const fs = require('fs');
const content = [
  '---',
  'name: feature-dev',
  'version: 2.0.0',
  '---',
  '',
  '# Feature Dev Skill — Governance Policy',
  '',
  'This skill governs the dev agent\'s implementation work.',
  '',
  '## Criteria',
  '',
  '- HAS_IMPLEMENTATION_FILE',
  '- HAS_TEST_FILE',
  '- HAS_CHANGELOG_ENTRY',
  ''
].join('\n');
fs.writeFileSync('tests/fixtures/feature-dev-alt.skill.md', content, { encoding: 'utf-8' });
console.log('alt fixture written, bytes:', Buffer.byteLength(content, 'utf-8'));
"

Pop-Location
```

Expected output:
```
fixture written, bytes: 165
alt fixture written, bytes: 165
```
(byte counts may differ slightly — the point is they're reported and non-zero)

- [ ] **Step 3: Create the three production skill files**

`skills/feature-dev/SKILL.md` — identical content to primary fixture (same criteria, same version):

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
node -e "
const fs = require('fs');
const content = [
  '---',
  'name: feature-dev',
  'version: 1.0.0',
  '---',
  '',
  '# Feature Dev Skill — Governance Policy',
  '',
  'This skill governs the dev agent\'s implementation work.',
  '',
  '## Criteria',
  '',
  '- HAS_IMPLEMENTATION_FILE',
  '- HAS_TEST_FILE',
  '- HAS_CHANGELOG_ENTRY',
  ''
].join('\n');
fs.mkdirSync('skills/feature-dev', { recursive: true });
fs.writeFileSync('skills/feature-dev/SKILL.md', content, { encoding: 'utf-8' });
"

node -e "
const fs = require('fs');
const content = [
  '---',
  'name: feature-review',
  'version: 1.0.0',
  '---',
  '',
  '# Feature Review Skill — Governance Policy',
  '',
  'This skill governs the review agent\'s validation work.',
  '',
  '## Criteria',
  '',
  '- TRACE_ENTRY_PRESENT',
  '- PROMPT_HASH_VERIFIABLE',
  '- DECISION_OUTCOME_VALID',
  ''
].join('\n');
fs.mkdirSync('skills/feature-review', { recursive: true });
fs.writeFileSync('skills/feature-review/SKILL.md', content, { encoding: 'utf-8' });
"

node -e "
const fs = require('fs');
const content = [
  '---',
  'name: feature-assurance',
  'version: 1.0.0',
  '---',
  '',
  '# Feature Assurance Skill — Governance Policy',
  '',
  'This skill governs the assurance agent\'s cold-start validation.',
  '',
  '## Criteria',
  '',
  '- DEV_TRACE_VERIFIED',
  '- REVIEW_TRACE_VERIFIED',
  '- ALL_CRITERIA_PASS',
  ''
].join('\n');
fs.mkdirSync('skills/feature-assurance', { recursive: true });
fs.writeFileSync('skills/feature-assurance/SKILL.md', content, { encoding: 'utf-8' });
"
Pop-Location
```

- [ ] **Step 4: Create `skills-registry.json` at worktree root**

```json
{
  "feature-dev": "./skills/feature-dev/SKILL.md",
  "feature-review": "./skills/feature-review/SKILL.md",
  "feature-assurance": "./skills/feature-assurance/SKILL.md"
}
```

File path: `.worktrees/s2-dev-agent-skill-trace/skills-registry.json`

- [ ] **Step 5: Run TSC — must exit 0**

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
npx tsc --strict --noEmit
```

Expected output: no errors, exit code 0.

- [ ] **Step 6: Run unit suite — baseline unchanged**

```powershell
npm test -- --no-coverage 2>&1 | Select-Object -Last 5
```

Expected: `7 passed, 7 total`

- [ ] **Step 7: Commit**

```powershell
git add src/types/trace.ts tests/fixtures/ skills/ skills-registry.json
git commit -m "feat: add TraceEntry types, skill fixtures, production skill stubs, skills-registry.json"
```

---

## Task 2: skill-loader.ts — loadSkillFromRegistry + computeSkillHash (TDD)

**Files:**
- Create: `src/lib/skill-loader.ts`
- Create: `tests/unit/s2-dev-agent.test.ts` (first 4 tests)

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/s2-dev-agent.test.ts`:

```typescript
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  loadSkillFromRegistry,
  computeSkillHash,
} from '../../src/lib/skill-loader';

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');
const FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');

describe('loadSkillFromRegistry', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-registry-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('resolves correct file path for a known skill name', () => {
    const registry = {
      'feature-dev': './tests/fixtures/feature-dev.skill.md',
      'feature-review': './tests/fixtures/feature-dev.skill.md',
      'feature-assurance': './tests/fixtures/feature-dev.skill.md',
    };
    const registryPath = path.join(tmpDir, 'skills-registry.json');
    fs.writeFileSync(registryPath, JSON.stringify(registry), 'utf-8');

    const result = loadSkillFromRegistry(registryPath, 'feature-dev');
    expect(result).toBe('./tests/fixtures/feature-dev.skill.md');
  });

  test('throws when requested skill name is absent from registry', () => {
    const registry = { 'feature-dev': './x.md', 'feature-review': './y.md' };
    const registryPath = path.join(tmpDir, 'skills-registry.json');
    fs.writeFileSync(registryPath, JSON.stringify(registry), 'utf-8');

    expect(() => loadSkillFromRegistry(registryPath, 'feature-assurance'))
      .toThrow(/feature-assurance/);
  });
});

describe('computeSkillHash', () => {
  test('produces correct SHA-256 hex string for known fixture', () => {
    // Read the pre-computed hash from the companion file (written at fixture creation time)
    // If feature-dev.skill.sha256 does not exist, this test will fail until Task 1 Step 2b runs
    const expectedHash = fs
      .readFileSync(path.join(FIXTURE_DIR, 'feature-dev.skill.sha256'), 'utf-8')
      .trim();
    const result = computeSkillHash(FIXTURE_SKILL);
    expect(result).toBe(expectedHash);
  });

  test('throws if skill file does not exist at resolved path', () => {
    expect(() => computeSkillHash('/does-not-exist/skill.md')).toThrow();
  });
});
```

Note: `tests/fixtures/feature-dev.skill.sha256` must exist before this test can pass. Create it now:

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
node -e "
const fs = require('fs'), c = require('crypto');
const hash = c.createHash('sha256').update(fs.readFileSync('tests/fixtures/feature-dev.skill.md')).digest('hex');
fs.writeFileSync('tests/fixtures/feature-dev.skill.sha256', hash, { encoding: 'utf-8' });
console.log('SHA-256:', hash);
"
Pop-Location
```

Expected: prints a 64-character lowercase hex string. Record it — this is the ground-truth hash used in the unit test.

- [ ] **Step 2: Run tests — must fail (RED)**

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
npx jest tests/unit/s2-dev-agent.test.ts --no-coverage 2>&1 | Select-Object -Last 8
Pop-Location
```

Expected: `FAIL` — `Cannot find module '../../src/lib/skill-loader'`

- [ ] **Step 3: Create `src/lib/skill-loader.ts`** (minimal — only what Task 2 tests need)

```typescript
import * as fs from 'fs';
import * as crypto from 'crypto';

import { CriterionResult, DevAgentOutput, TraceEntry } from '../types/trace';

export function loadSkillFromRegistry(registryPath: string, skillName: string): string {
  const raw = fs.readFileSync(registryPath, 'utf-8');
  const registry = JSON.parse(raw) as Record<string, string>;
  const skillPath = registry[skillName];
  if (!skillPath) {
    throw new Error(`Skill "${skillName}" not found in registry at ${registryPath}`);
  }
  return skillPath;
}

export function computeSkillHash(filePath: string): string {
  const buf = fs.readFileSync(filePath); // Buffer — not string — for byte-accurate hash
  return crypto.createHash('sha256').update(buf).digest('hex');
}
```

- [ ] **Step 4: Run tests — must pass (GREEN)**

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
npx jest tests/unit/s2-dev-agent.test.ts --no-coverage 2>&1 | Select-Object -Last 8
Pop-Location
```

Expected: `PASS — 4 tests, 0 failures`

- [ ] **Step 5: Full suite — no regressions**

```powershell
npm test -- --no-coverage 2>&1 | Select-Object -Last 5
```

Expected: `11 passed, 11 total` (7 S1 + 4 new)

- [ ] **Step 6: TSC check**

```powershell
npx tsc --strict --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/skill-loader.ts tests/unit/s2-dev-agent.test.ts tests/fixtures/feature-dev.skill.sha256
git commit -m "feat: add skill-loader (loadSkillFromRegistry, computeSkillHash) with 4 unit tests"
```

---

## Task 3: skill-loader.ts — criteria + trace building (TDD)

**Files:**
- Modify: `src/lib/skill-loader.ts` (add parseCriteria, parseSkillVersion, evaluateCriteria, buildTraceEntry, emitTraceEntry)
- Modify: `tests/unit/s2-dev-agent.test.ts` (update imports, append 4 more tests)

- [ ] **Step 1: Update imports and append 4 failing tests to the unit test file**

Replace the import block at the top of `tests/unit/s2-dev-agent.test.ts`:

```typescript
// OLD (replace this):
import {
  loadSkillFromRegistry,
  computeSkillHash,
} from '../../src/lib/skill-loader';

// NEW:
import {
  loadSkillFromRegistry,
  computeSkillHash,
  evaluateCriteria,
  parseCriteria,
  buildTraceEntry,
} from '../../src/lib/skill-loader';
import { DevAgentOutput } from '../../src/types/trace';
```

Append at the end of `tests/unit/s2-dev-agent.test.ts`:

```typescript
describe('evaluateCriteria', () => {
  const skillContent = fs.readFileSync(FIXTURE_SKILL, 'utf-8');
  const criteria = parseCriteria(skillContent);

  const allPassOutput: DevAgentOutput = {
    implementationFile: 'src/agents/dev-agent.ts',
    testFile: 'tests/unit/queue-client.test.ts',
    changelogEntry: 'S2: dev agent skill trace',
  };

  test('returns all-pass list when output satisfies every criterion', () => {
    const results = evaluateCriteria(criteria, allPassOutput);
    expect(results).toHaveLength(3);
    expect(results.every(r => r.result === 'pass')).toBe(true);
    results.forEach(r => expect(r.reason).toBeUndefined());
  });

  test('marks failing criterion with fail result and non-empty reason string', () => {
    const failOutput: DevAgentOutput = {
      implementationFile: 'src/agents/dev-agent.ts',
      testFile: 'tests/unit/queue-client.test.ts',
      changelogEntry: null, // changelog missing
    };
    const results = evaluateCriteria(criteria, failOutput);
    const changelogResult = results.find(r => r.criterion === 'HAS_CHANGELOG_ENTRY');
    expect(changelogResult?.result).toBe('fail');
    expect(typeof changelogResult?.reason).toBe('string');
    expect((changelogResult?.reason as string).trim().length).toBeGreaterThan(0);
  });
});

describe('buildTraceEntry', () => {
  const allPassCriteria = [
    { criterion: 'HAS_IMPLEMENTATION_FILE', result: 'pass' as const },
    { criterion: 'HAS_TEST_FILE', result: 'pass' as const },
    { criterion: 'HAS_CHANGELOG_ENTRY', result: 'pass' as const },
  ];

  test('produces trace entry containing all 8 required fields', () => {
    const entry = buildTraceEntry({
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: 'abc123deadbeef',
      hashAlgorithm: 'sha256',
      criteriaResults: allPassCriteria,
      decisionOutcome: 'proceed',
    });
    expect(entry.agentIdentity).toBe('dev');
    expect(entry.skillName).toBe('feature-dev');
    expect(entry.skillVersion).toBe('1.0.0');
    expect(entry.promptHash).toBe('abc123deadbeef');
    expect(entry.hashAlgorithm).toBe('sha256');
    expect(entry.criteriaResults).toHaveLength(3);
    expect(entry.decisionOutcome).toBe('proceed');
    expect(typeof entry.timestamp).toBe('string');
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  test('sets decisionOutcome to reject and preserves reason when a criterion fails', () => {
    const failCriteria = [
      { criterion: 'HAS_IMPLEMENTATION_FILE', result: 'pass' as const },
      { criterion: 'HAS_TEST_FILE', result: 'fail' as const, reason: 'testFile is null — no test file produced' },
      { criterion: 'HAS_CHANGELOG_ENTRY', result: 'pass' as const },
    ];
    const entry = buildTraceEntry({
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: 'abc123deadbeef',
      hashAlgorithm: 'sha256',
      criteriaResults: failCriteria,
      decisionOutcome: 'reject',
    });
    expect(entry.decisionOutcome).toBe('reject');
    const failResult = entry.criteriaResults.find(r => r.result === 'fail');
    expect(failResult?.reason).toBe('testFile is null — no test file produced');
  });
});
```

- [ ] **Step 2: Run failing tests (RED)**

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
npx jest tests/unit/s2-dev-agent.test.ts --no-coverage 2>&1 | Select-Object -Last 10
Pop-Location
```

Expected: `FAIL` — `evaluateCriteria is not a function` (or `parseCriteria is not a function`)

- [ ] **Step 3: Append to `src/lib/skill-loader.ts`** (add all remaining exports after `computeSkillHash`)

```typescript
// ── append after computeSkillHash ──────────────────────────────────────────

export function parseSkillVersion(skillContent: string): string {
  const match = /^version:\s*(.+)$/m.exec(skillContent);
  return match ? match[1].trim() : 'unknown';
}

export function parseCriteria(skillContent: string): string[] {
  const match = /## Criteria\n([\s\S]*?)(?:\n##|$)/.exec(skillContent);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(line => line.replace(/^-\s+/, '').trim())
    .filter(line => line.length > 0);
}

const CRITERION_CHECKS: Record<string, (output: DevAgentOutput) => { pass: boolean; reason?: string }> = {
  HAS_IMPLEMENTATION_FILE: (o) =>
    o.implementationFile !== null
      ? { pass: true }
      : { pass: false, reason: 'implementationFile is null — no implementation produced' },
  HAS_TEST_FILE: (o) =>
    o.testFile !== null
      ? { pass: true }
      : { pass: false, reason: 'testFile is null — no test file produced' },
  HAS_CHANGELOG_ENTRY: (o) =>
    o.changelogEntry !== null
      ? { pass: true }
      : { pass: false, reason: 'changelogEntry is null — no changelog entry produced' },
};

export function evaluateCriteria(criteria: string[], output: DevAgentOutput): CriterionResult[] {
  return criteria.map(criterion => {
    const check = CRITERION_CHECKS[criterion];
    if (!check) return { criterion, result: 'not-applicable' as const };
    const { pass, reason } = check(output);
    if (pass) return { criterion, result: 'pass' as const };
    return { criterion, result: 'fail' as const, reason };
  });
}

export function buildTraceEntry(params: {
  agentIdentity: string;
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  criteriaResults: CriterionResult[];
  decisionOutcome: 'proceed' | 'reject';
}): TraceEntry {
  return { ...params, timestamp: new Date().toISOString() };
}

export function emitTraceEntry(tracePath: string, entry: TraceEntry): void {
  fs.appendFileSync(tracePath, JSON.stringify(entry) + '\n', 'utf-8');
}
```

- [ ] **Step 4: Run tests — must pass (GREEN)**

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
npx jest tests/unit/s2-dev-agent.test.ts --no-coverage 2>&1 | Select-Object -Last 8
Pop-Location
```

Expected: `PASS — 8 tests, 0 failures`

- [ ] **Step 5: Full suite — no regressions**

```powershell
npm test -- --no-coverage 2>&1 | Select-Object -Last 5
```

Expected: `15 passed, 15 total` (7 S1 + 8 new)

- [ ] **Step 6: TSC check**

```powershell
npx tsc --strict --noEmit
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/skill-loader.ts tests/unit/s2-dev-agent.test.ts
git commit -m "feat: add criteria evaluation, trace building, and emit functions to skill-loader (8 unit tests)"
```

---

## Task 4: Integration tests (RED — runDevAgent not yet exported)

**Files:**
- Create: `tests/integration/s2-dev-agent-trace.integration.test.ts`

Write the tests BEFORE extending dev-agent.ts. They will all fail because `runDevAgent` does not exist yet.

- [ ] **Step 1: Create integration test file**

```typescript
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runDevAgent } from '../../src/agents/dev-agent';
import { computeSkillHash, parseCriteria, parseSkillVersion } from '../../src/lib/skill-loader';
import { TraceEntry, DevAgentOutput } from '../../src/types/trace';

jest.setTimeout(30000); // DL-007: subprocess-heavy suites need this (also covers NFR tsc check)

const WORKTREE = path.resolve(__dirname, '..', '..');
const FIXTURE_DIR = path.join(WORKTREE, 'tests', 'fixtures');
const FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');
const ALT_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev-alt.skill.md');

function makeRegistry(entries: Record<string, string>, dir: string): string {
  const registryPath = path.join(dir, 'skills-registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(entries), 'utf-8');
  return registryPath;
}

function makeQueueFixture(dir: string, taskId: string): void {
  ['inbox', 'review', 'quality-review', 'done'].forEach(sub =>
    fs.mkdirSync(path.join(dir, sub), { recursive: true }),
  );
  fs.writeFileSync(path.join(dir, 'inbox', `${taskId}.json`), JSON.stringify({ id: taskId }), 'utf-8');
  fs.writeFileSync(path.join(dir, 'history.jsonl'), '', 'utf-8');
}

const allPassOutput: DevAgentOutput = {
  implementationFile: 'src/agents/dev-agent.ts',
  testFile: 'tests/unit/queue-client.test.ts',
  changelogEntry: 'S2: dev agent skill trace',
};

// ── AC1 / AC3 / AC4: full trace roundtrip ─────────────────────────────────

test('AC1/AC3/AC4: full dev agent run — trace written with all fields, hash independently verifiable', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-integration-'));
  const queueRoot = path.join(tmpDir, 'queue');
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  makeQueueFixture(queueRoot, 'task-s2-001');

  const registryPath = makeRegistry(
    { 'feature-dev': FIXTURE_SKILL, 'feature-review': FIXTURE_SKILL, 'feature-assurance': FIXTURE_SKILL },
    tmpDir,
  );

  await runDevAgent({ queueRoot, taskId: 'task-s2-001', registryPath, tracePath, output: allPassOutput });

  // Trace file must exist
  expect(fs.existsSync(tracePath)).toBe(true);

  // Must be valid JSON parseable as TraceEntry
  const raw = fs.readFileSync(tracePath, 'utf-8').trim();
  const entry = JSON.parse(raw) as TraceEntry;

  // All 8 required fields present
  expect(entry.agentIdentity).toBe('dev');
  expect(entry.skillName).toBe('feature-dev');
  expect(typeof entry.skillVersion).toBe('string');
  expect(entry.hashAlgorithm).toBe('sha256');
  expect(Array.isArray(entry.criteriaResults)).toBe(true);
  expect(entry.decisionOutcome).toBe('proceed');
  expect(typeof entry.timestamp).toBe('string');
  expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);

  // AC4: hash independently verifiable — compute SHA-256 of the fixture file we pointed at
  const expectedHash = computeSkillHash(FIXTURE_SKILL);
  expect(entry.promptHash).toBe(expectedHash);

  // Task moved to review on proceed
  expect(fs.existsSync(path.join(queueRoot, 'review', 'task-s2-001.json'))).toBe(true);
  expect(fs.existsSync(path.join(queueRoot, 'inbox', 'task-s2-001.json'))).toBe(false);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC6: registry resolution — path is dynamic, not hardcoded ─────────────

test('AC6: skill path resolved from registry — alternate registry produces different hash in trace', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-registry-'));
  const queueRoot = path.join(tmpDir, 'queue');
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  makeQueueFixture(queueRoot, 'task-s2-002');

  // Registry pointing to the ALT fixture (version: 2.0.0 — different bytes, different hash)
  const altRegistryPath = makeRegistry(
    { 'feature-dev': ALT_FIXTURE_SKILL, 'feature-review': ALT_FIXTURE_SKILL, 'feature-assurance': ALT_FIXTURE_SKILL },
    tmpDir,
  );

  await runDevAgent({ queueRoot, taskId: 'task-s2-002', registryPath: altRegistryPath, tracePath, output: allPassOutput });

  const entry = JSON.parse(fs.readFileSync(tracePath, 'utf-8').trim()) as TraceEntry;

  // Hash must match ALT fixture — NOT the primary fixture
  const altHash = computeSkillHash(ALT_FIXTURE_SKILL);
  const primaryHash = computeSkillHash(FIXTURE_SKILL);
  expect(entry.promptHash).toBe(altHash);
  expect(entry.promptHash).not.toBe(primaryHash); // confirms hashes actually differ

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC5: reject path — task stays in inbox, trace still written ────────────

test('AC5: failing criterion — task stays in inbox, trace written with decisionOutcome: reject', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-reject-'));
  const queueRoot = path.join(tmpDir, 'queue');
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  makeQueueFixture(queueRoot, 'task-s2-003');

  const registryPath = makeRegistry(
    { 'feature-dev': FIXTURE_SKILL, 'feature-review': FIXTURE_SKILL, 'feature-assurance': FIXTURE_SKILL },
    tmpDir,
  );

  const failingOutput: DevAgentOutput = {
    implementationFile: 'src/agents/dev-agent.ts',
    testFile: 'tests/unit/queue-client.test.ts',
    changelogEntry: null, // missing — criterion fails
  };

  await runDevAgent({ queueRoot, taskId: 'task-s2-003', registryPath, tracePath, output: failingOutput });

  // Trace IS written (reject does not suppress trace)
  expect(fs.existsSync(tracePath)).toBe(true);
  const entry = JSON.parse(fs.readFileSync(tracePath, 'utf-8').trim()) as TraceEntry;
  expect(entry.decisionOutcome).toBe('reject');

  // Failing criterion must appear with result: fail and a non-empty reason
  const changelogResult = entry.criteriaResults.find(r => r.criterion === 'HAS_CHANGELOG_ENTRY');
  expect(changelogResult?.result).toBe('fail');
  expect((changelogResult?.reason ?? '').trim().length).toBeGreaterThan(0);

  // Task must NOT have moved to review
  expect(fs.existsSync(path.join(queueRoot, 'inbox', 'task-s2-003.json'))).toBe(true);
  expect(fs.existsSync(path.join(queueRoot, 'review', 'task-s2-003.json'))).toBe(false);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: TypeScript strict — tsc --strict --noEmit exits 0 ────────────────

test('NFR: tsc --strict --noEmit exits 0', () => {
  const { spawnSync } = require('child_process');
  const TSC_BIN = path.join(WORKTREE, 'node_modules', 'typescript', 'bin', 'tsc');
  const result = spawnSync(process.execPath, [TSC_BIN, '--strict', '--noEmit'], {
    encoding: 'utf-8',
    cwd: WORKTREE,
    timeout: 20000,
  });
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
  }
  expect(result.status).toBe(0);
});

// ── NFR: Performance — hash + criteria complete within 2s ─────────────────

test('NFR: computeSkillHash + evaluateCriteria complete within 2 seconds', () => {
  const { evaluateCriteria, parseCriteria } = require('../../src/lib/skill-loader');
  const start = Date.now();
  computeSkillHash(FIXTURE_SKILL);
  const skillContent = fs.readFileSync(FIXTURE_SKILL, 'utf-8');
  const criteria = parseCriteria(skillContent);
  evaluateCriteria(criteria, allPassOutput);
  expect(Date.now() - start).toBeLessThan(2000);
});

// ── NFR: Security — no credential patterns in trace output ────────────────

test('NFR: trace output contains no credential patterns', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-nfr-'));
  const queueRoot = path.join(tmpDir, 'queue');
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  makeQueueFixture(queueRoot, 'task-s2-nfr');
  const registryPath = makeRegistry(
    { 'feature-dev': FIXTURE_SKILL, 'feature-review': FIXTURE_SKILL, 'feature-assurance': FIXTURE_SKILL },
    tmpDir,
  );

  await runDevAgent({ queueRoot, taskId: 'task-s2-nfr', registryPath, tracePath, output: allPassOutput });

  const traceContent = fs.readFileSync(tracePath, 'utf-8');
  const credPatterns = [/Bearer\s/i, /sk-[A-Za-z0-9]{10,}/, /password\s*[:=]/i, /secret\s*[:=]/i];
  for (const pattern of credPatterns) {
    expect(traceContent).not.toMatch(pattern);
  }

  fs.rmSync(tmpDir, { recursive: true });
});
```

- [ ] **Step 2: Run integration tests — must fail (RED)**

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
npm run test:integration -- --no-coverage 2>&1 | Select-Object -Last 10
Pop-Location
```

Expected: `FAIL` — `runDevAgent is not a function` (or named export not found from dev-agent)

- [ ] **Step 3: Commit tests on RED** (so the commit shows the RED state explicitly)

```powershell
git add tests/integration/s2-dev-agent-trace.integration.test.ts
git commit -m "test: add S2 integration tests (6 tests, AC1/AC3-AC6/NFRs) — RED, runDevAgent not yet implemented"
```

---

## Task 5: Extend dev-agent.ts — export runDevAgent() (GREEN)

**Files:**
- Modify: `src/agents/dev-agent.ts`

- [ ] **Step 1: Replace `src/agents/dev-agent.ts` with the full extended version**

```typescript
import * as fs from 'fs';
import * as path from 'path';

import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client';
import {
  loadSkillFromRegistry,
  computeSkillHash,
  parseCriteria,
  parseSkillVersion,
  evaluateCriteria,
  buildTraceEntry,
  emitTraceEntry,
} from '../lib/skill-loader';
import { DevAgentOutput } from '../types/trace';

function parseArgs(): {
  queueRoot: string;
  taskId: string | null;
  registryPath: string;
  tracePath: string;
} {
  const args = process.argv.slice(2);
  const idx = (flag: string) => args.indexOf(flag);
  return {
    queueRoot: idx('--queueRoot') >= 0 ? args[idx('--queueRoot') + 1] : 'queue',
    taskId: idx('--taskId') >= 0 ? args[idx('--taskId') + 1] : null,
    registryPath: idx('--registryPath') >= 0 ? args[idx('--registryPath') + 1] : './skills-registry.json',
    tracePath: idx('--tracePath') >= 0 ? args[idx('--tracePath') + 1] : './trace.jsonl',
  };
}

export async function runDevAgent(config: {
  queueRoot: string;
  taskId: string | null;
  registryPath: string;
  tracePath: string;
  output: DevAgentOutput;
}): Promise<void> {
  const { queueRoot, taskId: explicitTaskId, registryPath, tracePath, output } = config;
  const inbox = path.join(queueRoot, 'inbox');
  const review = path.join(queueRoot, 'review');
  const historyPath = path.join(queueRoot, 'history.jsonl');

  // Load skill from registry and compute hash
  const skillFilePath = loadSkillFromRegistry(registryPath, 'feature-dev');
  const skillContent = fs.readFileSync(skillFilePath, 'utf-8');
  const promptHash = computeSkillHash(skillFilePath);
  const skillVersion = parseSkillVersion(skillContent);

  // Evaluate output against falsifiable criteria
  const criteria = parseCriteria(skillContent);
  const criteriaResults = evaluateCriteria(criteria, output);
  const anyFail = criteriaResults.some(r => r.result === 'fail');
  const decisionOutcome: 'proceed' | 'reject' = anyFail ? 'reject' : 'proceed';

  // Emit trace entry — always written, even on reject
  const entry = buildTraceEntry({
    agentIdentity: 'dev',
    skillName: 'feature-dev',
    skillVersion,
    promptHash,
    hashAlgorithm: 'sha256',
    criteriaResults,
    decisionOutcome,
  });
  emitTraceEntry(tracePath, entry);

  // Advance queue only on proceed
  if (decisionOutcome === 'proceed') {
    const taskId = explicitTaskId ?? getTaskInDir(inbox);
    moveTask(taskId, inbox, review);
    appendHistory(taskId, 'inbox', 'review', historyPath);
  }
}

async function main(): Promise<void> {
  const { queueRoot, taskId, registryPath, tracePath } = parseArgs();
  // Synthetic output — represents the S1 work completed by this agent
  const output: DevAgentOutput = {
    implementationFile: 'src/agents/dev-agent.ts',
    testFile: 'tests/unit/queue-client.test.ts',
    changelogEntry: 'S1: three-agent bare loop (filesystem queue, ADR-002)',
  };
  await runDevAgent({ queueRoot, taskId, registryPath, tracePath, output });
}

main().catch((err: unknown) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
```

- [ ] **Step 2: Run integration tests — must pass (GREEN)**

```powershell
Push-Location "c:\Users\Hamis\code\agentic dev loop 30-03-2026\.worktrees\s2-dev-agent-skill-trace"
npm run test:integration -- --no-coverage --verbose 2>&1 | Select-Object -Last 20
Pop-Location
```

Expected: `PASS — 6 tests, 0 failures`

- [ ] **Step 3: Run full unit suite — no regressions**

```powershell
npm test -- --no-coverage 2>&1 | Select-Object -Last 5
```

Expected: `15 passed, 15 total`

- [ ] **Step 4: TSC final check**

```powershell
npx tsc --strict --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/agents/dev-agent.ts
git commit -m "feat: extend dev-agent with runDevAgent() — skill load, criteria eval, trace emit (AC1-AC6 green)"
```

---

## Post-task: update pipeline-state.json

After all 5 tasks complete:

- Set S2 story `stage: "verify-completion"` (or proceed to /verify-completion)
- Update `testPlans.s2-dev-agent-skill-trace.passing` to actual passing count
- Update `updatedAt`

The exact test count to record: 15 unit tests + 6 integration tests = 21 total (8 S2 unit + 3 S2 integration + 3 S2 NFR + 7 S1 unit, or report just the new S2 tests as 14 passing against 11 AC-mapped).

---

## Self-review checklist

- [x] Exact file paths — no `[placeholder]` remaining
- [x] Complete code in every implementation step
- [x] Failing test written before every implementation step (Tasks 2, 3, 4)
- [x] Expected output for every run command
- [x] Commit messages in imperative mood
- [x] No scope beyond ACs (no review-agent changes, no assurance-agent changes, no automation tooling)
- [x] DL-007 complied with: integration tests use programmatic `runDevAgent()` calls, not subprocesses — no spawnSync needed
- [x] `jest.setTimeout(30000)` at top of integration test file (covers NFR tsc check)
