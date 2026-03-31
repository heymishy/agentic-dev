import * as crypto from 'crypto';
import * as fs from 'fs';

import { CriterionResult, TraceEntry } from '../types/trace';

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
