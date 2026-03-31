import * as fs from 'fs';
import * as crypto from 'crypto';

import { CriterionResult, DevAgentOutput, TraceEntry } from '../types/trace';

export function loadSkillFromRegistry(registryPath: string, skillName: string): string {
  const raw = fs.readFileSync(registryPath, 'utf-8');
  const registry = JSON.parse(raw) as Record<string, string>;
  const skillPath = registry[skillName];
  if (!skillPath) {
    throw new Error(`Skill "${skillName}" not found in registry at ${registryPath}`);
  }
  return skillPath;
}

export function computeSkillHash(filePath: string): string {
  const buf = fs.readFileSync(filePath); // Buffer — not string — for byte-accurate hash
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function parseSkillVersion(skillContent: string): string {
  const match = /^version:\s*(.+)$/m.exec(skillContent);
  return match ? match[1].trim() : 'unknown';
}

export function parseCriteria(skillContent: string): string[] {
  const match = /## Criteria\n([\s\S]*?)(?:\n##|$)/.exec(skillContent);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(line => line.replace(/^-\s+/, '').trim())
    .filter(line => line.length > 0);
}

const CRITERION_CHECKS: Record<string, (output: DevAgentOutput) => { pass: boolean; reason?: string }> = {
  HAS_IMPLEMENTATION_FILE: (o) =>
    o.implementationFile !== null
      ? { pass: true }
      : { pass: false, reason: 'implementationFile is null — no implementation produced' },
  HAS_TEST_FILE: (o) =>
    o.testFile !== null
      ? { pass: true }
      : { pass: false, reason: 'testFile is null — no test file produced' },
  HAS_CHANGELOG_ENTRY: (o) =>
    o.changelogEntry !== null
      ? { pass: true }
      : { pass: false, reason: 'changelogEntry is null — no changelog entry produced' },
};

export function evaluateCriteria(criteria: string[], output: DevAgentOutput): CriterionResult[] {
  return criteria.map(criterion => {
    const check = CRITERION_CHECKS[criterion];
    if (!check) return { criterion, result: 'not-applicable' as const };
    const { pass, reason } = check(output);
    if (pass) return { criterion, result: 'pass' as const };
    return { criterion, result: 'fail' as const, reason };
  });
}

export function buildTraceEntry(params: {
  agentIdentity: string;
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  criteriaResults: CriterionResult[];
  decisionOutcome: 'proceed' | 'reject';
}): TraceEntry {
  return { ...params, timestamp: new Date().toISOString() };
}

export function emitTraceEntry(tracePath: string, entry: TraceEntry): void {
  fs.appendFileSync(tracePath, JSON.stringify(entry) + '\n', 'utf-8');
}
