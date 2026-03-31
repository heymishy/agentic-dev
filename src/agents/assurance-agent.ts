import * as path from 'path';
import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client';

function parseArgs(): { queueRoot: string; taskId: string | null } {
  const args = process.argv.slice(2);
  const queueRootIdx = args.indexOf('--queueRoot');
  const taskIdIdx = args.indexOf('--taskId');
  return {
    queueRoot: queueRootIdx >= 0 ? args[queueRootIdx + 1] : 'queue',
    taskId: taskIdIdx >= 0 ? args[taskIdIdx + 1] : null,
  };
}

async function main(): Promise<void> {
  const { queueRoot, taskId: explicitTaskId } = parseArgs();
  const qualityReview = path.join(queueRoot, 'quality-review');
  const done = path.join(queueRoot, 'done');
  const historyPath = path.join(queueRoot, 'history.jsonl');

  const taskId = explicitTaskId ?? getTaskInDir(qualityReview);
  moveTask(taskId, qualityReview, done);
  appendHistory(taskId, 'quality-review', 'done', historyPath);
}

main().catch((err: unknown) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
