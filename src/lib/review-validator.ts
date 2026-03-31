import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { CriterionResult, ReviewTraceEntry, TraceEntry } from '../types/trace';

export function verifyDevTraceHash(
  devTrace: TraceEntry,
  skillFilePath: string,
): { devHashMatch: boolean } {
  const buf = fs.readFileSync(skillFilePath);
  const actualHash = crypto.createHash('sha256').update(buf).digest('hex');
  return { devHashMatch: devTrace.promptHash === actualHash };
}

export function validateCriteriaCompleteness(
  skillCriteria: string[],
  criteriaResults: CriterionResult[],
): string[] {
  const coveredCriteria = new Set(criteriaResults.map(r => r.criterion));
  return skillCriteria
    .filter(c => !coveredCriteria.has(c))
    .map(c => `Missing criterion: ${c}`);
}

export function buildReviewTraceEntry(params: {
  agentIdentity: 'review';
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  devHashMatch: boolean;
  validationFindings: string[];
  decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox';
}): ReviewTraceEntry {
  return { ...params, timestamp: new Date().toISOString() };
}

export function emitReviewTraceEntry(tracePath: string, entry: ReviewTraceEntry): void {
  fs.mkdirSync(path.dirname(tracePath), { recursive: true });
  fs.appendFileSync(tracePath, JSON.stringify(entry) + '\n', 'utf-8');
}
