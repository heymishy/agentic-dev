import * as fs from 'fs';
import * as path from 'path';

const readmePath = path.join(__dirname, '../../README.md');

describe('S7-AC1/AC2/AC3 — README structural requirements', () => {
  let readme: string;

  beforeAll(() => {
    // Normalise to LF so indexOf/regex patterns work on any host OS
    readme = fs.readFileSync(readmePath, 'utf-8').replace(/\r\n/g, '\n');
  });

  // ─── Section presence ──────────────────────────────────────────────────────

  it('contains a "## Prototype demo" section', () => {
    expect(readme).toMatch(/^## Prototype demo/m);
  });

  it('contains a "### Setup" subsection', () => {
    expect(readme).toMatch(/^### Setup/m);
  });

  it('contains a "### Walkthrough" subsection', () => {
    expect(readme).toMatch(/^### Walkthrough/m);
  });

  // ─── ≤3 steps to running board ─────────────────────────────────────────────

  it('reaches the running board in ≤3 numbered steps (AC1)', () => {
    const setupIdx = readme.indexOf('\n### Setup\n');
    expect(setupIdx).toBeGreaterThan(-1);

    const afterSetup = readme.slice(setupIdx + '\n### Setup\n'.length);
    const nextH3 = afterSetup.indexOf('\n### ');
    const setupContent = nextH3 === -1 ? afterSetup : afterSetup.slice(0, nextH3);

    const steps = setupContent.match(/^\d+\.\s/gm) ?? [];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(3);
  });

  // ─── Every setup step has a command ────────────────────────────────────────

  it('every setup step contains a fenced shell command block (AC2)', () => {
    const setupIdx = readme.indexOf('\n### Setup\n');
    const afterSetup = readme.slice(setupIdx + '\n### Setup\n'.length);
    const nextH3 = afterSetup.indexOf('\n### ');
    const setupContent = nextH3 === -1 ? afterSetup : afterSetup.slice(0, nextH3);

    // Split at numbered list items
    const stepChunks = setupContent
      .split(/(?=^\d+\.\s)/m)
      .filter((c) => /^\d+\.\s/.test(c));

    expect(stepChunks.length).toBeGreaterThan(0);
    for (const chunk of stepChunks) {
      expect(chunk).toContain('```');
    }
  });

  // ─── Every setup step has "You should see:" ────────────────────────────────

  it('every setup step has a "You should see:" success criterion (AC2)', () => {
    const setupIdx = readme.indexOf('\n### Setup\n');
    const afterSetup = readme.slice(setupIdx + '\n### Setup\n'.length);
    const nextH3 = afterSetup.indexOf('\n### ');
    const setupContent = nextH3 === -1 ? afterSetup : afterSetup.slice(0, nextH3);

    const stepChunks = setupContent
      .split(/(?=^\d+\.\s)/m)
      .filter((c) => /^\d+\.\s/.test(c));

    expect(stepChunks.length).toBeGreaterThan(0);
    for (const chunk of stepChunks) {
      expect(chunk).toMatch(/You should see:/i);
    }
  });

  // ─── Cold-start independence ────────────────────────────────────────────────

  it('contains a cold-start independence section (AC3)', () => {
    expect(readme).toMatch(/cold-start independence/i);
  });

  it('cold-start section states agents operate without running infrastructure (AC3)', () => {
    expect(readme).toMatch(/without any running infrastructure|no.*running infrastructure/i);
  });

  // ─── Tamper-evidence — four required elements ──────────────────────────────

  it('contains a tamper-evidence section', () => {
    expect(readme).toMatch(/tamper.evidence/i);
  });

  it('tamper-evidence: describes SHA-256 entry hashing (computeEntryHash)', () => {
    expect(readme).toMatch(/sha-?256|computeEntryHash/i);
  });

  it('tamper-evidence: mentions detectEntryTampering', () => {
    expect(readme).toContain('detectEntryTampering');
  });

  it('tamper-evidence: describes re-verification mode', () => {
    expect(readme).toMatch(/re-verif/i);
  });

  it('tamper-evidence: describes escalation when tamper is detected', () => {
    expect(readme).toMatch(/escalat/i);
  });
});
