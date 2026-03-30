# Three-agent bare loop closes end-to-end — Implementation Plan

**Goal:** Make every test in the test plan pass — one task moving through filesystem queue
`inbox/` → `review/` → `quality-review/` → `done/` via three sequential TypeScript agent scripts.
No skill loading, no hashing, no trace emission. See ADR-002 for the queue architecture decision.

**Branch:** `feature/s1-three-agent-bare-loop`
**Worktree:** `.worktrees/s1-three-agent-bare-loop`
**Test commands:**
- Unit: `npm test`
- Integration: `npm run test:integration` (no Docker required — uses `os.tmpdir()` fixtures)

---

## PR-comment trigger resolution protocol

If you encounter an ambiguity not covered by the ACs or test plan:
**STOP.** Add a PR comment describing the ambiguity. Do not stub and continue.
Specifically: if filesystem behaviour differs across environments (e.g. cross-volume
`fs.renameSync` throws EXDEV), add a PR comment and do not silently fall back to copy+delete.

---

## File map

```
Modify:
  package.json           — remove node-fetch; add test:integration script; add init-queue script

Remove:
  docker-compose.yml     — no longer required (ADR-002)

Create:
  scripts/init-queue.sh                              — create queue dirs + empty history.jsonl
  src/lib/queue-client.ts                            — moveTask, getTaskInDir, appendHistory, parseHistory
  src/agents/dev-agent.ts                            — CLI: inbox/ → review/
  src/agents/review-agent.ts                         — CLI: review/ → quality-review/
  src/agents/assurance-agent.ts                      — CLI: quality-review/ → done/
  tests/unit/queue-client.test.ts                    — 6 unit tests (no network, no Docker)
  tests/integration/s1-bare-loop.integration.test.ts — 5 integration tests (os.tmpdir)
```

---

## Pre-flight: Verify filesystem before Task 2

**Before Task 2 — confirm once:**

```bash
node -e "const fs = require('fs'); const os = require('os'); const p = os.tmpdir() + '/preflight-test'; fs.mkdirSync(p, { recursive: true }); fs.writeFileSync(p + '/task-001.json', '{}'); fs.renameSync(p + '/task-001.json', p + '/moved.json'); console.log('rename ok:', fs.existsSync(p + '/moved.json'));"
```

Expected output: `rename ok: true`

If this throws EXDEV (cross-device rename), add a PR comment — the worktree may be on a
different filesystem from os.tmpdir(). Use an absolute path under the worktree root for tests
instead of os.tmpdir().

---

## Task 1: Update scaffold (remove docker-compose, update package.json)

**Files:** `package.json`, remove `docker-compose.yml`

No test file for this task — it is housekeeping only.

- [ ] **Step 1: Update `package.json`** — remove `node-fetch`; add `test:integration` and `init-queue` scripts

```json
{
  "name": "agentic-sdlc-prototype",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc --noEmit",
    "test": "jest --testPathIgnorePatterns=integration",
    "test:integration": "jest --testPathPattern=integration --testTimeout=5000",
    "init-queue": "bash scripts/init-queue.sh"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.12.7",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.5"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.ts", "**/tests/**/*.integration.test.ts"]
  }
}
```

- [ ] **Step 2: Create `scripts/init-queue.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p queue/inbox queue/review queue/quality-review queue/done
touch queue/history.jsonl
echo "Queue initialised: queue/{inbox,review,quality-review,done} + queue/history.jsonl"
```

- [ ] **Step 3: Remove `docker-compose.yml`**

```bash
git rm docker-compose.yml
```

- [ ] **Step 4: Update dependencies**

```bash
npm install
```

Expected: `node-fetch` is gone; no new packages added. Zero vulnerabilities that block install.

- [ ] **Step 5: Verify TypeScript still compiles**

```bash
npx tsc --strict --noEmit
```

Expected output: (empty — zero errors)

- [ ] **Commit**

```
chore: remove MC docker-compose, update package.json for filesystem queue (ADR-002)
```

---

## Task 2: Queue client + unit tests

**Files:**
- Create: `src/lib/queue-client.ts`
- Test: `tests/unit/queue-client.test.ts`

- [ ] **Step 1: Write the failing tests first (TDD — RED)**

```typescript
// tests/unit/queue-client.test.ts
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
});
```

- [ ] **Step 2: Run — must fail (module does not exist yet)**

```bash
npm test
```

Expected output: `Cannot find module '../../src/lib/queue-client'`

- [ ] **Step 3: Implement `src/lib/queue-client.ts`**

```typescript
// src/lib/queue-client.ts
// Filesystem-based queue operations for the agentic SDLC prototype.
// No HTTP, no Docker, no external services. See ADR-002.
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
```

- [ ] **Step 4: Run tests — must pass**

```bash
npm test
```

Expected output:
```
PASS tests/unit/queue-client.test.ts
  moveTask
    ✓ moves task file from source dir to dest dir
    ✓ throws when source file does not exist
  getTaskInDir
    ✓ returns task ID when exactly one task JSON is present
    ✓ throws when directory is empty
  appendHistory
    ✓ appends a valid JSONL entry to history file
  parseHistory
    ✓ returns all entries in order

Tests: 6 passed, 6 total
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --strict --noEmit
```

Expected output: (empty — zero errors)

- [ ] **Commit**

```
feat: add queue-client (moveTask, getTaskInDir, appendHistory, parseHistory)
```

---

## Task 3: Three agent scripts

**Files:**
- Create: `src/agents/dev-agent.ts`
- Create: `src/agents/review-agent.ts`
- Create: `src/agents/assurance-agent.ts`

No new unit tests — these are thin CLI wrappers over Task 2's client. Integration tests in Task 4 cover all three.

- [ ] **Step 1: Create `src/agents/dev-agent.ts`**

```typescript
// src/agents/dev-agent.ts
// S1: bare skeleton — no skill loading, no trace emission.
// S2 will extend this file to load the feature-dev skill and emit a trace entry.
// ADR-001 (decisions.md): no shared module-level state with review-agent or assurance-agent.
import * as path from 'path';
import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client.js';

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
  const inbox = path.join(queueRoot, 'inbox');
  const review = path.join(queueRoot, 'review');
  const historyPath = path.join(queueRoot, 'history.jsonl');

  const taskId = explicitTaskId ?? getTaskInDir(inbox);
  moveTask(taskId, inbox, review);
  appendHistory(taskId, 'inbox', 'review', historyPath);
}

main().catch((err: unknown) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
```

- [ ] **Step 2: Create `src/agents/review-agent.ts`**

```typescript
// src/agents/review-agent.ts
// S1: bare skeleton — no skill loading, no trace emission.
// S3 will extend this file to validate the dev agent's trace.
// ADR-001 (decisions.md): no shared module-level state with dev-agent or assurance-agent.
import * as path from 'path';
import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client.js';

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
  const review = path.join(queueRoot, 'review');
  const qualityReview = path.join(queueRoot, 'quality-review');
  const historyPath = path.join(queueRoot, 'history.jsonl');

  const taskId = explicitTaskId ?? getTaskInDir(review);
  moveTask(taskId, review, qualityReview);
  appendHistory(taskId, 'review', 'quality-review', historyPath);
}

main().catch((err: unknown) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
```

- [ ] **Step 3: Create `src/agents/assurance-agent.ts`**

```typescript
// src/agents/assurance-agent.ts
// S1: bare skeleton — no skill loading, no independent hash verification.
// S4 will extend this file to independently load skills and validate both prior traces.
// ADR-001 (decisions.md): no shared module-level state with dev-agent or review-agent.
import * as path from 'path';
import { moveTask, getTaskInDir, appendHistory } from '../lib/queue-client.js';

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
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --strict --noEmit
```

Expected output: (empty)

- [ ] **Commit**

```
feat: add dev-agent, review-agent, assurance-agent (bare loop stubs)
```

---

## Task 4: Integration tests

**Files:**
- Create: `tests/integration/s1-bare-loop.integration.test.ts`

- [ ] **Step 1: Write integration tests (TDD — RED, then run after Task 3)**

```typescript
// tests/integration/s1-bare-loop.integration.test.ts
// @integration — no Docker, no external services; uses os.tmpdir() fixtures
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseHistory } from '../../src/lib/queue-client';

const AGENT_TIMEOUT = 5000;

function createQueueFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 's1-integration-'));
  for (const dir of ['inbox', 'review', 'quality-review', 'done']) {
    fs.mkdirSync(path.join(root, dir));
  }
  fs.writeFileSync(path.join(root, 'history.jsonl'), '');
  return root;
}

function createTask(queueRoot: string, taskId: string, dir: string): void {
  fs.writeFileSync(
    path.join(queueRoot, dir, `${taskId}.json`),
    JSON.stringify({ id: taskId, title: `Test task ${taskId}` }),
  );
}

function runAgent(agentPath: string, queueRoot: string, taskId: string): void {
  execSync(
    `npx ts-node ${agentPath} --queueRoot "${queueRoot}" --taskId ${taskId}`,
    { stdio: 'pipe', timeout: AGENT_TIMEOUT },
  );
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
```

- [ ] **Step 2: Run integration tests — all 5 must pass**

```bash
npm run test:integration
```

Expected output:
```
PASS tests/integration/s1-bare-loop.integration.test.ts
  @integration S1: bare loop
    ✓ AC1: dev agent moves task from inbox to review
    ✓ AC2: review agent moves task from review to quality-review
    ✓ AC3: assurance agent moves task from quality-review to done
    ✓ AC4: history.jsonl has exactly 3 entries in sequence after full loop
    ✓ AC5: second task reaches done with 3 transitions — loop not sensitive to task identity

Tests: 5 passed, 5 total
```

- [ ] **Step 3: Run unit tests — must still pass (6 tests)**

```bash
npm test
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --strict --noEmit
```

Expected output: (empty — zero errors)

- [ ] **Commit**

```
feat: add integration tests for S1 bare loop (os.tmpdir fixtures, no Docker)
```

---

## Final verification

```bash
# All unit tests
npm test

# All integration tests
npm run test:integration

# TypeScript clean
npx tsc --strict --noEmit
```

Expected final state:
- 6 unit tests: PASS
- 5 integration tests: PASS
- TypeScript: zero errors
- `src/lib/queue-client.ts`, three agents, init-queue.sh: all present
- `docker-compose.yml`: removed
- `node-fetch`: removed from package.json
