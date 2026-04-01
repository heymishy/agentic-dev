import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const TEST_PORT = 13099;
const BOARD_SERVER = path.join(__dirname, '../../scripts/board-server.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpGet(urlStr: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(urlStr, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => (body += chunk.toString()));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

async function waitForServer(url: string, maxWaitMs = 8000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      await httpGet(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Server at ${url} did not become ready within ${maxWaitMs}ms`);
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('S7 — board-server integration', () => {
  let proc: ChildProcess;
  let queueRoot: string;

  beforeAll(async () => {
    // Create a temporary queue directory with all four column dirs
    queueRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'board-test-'));
    for (const dir of ['inbox', 'review', 'quality-review', 'done']) {
      fs.mkdirSync(path.join(queueRoot, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(queueRoot, 'history.jsonl'), '', 'utf-8');

    proc = spawn('node', [BOARD_SERVER], {
      env: {
        ...process.env,
        BOARD_PORT: String(TEST_PORT),
        QUEUE_ROOT: queueRoot,
      },
      stdio: 'pipe',
    });

    // Surface startup errors to aid debugging
    proc.stderr?.on('data', (d: Buffer) => {
      process.stderr.write(`[board-server stderr] ${d.toString()}`);
    });

    await waitForServer(`http://localhost:${TEST_PORT}/api/health`);
  });

  afterAll(async () => {
    proc.kill('SIGTERM');
    // Allow the process a moment to clean up before removing temp dir
    await new Promise((r) => setTimeout(r, 200));
    fs.rmSync(queueRoot, { recursive: true, force: true });
  });

  // ─── Health check ───────────────────────────────────────────────────────────

  it('GET /api/health returns 200 with { status: "ok" }', async () => {
    const res = await httpGet(`http://localhost:${TEST_PORT}/api/health`);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body.status).toBe('ok');
  });

  // ─── Board API ──────────────────────────────────────────────────────────────

  it('GET /api/board returns 200 with the four queue column arrays', async () => {
    const res = await httpGet(`http://localhost:${TEST_PORT}/api/board`);
    expect(res.status).toBe(200);
    const board = JSON.parse(res.body) as Record<string, unknown>;
    expect(Array.isArray(board.inbox)).toBe(true);
    expect(Array.isArray(board.review)).toBe(true);
    expect(Array.isArray(board.qualityReview)).toBe(true);
    expect(Array.isArray(board.done)).toBe(true);
  });

  it('GET /api/board reflects a task dropped into the inbox dir', async () => {
    const task = { id: 'task-test-001', title: 'Integration test task', status: 'inbox' };
    fs.writeFileSync(
      path.join(queueRoot, 'inbox', 'task-test-001.json'),
      JSON.stringify(task),
      'utf-8',
    );

    const res = await httpGet(`http://localhost:${TEST_PORT}/api/board`);
    const board = JSON.parse(res.body) as { inbox: Array<{ id: string }> };
    const found = board.inbox.some((t) => t.id === 'task-test-001');
    expect(found).toBe(true);
  });

  // ─── HTML board ─────────────────────────────────────────────────────────────

  it('GET / returns 200 with HTML containing "Queue Board"', async () => {
    const res = await httpGet(`http://localhost:${TEST_PORT}/`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Queue Board');
  });

  it('GET / HTML includes all four column headings', async () => {
    const res = await httpGet(`http://localhost:${TEST_PORT}/`);
    expect(res.body).toContain('Inbox');
    expect(res.body).toContain('Review');
    expect(res.body).toContain('Quality Review');
    expect(res.body).toContain('Done');
  });

  // ─── 404 ────────────────────────────────────────────────────────────────────

  it('GET /nonexistent returns 404', async () => {
    const res = await httpGet(`http://localhost:${TEST_PORT}/nonexistent`);
    expect(res.status).toBe(404);
  });
});
