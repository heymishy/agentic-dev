import * as fs from 'fs';
import * as path from 'path';
import { computeSkillHash } from './skill-loader';
import { AssuranceRecord, CriterionResult } from '../types/trace';

export interface TraceLogEntry {
  agentIdentity: string;
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  timestamp: string;
  [key: string]: unknown;
}

const REQUIRED_TRACE_FIELDS: readonly string[] = [
  'agentIdentity',
  'skillName',
  'skillVersion',
  'promptHash',
  'hashAlgorithm',
  'timestamp',
];

export function readTraceLog(filePath: string): TraceLogEntry[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Trace file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error(`Trace file is empty: ${filePath}`);
  }
  return lines.map((line, i) => {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    for (const field of REQUIRED_TRACE_FIELDS) {
      if (parsed[field] === undefined) {
        throw new Error(`Trace entry ${i} missing required field: ${field}`);
      }
    }
    return parsed as unknown as TraceLogEntry;
  });
}

export function validateDevTrace(
  devEntry: TraceLogEntry,
  skillPath: string,
): { devHashMatch: boolean } {
  const actualHash = computeSkillHash(skillPath);
  return { devHashMatch: devEntry.promptHash === actualHash };
}

export function validateReviewTrace(
  reviewEntry: TraceLogEntry,
  devHashMatch: boolean,
  skillPath: string,
): { reviewHashMatch: boolean; reviewsDevHashMatch: boolean } {
  const actualHash = computeSkillHash(skillPath);
  const reviewHashMatch = reviewEntry.promptHash === actualHash;
  const reviewRecordedDevHash = reviewEntry['devHashMatch'];
  const reviewsDevHashMatch =
    typeof reviewRecordedDevHash === 'boolean'
      ? reviewRecordedDevHash === devHashMatch
      : false;
  return { reviewHashMatch, reviewsDevHashMatch };
}

export function buildAssuranceRecord(params: {
  skillName: string;
  skillVersion: string;
  promptHash: string;
  devResult: { devHashMatch: boolean };
  reviewResult: { reviewHashMatch: boolean; reviewsDevHashMatch: boolean };
}): AssuranceRecord {
  const devVerified = params.devResult.devHashMatch;
  const reviewVerified =
    params.reviewResult.reviewHashMatch && params.reviewResult.reviewsDevHashMatch;
  const allPass = devVerified && reviewVerified;

  const criteriaOutcomes: CriterionResult[] = [
    {
      criterion: 'DEV_TRACE_VERIFIED',
      result: devVerified ? 'pass' : 'fail',
      ...(devVerified
        ? {}
        : { reason: 'Dev trace prompt hash does not match feature-dev SKILL.md' }),
    },
    {
      criterion: 'REVIEW_TRACE_VERIFIED',
      result: reviewVerified ? 'pass' : 'fail',
      ...(reviewVerified ? {} : { reason: 'Review trace validation failed' }),
    },
    {
      criterion: 'ALL_CRITERIA_PASS',
      result: allPass ? 'pass' : 'fail',
      ...(allPass ? {} : { reason: 'Not all criteria passed' }),
    },
  ];

  return {
    agentIdentity: 'assurance',
    skillName: params.skillName,
    skillVersion: params.skillVersion,
    promptHash: params.promptHash,
    hashAlgorithm: 'sha256',
    devHashMatch: params.devResult.devHashMatch,
    reviewHashMatch: params.reviewResult.reviewHashMatch,
    criteriaOutcomes,
    verdict: allPass ? 'closed' : 'escalate',
    timestamp: new Date().toISOString(),
  };
}

export function emitAssuranceRecord(tracePath: string, record: AssuranceRecord): void {
  fs.mkdirSync(path.dirname(tracePath), { recursive: true });
  fs.appendFileSync(tracePath, JSON.stringify(record) + '\n', 'utf-8');
}
