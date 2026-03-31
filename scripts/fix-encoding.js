const fs = require('fs');
const p = '.github/skills/subagent-execution/SKILL.md';
let c = fs.readFileSync(p, 'utf8');
const before = c.length;

// Mojibake patterns: UTF-8 bytes mis-decoded as Windows-1252
// â€" => — (em dash U+2014, UTF-8: E2 80 94) — two quotation-mark variants seen in the wild
c = c.replace(/\u00e2\u20ac\u201c/g, '\u2014');
c = c.replace(/\u00e2\u20ac\u201d/g, '\u2014');
// â†' => → (rightward arrow U+2192, UTF-8: E2 86 92)
c = c.replace(/\u00e2\u2020\u2019/g, '\u2192');
// âœ… => ✅ (check mark U+2705, UTF-8: E2 9C 85)
c = c.replace(/\u00e2\u0153\u2026/g, '\u2705');
// âŒ => ❌ (cross mark U+274C, UTF-8: E2 9D 8C)
c = c.replace(/\u00e2\u009d\u0152/g, '\u274c');

fs.writeFileSync(p, c, 'utf8');
console.log('before:', before, '  after:', c.length);
// Spot check
const idx = c.indexOf('RED');
console.log('TDD line:', c.substring(idx - 10, idx + 50));
