import * as fs from 'fs';
import * as path from 'path';

import {
  computeSkillHash,
  loadSkillFromRegistry,
  parseSkillVersion,
} from '../lib/skill-loader';
import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client';
import {
  readTraceLog,
  validateDevTrace,
  validateReviewTrace,
  buildAssuranceRecord,
  emitAssuranceRecord,
  computeEntryHash,
  detectEntryTampering,
} from '../lib/assurance-validator';
import { AssuranceRecord } from '../types/trace';

export async function runAssuranceAgent(config: {
  registryPath: string;
  tracePath: string;
}): Promise<AssuranceRecord> {
  const { registryPath, tracePath } = config;

  // AC1: read both trace entries from trace log file only — no module-level cache
  const entries = readTraceLog(tracePath);
  const devEntry = entries.find(e => e.agentIdentity === 'dev');
  const reviewEntry = entries.find(e => e.agentIdentity === 'review');
  if (!devEntry || !reviewEntry) {
    throw new Error('Trace log must contain both dev and review entries');
  }

  // S6 AC3 re-verification: if a prior assurance record exists in the trace, check
  // whether the dev or review entries have been modified since it was written.
  const priorAssuranceEntry = entries.find(e => e.agentIdentity === 'assurance');
  if (priorAssuranceEntry) {
    const priorRecord = priorAssuranceEntry as unknown as AssuranceRecord;
    const tamperCheck = detectEntryTampering(devEntry, reviewEntry, priorRecord);
    if (tamperCheck.tampered) {
      const tamperRecord: AssuranceRecord = {
        ...priorRecord,
        verdict: 'escalate',
        timestamp: new Date().toISOString(),
        criteriaOutcomes: tamperCheck.reasons.map(reason => ({
          criterion: 'ENTRY_INTEGRITY',
          result: 'fail',
          reason,
        })),
      };
      emitAssuranceRecord(tracePath, tamperRecord);
      return tamperRecord;
    }
    // No tampering detected — return the existing record without re-appending
    return priorRecord;
  }

  // Load assurance skill (for this agent's own promptHash + version)
  const assuranceSkillPath = loadSkillFromRegistry(registryPath, 'feature-assurance');
  const assuranceSkillContent = fs.readFileSync(assuranceSkillPath, 'utf-8');
  const assurancePromptHash = computeSkillHash(assuranceSkillPath);
  const assuranceSkillVersion = parseSkillVersion(assuranceSkillContent);

  // AC2: independently validate dev trace hash
  const devSkillPath = loadSkillFromRegistry(registryPath, 'feature-dev');
  const devResult = validateDevTrace(devEntry, devSkillPath);

  // AC3: independently validate review trace hash + confirm review's dev hash result
  const reviewSkillPath = loadSkillFromRegistry(registryPath, 'feature-review');
  const reviewResult = validateReviewTrace(
    reviewEntry,
    devResult.devHashMatch,
    reviewSkillPath,
  );

  // AC4: build and emit assurance record (with entry hashes for tamper-evidence)
  const devEntryHash = computeEntryHash(devEntry);
  const reviewEntryHash = computeEntryHash(reviewEntry);
  const record = buildAssuranceRecord({
    skillName: 'feature-assurance',
    skillVersion: assuranceSkillVersion,
    promptHash: assurancePromptHash,
    devResult,
    reviewResult,
    devEntryHash,
    reviewEntryHash,
  });

  emitAssuranceRecord(tracePath, record);
  return record;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idx = (flag: string) => args.indexOf(flag);

  // S1 backward-compat: if --queueRoot is passed, run queue-moving mode
  if (idx('--queueRoot') >= 0) {
    const queueRoot = args[idx('--queueRoot') + 1];
    const taskId = idx('--taskId') >= 0 ? args[idx('--taskId') + 1] : null;
    const qualityReview = path.join(queueRoot, 'quality-review');
    const done = path.join(queueRoot, 'done');
    const historyPath = path.join(queueRoot, 'history.jsonl');
    const resolvedTaskId = taskId ?? getTaskInDir(qualityReview);
    moveTask(resolvedTaskId, qualityReview, done);
    appendHistory(resolvedTaskId, 'quality-review', 'done', historyPath);
    return;
  }

  const registryPath =
    idx('--registryPath') >= 0 ? args[idx('--registryPath') + 1] : './skills-registry.json';
  const tracePath =
    idx('--tracePath') >= 0 ? args[idx('--tracePath') + 1] : './trace.jsonl';

  const record = await runAssuranceAgent({ registryPath, tracePath });
  if (record.verdict === 'escalate') {
    process.exit(1);
  }
}

// DL-008: guard required — prevents main() firing at import time (breaks integration tests)
if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
  });
}
