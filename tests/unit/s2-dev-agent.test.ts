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
