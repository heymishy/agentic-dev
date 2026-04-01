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

export interface AssuranceRecord {
  agentIdentity: 'assurance';
  skillName: string;
  skillVersion: string;
  promptHash: string;
  hashAlgorithm: string;
  devHashMatch: boolean;
  reviewHashMatch: boolean;
  criteriaOutcomes: CriterionResult[];
  verdict: 'closed' | 'escalate';
  timestamp: string;
  /** SHA-256 of the serialised dev trace entry at the time the assurance record was written.
   *  Used for tamper-evidence: recomputing this hash and comparing detects any post-hoc
   *  modification to the dev entry, including changes to criteriaResults field values. */
  devEntryHash: string;
  /** SHA-256 of the serialised review trace entry at the time the assurance record was written. */
  reviewEntryHash: string;
}

export interface ReviewTraceEntry extends BaseAgentTrace {
  agentIdentity: 'review';
  devHashMatch: boolean;
  validationFindings: string[];
  decisionOutcome: 'proceed-to-quality-review' | 'reject-to-inbox';
}
