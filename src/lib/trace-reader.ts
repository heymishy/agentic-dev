import * as fs from 'fs';

import { TraceEntry } from '../types/trace';

const REQUIRED_FIELDS: ReadonlyArray<keyof TraceEntry> = [
  'agentIdentity',
  'skillName',
  'skillVersion',
  'promptHash',
  'hashAlgorithm',
  'criteriaResults',
  'decisionOutcome',
  'timestamp',
];

export function loadTraceFromFile(filePath: string): TraceEntry {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Trace file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const firstLine = raw.split('\n').find(l => l.trim().length > 0);
  if (!firstLine) {
    throw new Error(`Trace file is empty: ${filePath}`);
  }
  const parsed = JSON.parse(firstLine) as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (parsed[field as string] === undefined) {
      throw new Error(`Trace entry missing required field: ${String(field)}`);
    }
  }
  return parsed as unknown as TraceEntry;
}
