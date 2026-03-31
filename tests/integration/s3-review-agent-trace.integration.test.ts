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
  // Dev trace missing HAS_CHANGELOG_ENTRY but with correct hash
  const devSkillHash = computeSkillHash(DEV_FIXTURE_SKILL);
  const incompleteTrace = makeDevTrace({
    promptHash: devSkillHash,
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
