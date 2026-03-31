import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  moveTask,
  getTaskInDir,
  appendHistory,
  parseHistory,
} from '../../src/lib/queue-client';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'queue-test-'));
  fs.mkdirSync(path.join(tmpDir, 'inbox'));
  fs.mkdirSync(path.join(tmpDir, 'review'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('moveTask', () => {
  it('moves task file from source dir to dest dir', () => {
    const src = path.join(tmpDir, 'inbox');
    const dest = path.join(tmpDir, 'review');
    fs.writeFileSync(path.join(src, 'task-001.json'), JSON.stringify({ id: 'task-001' }));

    moveTask('task-001', src, dest);

    expect(fs.existsSync(path.join(dest, 'task-001.json'))).toBe(true);
    expect(fs.existsSync(path.join(src, 'task-001.json'))).toBe(false);
  });

  it('throws when source file does not exist', () => {
    const src = path.join(tmpDir, 'inbox');
    const dest = path.join(tmpDir, 'review');

    expect(() => moveTask('task-missing', src, dest)).toThrow();
  });
});

describe('getTaskInDir', () => {
  it('returns task ID when exactly one task JSON is present', () => {
    const dir = path.join(tmpDir, 'inbox');
    fs.writeFileSync(path.join(dir, 'task-001.json'), '{}');

    const result = getTaskInDir(dir);

    expect(result).toBe('task-001');
  });

  it('throws when directory is empty', () => {
    const dir = path.join(tmpDir, 'inbox');

    expect(() => getTaskInDir(dir)).toThrow(/no task/i);
  });
});

describe('appendHistory', () => {
  it('appends a valid JSONL entry to history file', () => {
    const histPath = path.join(tmpDir, 'history.jsonl');

    appendHistory('task-001', 'inbox', 'review', histPath);

    const line = fs.readFileSync(histPath, 'utf-8').trim();
    const entry = JSON.parse(line) as { taskId: string; from: string; to: string; timestamp: string };
    expect(entry.taskId).toBe('task-001');
    expect(entry.from).toBe('inbox');
    expect(entry.to).toBe('review');
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });
});

describe('parseHistory', () => {
  it('returns all entries in order', () => {
    const histPath = path.join(tmpDir, 'history.jsonl');
    const lines = [
      { taskId: 'task-001', from: 'inbox', to: 'review', timestamp: new Date().toISOString() },
      { taskId: 'task-001', from: 'review', to: 'quality-review', timestamp: new Date().toISOString() },
      { taskId: 'task-001', from: 'quality-review', to: 'done', timestamp: new Date().toISOString() },
    ];
    fs.writeFileSync(histPath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    const result = parseHistory(histPath);

    expect(result).toHaveLength(3);
    expect(result[0].from).toBe('inbox');
    expect(result[2].to).toBe('done');
  });

  it('returns empty array for a 0-byte file', () => {
    const histPath = path.join(tmpDir, 'history.jsonl');
    fs.writeFileSync(histPath, '', 'utf-8');

    const result = parseHistory(histPath);

    expect(result).toEqual([]);
  });
});
