#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const queueRoot = process.argv[2] || './queue';

const dirs = ['inbox', 'review', 'quality-review', 'done'];
for (const dir of dirs) {
  fs.mkdirSync(path.join(queueRoot, dir), { recursive: true });
}

const historyPath = path.join(queueRoot, 'history.jsonl');
if (!fs.existsSync(historyPath)) {
  fs.writeFileSync(historyPath, '', 'utf-8');
}

console.log(`Queue initialised at ${queueRoot}`);
