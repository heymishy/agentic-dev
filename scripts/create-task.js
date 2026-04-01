#!/usr/bin/env node
'use strict';

/**
 * create-task.js — Drop a new task JSON file into the queue inbox.
 *
 * Usage:
 *   node scripts/create-task.js "Feature: add user auth"
 *   node scripts/create-task.js "Bug: login fails on Safari" --queueRoot ./queue
 */

const fs = require('fs');
const path = require('path');

const title = process.argv[2];
if (!title) {
  console.error('Usage: node scripts/create-task.js "<task title>"');
  process.exit(1);
}

const queueRoot = (() => {
  const idx = process.argv.indexOf('--queueRoot');
  return idx !== -1 ? process.argv[idx + 1] : path.join(__dirname, '..', 'queue');
})();

const inboxDir = path.join(queueRoot, 'inbox');
if (!fs.existsSync(inboxDir)) {
  console.error(`Inbox directory not found: ${inboxDir}`);
  console.error('Run: node scripts/init-queue.js');
  process.exit(1);
}

const id = `task-${Date.now()}`;
const task = {
  id,
  title,
  createdAt: new Date().toISOString(),
  status: 'inbox',
};

const filePath = path.join(inboxDir, `${id}.json`);
fs.writeFileSync(filePath, JSON.stringify(task, null, 2));

console.log(`Task created: ${id}`);
console.log(`  → ${filePath}`);
console.log(`  Title: "${title}"`);
