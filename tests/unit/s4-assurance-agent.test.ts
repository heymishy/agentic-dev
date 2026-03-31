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
