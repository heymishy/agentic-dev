export interface CriterionResult {
  criterion: string;
  result: 'pass' | 'fail' | 'not-applicable';
  reason?: string;
}

export interface DevAgentOutput {
  implementationFile: string | null;
  testFile: string | null;
  changelogEntry: string | null;
}

export interface TraceEntry {
  agentIdentity: string;
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  criteriaResults: CriterionResult[];
  decisionOutcome: 'proceed' | 'reject';
  timestamp: string;
}

// Stub — extended in S4
export interface AssuranceRecord {
  agentIdentity: 'assurance';
  traceFilePath: string;
  outcome: 'approved' | 'rejected';
  timestamp: string;
}

export interface ReviewTraceEntry {
  agentIdentity: 'review';
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  devHashMatch: boolean;
  validationFindings: string[];
  decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox';
  timestamp: string;
}
