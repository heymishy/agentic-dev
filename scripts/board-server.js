#!/usr/bin/env node
'use strict';

/**
 * board-server.js — Queue visualisation server for the agentic SDLC prototype.
 *
 * Reads the filesystem queue and renders a live-updating Kanban board at
 * http://localhost:3000. Exposes /api/health (200 OK) and /api/board (JSON)
 * for automated health checks.
 *
 * Zero external dependencies — built-in Node.js http, fs, path only.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.BOARD_PORT || '3000', 10);
const QUEUE_ROOT = process.env.QUEUE_ROOT || path.join(__dirname, '..', 'queue');

// ─── Queue reader ─────────────────────────────────────────────────────────────

function readColumn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      try {
        return { id: path.basename(f, '.json'), ...JSON.parse(raw) };
      } catch {
        return { id: path.basename(f, '.json') };
      }
    });
}

function readHistory() {
  const historyPath = path.join(QUEUE_ROOT, 'history.jsonl');
  if (!fs.existsSync(historyPath)) return [];
  const raw = fs.readFileSync(historyPath, 'utf-8').trim();
  if (!raw) return [];
  return raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean)
    .slice(-20); // show last 20 history entries
}

function getBoardState() {
  return {
    inbox: readColumn(path.join(QUEUE_ROOT, 'inbox')),
    review: readColumn(path.join(QUEUE_ROOT, 'review')),
    qualityReview: readColumn(path.join(QUEUE_ROOT, 'quality-review')),
    done: readColumn(path.join(QUEUE_ROOT, 'done')),
    history: readHistory(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── HTML rendering ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderColumn(title, tasks, colour) {
  const taskHtml = tasks.length === 0
    ? '<p class="empty">— empty —</p>'
    : tasks.map((t) => `<div class="card"><span class="task-id">${escapeHtml(t.id)}</span>${t.title ? `<span class="task-title">${escapeHtml(t.title)}</span>` : ''}</div>`).join('');
  return `
    <div class="column">
      <h2 style="border-top: 4px solid ${colour}">${escapeHtml(title)} <span class="count">${tasks.length}</span></h2>
      ${taskHtml}
    </div>`;
}

function renderHistoryRow(entry) {
  return `<tr><td>${escapeHtml(entry.taskId)}</td><td>${escapeHtml(entry.from)}</td><td>→</td><td>${escapeHtml(entry.to)}</td><td>${escapeHtml(entry.timestamp)}</td></tr>`;
}

function renderPage(state) {
  const historyRows = state.history.length === 0
    ? '<tr><td colspan="5">No history yet</td></tr>'
    : [...state.history].reverse().map(renderHistoryRow).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Queue Board</title>
  <meta http-equiv="refresh" content="3">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f4f4f5; color: #18181b; }
    header { background: #18181b; color: #fff; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    header h1 { font-size: 1.1rem; font-weight: 600; }
    header .subtitle { font-size: 0.8rem; color: #a1a1aa; }
    .board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; padding: 1.5rem 2rem; }
    .column { background: #fff; border-radius: 8px; padding: 1rem; min-height: 200px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .column h2 { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #52525b; padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
    .count { background: #e4e4e7; border-radius: 9999px; padding: 0 0.4rem; font-size: 0.75rem; color: #3f3f46; }
    .card { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 0.6rem 0.75rem; margin-bottom: 0.5rem; }
    .task-id { font-size: 0.78rem; font-weight: 600; display: block; color: #3f3f46; }
    .task-title { font-size: 0.82rem; display: block; margin-top: 0.2rem; color: #71717a; }
    .empty { font-size: 0.8rem; color: #a1a1aa; text-align: center; padding: 1rem 0; }
    .history { margin: 0 2rem 2rem; }
    .history h2 { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #52525b; margin-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); font-size: 0.82rem; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #f4f4f5; }
    th { background: #fafafa; font-weight: 600; color: #52525b; }
    .footer { text-align: center; font-size: 0.75rem; color: #a1a1aa; padding: 1rem; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Queue Board</h1>
      <div class="subtitle">Auto-refreshes every 3 seconds &middot; Updated: ${escapeHtml(state.updatedAt)}</div>
    </div>
  </header>
  <div class="board">
    ${renderColumn('Inbox', state.inbox, '#6366f1')}
    ${renderColumn('Review', state.review, '#f59e0b')}
    ${renderColumn('Quality Review', state.qualityReview, '#3b82f6')}
    ${renderColumn('Done', state.done, '#22c55e')}
  </div>
  <div class="history">
    <h2>Recent history</h2>
    <table>
      <thead><tr><th>Task</th><th>From</th><th></th><th>To</th><th>Timestamp</th></tr></thead>
      <tbody>${historyRows}</tbody>
    </table>
  </div>
  <div class="footer">agentic-sdlc-prototype &mdash; queue visualisation board</div>
</body>
</html>`;
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', queueRoot: QUEUE_ROOT }));
    return;
  }

  if (url === '/api/board') {
    const state = getBoardState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }

  if (url === '/' || url === '/index.html') {
    const state = getBoardState();
    const html = renderPage(state);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Queue board running at http://localhost:${PORT}`);
  console.log(`Queue root: ${QUEUE_ROOT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

// Allow clean shutdown in tests
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => { server.close(); process.exit(0); });

module.exports = { server, getBoardState };
