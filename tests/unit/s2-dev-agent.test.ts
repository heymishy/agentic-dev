import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  loadSkillFromRegistry,
  computeSkillHash,
  evaluateCriteria,
  parseCriteria,
  buildTraceEntry,
} from '../../src/lib/skill-loader';
import { DevAgentOutput } from '../../src/types/trace';

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
      changelogEntry: null,
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
