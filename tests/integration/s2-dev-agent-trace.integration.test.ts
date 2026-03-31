import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runDevAgent } from '../../src/agents/dev-agent';
import { computeSkillHash } from '../../src/lib/skill-loader';
import { TraceEntry, DevAgentOutput } from '../../src/types/trace';

jest.setTimeout(30000); // DL-007: covers NFR tsc check via spawnSync

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

// ── AC1 / AC3 / AC4: full trace roundtrip ────────────────────────────────────

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

  expect(fs.existsSync(tracePath)).toBe(true);

  const raw = fs.readFileSync(tracePath, 'utf-8').trim();
  const entry = JSON.parse(raw) as TraceEntry;

  expect(entry.agentIdentity).toBe('dev');
  expect(entry.skillName).toBe('feature-dev');
  expect(typeof entry.skillVersion).toBe('string');
  expect(entry.hashAlgorithm).toBe('sha256');
  expect(Array.isArray(entry.criteriaResults)).toBe(true);
  expect(entry.decisionOutcome).toBe('proceed');
  expect(typeof entry.timestamp).toBe('string');
  expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);

  // AC4: hash independently verifiable
  const expectedHash = computeSkillHash(FIXTURE_SKILL);
  expect(entry.promptHash).toBe(expectedHash);

  // task moved to review
  expect(fs.existsSync(path.join(queueRoot, 'review', 'task-s2-001.json'))).toBe(true);
  expect(fs.existsSync(path.join(queueRoot, 'inbox', 'task-s2-001.json'))).toBe(false);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC6: registry resolution — path is dynamic, not hardcoded ─────────────────

test('AC6: skill path resolved from registry — alternate registry produces different hash in trace', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-registry-'));
  const queueRoot = path.join(tmpDir, 'queue');
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  makeQueueFixture(queueRoot, 'task-s2-002');

  const altRegistryPath = makeRegistry(
    { 'feature-dev': ALT_FIXTURE_SKILL, 'feature-review': ALT_FIXTURE_SKILL, 'feature-assurance': ALT_FIXTURE_SKILL },
    tmpDir,
  );

  await runDevAgent({ queueRoot, taskId: 'task-s2-002', registryPath: altRegistryPath, tracePath, output: allPassOutput });

  const entry = JSON.parse(fs.readFileSync(tracePath, 'utf-8').trim()) as TraceEntry;

  const altHash = computeSkillHash(ALT_FIXTURE_SKILL);
  const primaryHash = computeSkillHash(FIXTURE_SKILL);
  expect(entry.promptHash).toBe(altHash);
  expect(entry.promptHash).not.toBe(primaryHash);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── AC5: reject path — task stays in inbox, trace still written ────────────────

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
    changelogEntry: null,
  };

  await runDevAgent({ queueRoot, taskId: 'task-s2-003', registryPath, tracePath, output: failingOutput });

  expect(fs.existsSync(tracePath)).toBe(true);
  const entry = JSON.parse(fs.readFileSync(tracePath, 'utf-8').trim()) as TraceEntry;
  expect(entry.decisionOutcome).toBe('reject');

  const changelogResult = entry.criteriaResults.find(r => r.criterion === 'HAS_CHANGELOG_ENTRY');
  expect(changelogResult?.result).toBe('fail');
  expect((changelogResult?.reason ?? '').trim().length).toBeGreaterThan(0);

  expect(fs.existsSync(path.join(queueRoot, 'inbox', 'task-s2-003.json'))).toBe(true);
  expect(fs.existsSync(path.join(queueRoot, 'review', 'task-s2-003.json'))).toBe(false);

  fs.rmSync(tmpDir, { recursive: true });
});

// ── NFR: TypeScript strict — tsc --strict --noEmit exits 0 ───────────────────

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

// ── NFR: Performance — hash + criteria complete within 2s ─────────────────────

test('NFR: computeSkillHash + evaluateCriteria complete within 2 seconds', () => {
  const { evaluateCriteria, parseCriteria } = require('../../src/lib/skill-loader');
  const start = Date.now();
  computeSkillHash(FIXTURE_SKILL);
  const skillContent = fs.readFileSync(FIXTURE_SKILL, 'utf-8');
  const criteria = parseCriteria(skillContent);
  evaluateCriteria(criteria, allPassOutput);
  expect(Date.now() - start).toBeLessThan(2000);
});

// ── NFR: Security — no credential patterns in trace output ────────────────────

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
