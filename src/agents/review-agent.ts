import * as fs from 'fs';
import * as path from 'path';

import {
  computeSkillHash,
  loadSkillFromRegistry,
  parseCriteria,
  parseSkillVersion,
} from '../lib/skill-loader';
import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client';
import { loadTraceFromFile } from '../lib/trace-reader';
import {
  buildReviewTraceEntry,
  emitReviewTraceEntry,
  validateCriteriaCompleteness,
  verifyDevTraceHash,
} from '../lib/review-validator';

export async function runReviewAgent(config: {
  registryPath: string;
  tracePath: string;
  devTraceFile: string;
}): Promise<{ decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox' }> {
  const { registryPath, tracePath, devTraceFile } = config;

  // AC1: read dev trace from file path argument only — no module-level cache
  const devTrace = loadTraceFromFile(devTraceFile);

  // Load review skill (for this agent's own promptHash + version)
  const reviewSkillPath = loadSkillFromRegistry(registryPath, 'feature-review');
  const reviewSkillContent = fs.readFileSync(reviewSkillPath, 'utf-8');
  const reviewPromptHash = computeSkillHash(reviewSkillPath);
  const reviewSkillVersion = parseSkillVersion(reviewSkillContent);

  // AC2: independently compute SHA-256 of feature-dev SKILL.md on disk
  const devSkillPath = loadSkillFromRegistry(registryPath, 'feature-dev');
  const { devHashMatch } = verifyDevTraceHash(devTrace, devSkillPath);

  // AC3: validate all criteria from feature-dev skill appear in dev trace results
  const devSkillContent = fs.readFileSync(devSkillPath, 'utf-8');
  const devCriteria = parseCriteria(devSkillContent);
  const hashMismatchFindings: string[] = devHashMatch
    ? []
    : [
        'Hash mismatch: dev trace promptHash does not match current feature-dev SKILL.md on disk',
      ];
  const criteriaFindings = validateCriteriaCompleteness(devCriteria, devTrace.criteriaResults);
  const validationFindings = [...hashMismatchFindings, ...criteriaFindings];

  // AC4 / AC5: decision outcome
  const decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox' =
    validationFindings.length === 0 ? 'proceed-to-quality-review' : 'reject-to-inbox';

  // AC4: build review trace entry with all required fields
  const reviewEntry = buildReviewTraceEntry({
    agentIdentity: 'review',
    skillName: 'feature-review',
    skillVersion: reviewSkillVersion,
    promptHash: reviewPromptHash,
    hashAlgorithm: 'sha256',
    devHashMatch,
    validationFindings,
    decisionOutcome,
  });

  // Append-only write to trace log
  emitReviewTraceEntry(tracePath, reviewEntry);
  return { decisionOutcome };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idx = (flag: string) => args.indexOf(flag);

  // S1 backward-compat: if --queueRoot is passed, run queue-moving mode
  if (idx('--queueRoot') >= 0) {
    const queueRoot = args[idx('--queueRoot') + 1];
    const taskId = idx('--taskId') >= 0 ? args[idx('--taskId') + 1] : null;
    const review = path.join(queueRoot, 'review');
    const qualityReview = path.join(queueRoot, 'quality-review');
    const historyPath = path.join(queueRoot, 'history.jsonl');
    const resolvedTaskId = taskId ?? getTaskInDir(review);
    moveTask(resolvedTaskId, review, qualityReview);
    appendHistory(resolvedTaskId, 'review', 'quality-review', historyPath);
    return;
  }

  const registryPath =
    idx('--registryPath') >= 0 ? args[idx('--registryPath') + 1] : './skills-registry.json';
  const tracePath =
    idx('--tracePath') >= 0 ? args[idx('--tracePath') + 1] : './trace.jsonl';
  const devTraceFile =
    idx('--devTraceFile') >= 0 ? args[idx('--devTraceFile') + 1] : './trace.jsonl';
  const { decisionOutcome } = await runReviewAgent({ registryPath, tracePath, devTraceFile });
  if (decisionOutcome === 'proceed-to-quality-review') {
    const queueRoot = 'queue';
    const reviewDir = path.join(queueRoot, 'review');
    const qualityReview = path.join(queueRoot, 'quality-review');
    const historyPath = path.join(queueRoot, 'history.jsonl');
    const taskId = getTaskInDir(reviewDir);
    moveTask(taskId, reviewDir, qualityReview);
    appendHistory(taskId, 'review', 'quality-review', historyPath);
  }
  process.stdout.write('Review agent complete.\n');
}

// DL-008: guard required — prevents main() firing at import time (breaks integration tests)
if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
  });
}
