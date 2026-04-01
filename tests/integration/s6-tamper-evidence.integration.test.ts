/**
 * S6 Protocol 2 — Tamper-evidence smoke test
 *
 * Scenario:
 *   1. Write a clean dev+review trace, run assurance → record written (closed/escalate).
 *   2. Mutate the dev entry's criteriaResults in the trace file (fail→pass tampering).
 *   3. Re-run assurance agent.
 *   4. Expect: verdict === 'escalate', criteriaOutcomes contains ENTRY_INTEGRITY fail.
 */

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
  entries: object[],
): void {
  const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(tracePath, content, 'utf-8');
}

function readAllEntries(tracePath: string): object[] {
  return fs
    .readFileSync(tracePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(l => l.length > 0)
    .map(l => JSON.parse(l));
}

function allThreeSkills(): Record<string, string> {
  return {
    'feature-dev': DEV_FIXTURE_SKILL,
    'feature-review': REVIEW_FIXTURE_SKILL,
    'feature-assurance': ASSURANCE_FIXTURE_SKILL,
  };
}

// ── S6 Protocol 2: tamper-evidence detection ──────────────────────────────────

test('S6 AC3 — re-verification detects tampered criteriaResults and escalates', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's6-tamper-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);

  // Step 1: write clean trace and run assurance
  const devTrace = makeDevTrace();
  const reviewTrace = makeReviewTrace();
  writeTraceLog(tracePath, [devTrace, reviewTrace]);

  const firstRecord = await runAssuranceAgent({ registryPath, tracePath });
  expect(firstRecord.verdict).toBe('closed');
  expect(firstRecord.devEntryHash).toBeDefined();
  expect(firstRecord.reviewEntryHash).toBeDefined();

  // Step 2: tamper the dev entry — change a criteriaResult from 'pass' to 'fail'
  // then back to simulate post-hoc result manipulation (fail→pass is the attack)
  const entries = readAllEntries(tracePath);
  const tamperedDevEntry = {
    ...(entries[0] as TraceEntry),
    criteriaResults: [
      { criterion: 'HAS_IMPLEMENTATION_FILE', result: 'fail' }, // ← tampered
      { criterion: 'HAS_TEST_FILE', result: 'pass' },
      { criterion: 'HAS_CHANGELOG_ENTRY', result: 'pass' },
    ],
  };

  // Rewrite trace with tampered dev entry (keep review + assurance records)
  writeTraceLog(tracePath, [tamperedDevEntry, entries[1], entries[2]]);

  // Step 3: re-run assurance agent — should detect tampering
  const secondRecord = await runAssuranceAgent({ registryPath, tracePath });

  // Step 4: verify escalation
  expect(secondRecord.verdict).toBe('escalate');
  const integrityOutcome = (secondRecord.criteriaOutcomes ?? []).find(
    c => c.criterion === 'ENTRY_INTEGRITY',
  );
  expect(integrityOutcome).toBeDefined();
  expect(integrityOutcome?.result).toBe('fail');
  expect(integrityOutcome?.reason).toMatch(/criteriaResults/);
});

test('S6 AC3 — re-verification passes when entries are unmodified', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's6-notamper-'));
  const tracePath = path.join(tmpDir, 'trace.jsonl');
  const registryPath = makeRegistry(allThreeSkills(), tmpDir);

  // Write clean trace and run assurance
  writeTraceLog(tracePath, [makeDevTrace(), makeReviewTrace()]);
  const firstRecord = await runAssuranceAgent({ registryPath, tracePath });
  expect(firstRecord.verdict).toBe('closed');

  // Re-run without any tampering — should return existing record unchanged
  const secondRecord = await runAssuranceAgent({ registryPath, tracePath });
  expect(secondRecord.verdict).toBe('closed');
  // devEntryHash and reviewEntryHash should still be present
  expect(secondRecord.devEntryHash).toBe(firstRecord.devEntryHash);
  expect(secondRecord.reviewEntryHash).toBe(firstRecord.reviewEntryHash);
});
