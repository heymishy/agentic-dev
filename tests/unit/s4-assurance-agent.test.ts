import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { computeSkillHash } from '../../src/lib/skill-loader';
import {
  readTraceLog,
  validateDevTrace,
  validateReviewTrace,
  buildAssuranceRecord,
  computeEntryHash,
  detectEntryTampering,
  TraceLogEntry,
} from '../../src/lib/assurance-validator';

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');
const DEV_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-dev.skill.md');
const REVIEW_FIXTURE_SKILL = path.join(FIXTURE_DIR, 'feature-review.skill.md');

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

// ── AC4: buildAssuranceRecord ────────────────────────────────────────────────

describe('buildAssuranceRecord', () => {
  test('emits record with all required fields and closed verdict', () => {
    const devHash = 'a'.repeat(64);
    const reviewHash = 'b'.repeat(64);
    const record = buildAssuranceRecord({
      skillName: 'feature-assurance',
      skillVersion: '1.0.0',
      promptHash: 'c'.repeat(64),
      devResult: { devHashMatch: true },
      reviewResult: { reviewHashMatch: true, reviewsDevHashMatch: true },
      devEntryHash: devHash,
      reviewEntryHash: reviewHash,
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
    expect(record.devEntryHash).toBe(devHash);
    expect(record.reviewEntryHash).toBe(reviewHash);
  });

  test('emits escalate verdict when dev hash does not match', () => {
    const record = buildAssuranceRecord({
      skillName: 'feature-assurance',
      skillVersion: '1.0.0',
      promptHash: 'c'.repeat(64),
      devResult: { devHashMatch: false },
      reviewResult: { reviewHashMatch: true, reviewsDevHashMatch: false },
      devEntryHash: 'd'.repeat(64),
      reviewEntryHash: 'e'.repeat(64),
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

// ── S6 AC3: computeEntryHash + detectEntryTampering ───────────────────────

describe('computeEntryHash', () => {
  test('returns consistent SHA-256 hex string for the same entry', () => {
    const entry: TraceLogEntry = {
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: 'a'.repeat(64),
      hashAlgorithm: 'sha256',
      timestamp: '2026-04-01T00:00:00.000Z',
    };
    const h1 = computeEntryHash(entry);
    const h2 = computeEntryHash(entry);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h1)).toBe(true);
  });

  test('returns different hash when criteriaResults is modified', () => {
    const base: TraceLogEntry = {
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: 'a'.repeat(64),
      hashAlgorithm: 'sha256',
      timestamp: '2026-04-01T00:00:00.000Z',
      criteriaResults: [{ criterion: 'HAS_IMPL', result: 'fail' }],
    };
    const tampered: TraceLogEntry = {
      ...base,
      criteriaResults: [{ criterion: 'HAS_IMPL', result: 'pass' }],
    };
    expect(computeEntryHash(base)).not.toBe(computeEntryHash(tampered));
  });
});

describe('detectEntryTampering', () => {
  test('returns tampered:false when entry hashes match stored hashes', () => {
    const devEntry: TraceLogEntry = {
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: 'a'.repeat(64),
      hashAlgorithm: 'sha256',
      timestamp: '2026-04-01T00:00:00.000Z',
    };
    const reviewEntry: TraceLogEntry = {
      agentIdentity: 'review',
      skillName: 'feature-review',
      skillVersion: '1.0.0',
      promptHash: 'b'.repeat(64),
      hashAlgorithm: 'sha256',
      timestamp: '2026-04-01T00:00:00.000Z',
    };
    const storedRecord = buildAssuranceRecord({
      skillName: 'feature-assurance',
      skillVersion: '1.0.0',
      promptHash: 'c'.repeat(64),
      devResult: { devHashMatch: true },
      reviewResult: { reviewHashMatch: true, reviewsDevHashMatch: true },
      devEntryHash: computeEntryHash(devEntry),
      reviewEntryHash: computeEntryHash(reviewEntry),
    });
    const { tampered } = detectEntryTampering(devEntry, reviewEntry, storedRecord);
    expect(tampered).toBe(false);
  });

  test('returns tampered:true with reason when criteriaResults is modified', () => {
    const devEntry: TraceLogEntry = {
      agentIdentity: 'dev',
      skillName: 'feature-dev',
      skillVersion: '1.0.0',
      promptHash: 'a'.repeat(64),
      hashAlgorithm: 'sha256',
      timestamp: '2026-04-01T00:00:00.000Z',
      criteriaResults: [{ criterion: 'HAS_IMPL', result: 'fail' }],
    };
    const reviewEntry: TraceLogEntry = {
      agentIdentity: 'review',
      skillName: 'feature-review',
      skillVersion: '1.0.0',
      promptHash: 'b'.repeat(64),
      hashAlgorithm: 'sha256',
      timestamp: '2026-04-01T00:00:00.000Z',
    };
    const storedRecord = buildAssuranceRecord({
      skillName: 'feature-assurance',
      skillVersion: '1.0.0',
      promptHash: 'c'.repeat(64),
      devResult: { devHashMatch: true },
      reviewResult: { reviewHashMatch: true, reviewsDevHashMatch: true },
      devEntryHash: computeEntryHash(devEntry),
      reviewEntryHash: computeEntryHash(reviewEntry),
    });
    // Simulate tampering: change criteriaResults from fail to pass
    const tamperedEntry: TraceLogEntry = {
      ...devEntry,
      criteriaResults: [{ criterion: 'HAS_IMPL', result: 'pass' }],
    };
    const { tampered, reasons } = detectEntryTampering(
      tamperedEntry,
      reviewEntry,
      storedRecord,
    );
    expect(tampered).toBe(true);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/criteriaResults/);
  });
});
