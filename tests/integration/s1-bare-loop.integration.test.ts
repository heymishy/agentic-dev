// @integration — no Docker, no external services; uses os.tmpdir() fixtures
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { parseHistory } from '../../src/lib/queue-client';

jest.setTimeout(30000);

const AGENT_TIMEOUT = 15000;
const WORKTREE = path.resolve(__dirname, '../../');
const TS_NODE_BIN = path.join(WORKTREE, 'node_modules', 'ts-node', 'dist', 'bin.js');

function createQueueFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 's1-integration-'));
  for (const dir of ['inbox', 'review', 'quality-review', 'done']) {
    fs.mkdirSync(path.join(root, dir));
  }
  fs.writeFileSync(path.join(root, 'history.jsonl'), '', 'utf-8');
  return root;
}

function createTask(queueRoot: string, taskId: string, dir: string): void {
  fs.writeFileSync(
    path.join(queueRoot, dir, `${taskId}.json`),
    JSON.stringify({ id: taskId, title: `Test task ${taskId}` }),
  );
}

function runAgent(agentFile: string, queueRoot: string, taskId: string): void {
  const result = spawnSync(
    process.execPath,
    [TS_NODE_BIN, path.join(WORKTREE, agentFile), '--queueRoot', queueRoot, '--taskId', taskId],
    { encoding: 'utf-8', timeout: AGENT_TIMEOUT, cwd: WORKTREE },
  );
  if (result.status !== 0) {
    throw new Error(`Agent failed (exit ${result.status ?? 'null'}):\n${result.stderr}`);
  }
}

describe('@integration S1: bare loop', () => {
  let queueRoot: string;

  beforeEach(() => {
    queueRoot = createQueueFixture();
  });

  afterEach(() => {
    fs.rmSync(queueRoot, { recursive: true, force: true });
  });

  it('AC1: dev agent moves task from inbox to review', () => {
    createTask(queueRoot, 'task-001', 'inbox');
    runAgent('src/agents/dev-agent.ts', queueRoot, 'task-001');
    expect(fs.existsSync(path.join(queueRoot, 'review', 'task-001.json'))).toBe(true);
    expect(fs.existsSync(path.join(queueRoot, 'inbox', 'task-001.json'))).toBe(false);
  });

  it('AC2: review agent moves task from review to quality-review', () => {
    createTask(queueRoot, 'task-001', 'review');
    runAgent('src/agents/review-agent.ts', queueRoot, 'task-001');
    expect(fs.existsSync(path.join(queueRoot, 'quality-review', 'task-001.json'))).toBe(true);
    expect(fs.existsSync(path.join(queueRoot, 'review', 'task-001.json'))).toBe(false);
  });

  it('AC3: assurance agent moves task from quality-review to done', () => {
    createTask(queueRoot, 'task-001', 'quality-review');
    runAgent('src/agents/assurance-agent.ts', queueRoot, 'task-001');
    expect(fs.existsSync(path.join(queueRoot, 'done', 'task-001.json'))).toBe(true);
    expect(fs.existsSync(path.join(queueRoot, 'quality-review', 'task-001.json'))).toBe(false);
  });

  it('AC4: history.jsonl has exactly 3 entries in sequence after full loop', () => {
    createTask(queueRoot, 'task-001', 'inbox');
    runAgent('src/agents/dev-agent.ts', queueRoot, 'task-001');
    runAgent('src/agents/review-agent.ts', queueRoot, 'task-001');
    runAgent('src/agents/assurance-agent.ts', queueRoot, 'task-001');

    const history = parseHistory(path.join(queueRoot, 'history.jsonl'));
    expect(history).toHaveLength(3);
    expect(history[0]).toMatchObject({ from: 'inbox', to: 'review', taskId: 'task-001' });
    expect(history[1]).toMatchObject({ from: 'review', to: 'quality-review', taskId: 'task-001' });
    expect(history[2]).toMatchObject({ from: 'quality-review', to: 'done', taskId: 'task-001' });
    for (const entry of history) {
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    }
  });

  it('AC5: second task reaches done with 3 transitions — loop not sensitive to task identity', () => {
    const root2 = createQueueFixture();
    try {
      createTask(root2, 'task-002', 'inbox');
      runAgent('src/agents/dev-agent.ts', root2, 'task-002');
      runAgent('src/agents/review-agent.ts', root2, 'task-002');
      runAgent('src/agents/assurance-agent.ts', root2, 'task-002');

      expect(fs.existsSync(path.join(root2, 'done', 'task-002.json'))).toBe(true);
      const history = parseHistory(path.join(root2, 'history.jsonl'));
      expect(history).toHaveLength(3);
      for (const entry of history) {
        expect(entry.taskId).toBe('task-002');
      }
    } finally {
      fs.rmSync(root2, { recursive: true, force: true });
    }
  });
});
