import * as fs from 'fs';
import * as path from 'path';

import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client';
import {
  loadSkillFromRegistry,
  computeSkillHash,
  parseCriteria,
  parseSkillVersion,
  evaluateCriteria,
  buildTraceEntry,
  emitTraceEntry,
} from '../lib/skill-loader';
import { DevAgentOutput } from '../types/trace';

function parseArgs(): {
  queueRoot: string;
  taskId: string | null;
  registryPath: string;
  tracePath: string;
} {
  const args = process.argv.slice(2);
  const idx = (flag: string) => args.indexOf(flag);
  return {
    queueRoot: idx('--queueRoot') >= 0 ? args[idx('--queueRoot') + 1] : 'queue',
    taskId: idx('--taskId') >= 0 ? args[idx('--taskId') + 1] : null,
    registryPath: idx('--registryPath') >= 0 ? args[idx('--registryPath') + 1] : './skills-registry.json',
    tracePath: idx('--tracePath') >= 0 ? args[idx('--tracePath') + 1] : './trace.jsonl',
  };
}

export async function runDevAgent(config: {
  queueRoot: string;
  taskId: string | null;
  registryPath: string;
  tracePath: string;
  output: DevAgentOutput;
}): Promise<void> {
  const { queueRoot, taskId: explicitTaskId, registryPath, tracePath, output } = config;
  const inbox = path.join(queueRoot, 'inbox');
  const review = path.join(queueRoot, 'review');
  const historyPath = path.join(queueRoot, 'history.jsonl');

  // Load skill from registry and compute hash
  const skillFilePath = loadSkillFromRegistry(registryPath, 'feature-dev');
  const skillContent = fs.readFileSync(skillFilePath, 'utf-8');
  const promptHash = computeSkillHash(skillFilePath);
  const skillVersion = parseSkillVersion(skillContent);

  // Evaluate output against falsifiable criteria
  const criteria = parseCriteria(skillContent);
  const criteriaResults = evaluateCriteria(criteria, output);
  const anyFail = criteriaResults.some(r => r.result === 'fail');
  const decisionOutcome: 'proceed' | 'reject' = anyFail ? 'reject' : 'proceed';

  // Emit trace entry — always written, even on reject
  const entry = buildTraceEntry({
    agentIdentity: 'dev',
    skillName: 'feature-dev',
    skillVersion,
    promptHash,
    hashAlgorithm: 'sha256',
    criteriaResults,
    decisionOutcome,
  });
  emitTraceEntry(tracePath, entry);

  // Advance queue only on proceed
  if (decisionOutcome === 'proceed') {
    const taskId = explicitTaskId ?? getTaskInDir(inbox);
    moveTask(taskId, inbox, review);
    appendHistory(taskId, 'inbox', 'review', historyPath);
  }
}

async function main(): Promise<void> {
  const { queueRoot, taskId, registryPath, tracePath } = parseArgs();
  // Synthetic output — represents the S1 work completed by this agent
  const output: DevAgentOutput = {
    implementationFile: 'src/agents/dev-agent.ts',
    testFile: 'tests/unit/queue-client.test.ts',
    changelogEntry: 'S1: three-agent bare loop (filesystem queue, ADR-002)',
  };
  await runDevAgent({ queueRoot, taskId, registryPath, tracePath, output });
}

if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
  });
}
