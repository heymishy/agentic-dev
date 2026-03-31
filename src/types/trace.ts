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

interface BaseAgentTrace {
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  timestamp: string;
}

export interface TraceEntry extends BaseAgentTrace {
  agentIdentity: string;
  criteriaResults: CriterionResult[];
  decisionOutcome: 'proceed' | 'reject';
}

// Stub — extended in S4
export interface AssuranceRecord {
  agentIdentity: 'assurance';
  traceFilePath: string;
  outcome: 'approved' | 'rejected';
  timestamp: string;
}

export interface ReviewTraceEntry extends BaseAgentTrace {
  agentIdentity: 'review';
  devHashMatch: boolean;
  validationFindings: string[];
  decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox';
}
