import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadTraceFromFile } from '../../src/lib/trace-reader';
import { verifyDevTraceHash, validateCriteriaCompleteness } from '../../src/lib/review-validator';
import { CriterionResult, TraceEntry } from '../../src/types/trace';

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
  timestamp: '2026-03-30T00:00:00.000Z',
};

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');
const FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');

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
