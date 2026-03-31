import * as fs from 'fs';
import * as path from 'path';

export interface HistoryEntry {
  taskId: string;
  from: string;
  to: string;
  timestamp: string;
}

export function moveTask(taskId: string, sourceDir: string, destDir: string): void {
  const srcPath = path.join(sourceDir, `${taskId}.json`);
  const destPath = path.join(destDir, `${taskId}.json`);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`moveTask: source file not found: ${srcPath}`);
  }
  fs.renameSync(srcPath, destPath);
}

export function getTaskInDir(dir: string): string {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(`getTaskInDir: no task found in ${dir}`);
  }
  return path.basename(files[0], '.json');
}

export function appendHistory(
  taskId: string,
  from: string,
  to: string,
  historyPath: string,
): void {
  const entry: HistoryEntry = { taskId, from, to, timestamp: new Date().toISOString() };
  fs.appendFileSync(historyPath, JSON.stringify(entry) + '\n', 'utf-8');
}

export function parseHistory(historyPath: string): HistoryEntry[] {
  if (!fs.existsSync(historyPath)) return [];
  const raw = fs.readFileSync(historyPath, 'utf-8').trim();
  if (!raw) return [];
  return raw.split('\n').map((line) => JSON.parse(line) as HistoryEntry);
}
