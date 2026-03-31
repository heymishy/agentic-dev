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
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);
  writeTraceLog(tracePath, makeDevTrace(), makeReviewTrace());

  await runAssuranceAgent({ registryPath, tracePath });

  const lines = fs
    .readFileSync(tracePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(l => l.length > 0);
  const entry = JSON.parse(lines[2]) as AssuranceRecord;

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
