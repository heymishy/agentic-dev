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
