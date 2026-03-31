# Decision Log — Agentic SDLC Prototype

**Feature:** `2026-03-30-agentic-sdlc-prototype`
**Method:** Entries recorded in chronological order. Formal ADRs follow the running log.

---

## Running Log

| # | Date | Type | Decision summary | Decided by | Linked to |
|---|------|------|-----------------|------------|-----------|
| DL-008 | 2026-03-31 | IMPL | Every agent file must guard `main()` with `require.main === module`. Without the guard, importing the module in a test triggers execution — the agent tries to read the queue at test-import time and crashes the Jest worker. Discovered in S2 when `runDevAgent` was exported and the integration test imported it. S3 `review-agent.ts` and S4 `assurance-agent.ts` must include this guard before integration tests are written. `src/agents/dev-agent.ts` is the canonical reference. | Copilot/Hamish | S2–S4 integration tests |
| DL-007 | 2026-03-31 | IMPL | Agent scripts must be invoked via `spawnSync` with an explicit args array (not `execSync` with a shell command string). Path spaces in the worktree path cause shell arg splitting. `npx ts-node` incurs cold-start overhead that exceeds Jest's default 5s timeout. Fix: `spawnSync(process.execPath, [TS_NODE_BIN, agentFile, ...args])`. S2–S4 test files must use the same pattern. See S1 integration test for reference. | Copilot/Hamish | S1 integration tests, S2–S4 |
| DL-006 | 2026-03-31 | ARCH | Replace Mission Control queue with filesystem queue (folder-based, JSON task files). Foundry is the first real runtime after the prototype — no MC migration step. See ADR-002. | Hamish | ADR-002, S1 all |
| DL-005 | 2026-03-31 | ACTION | Participant required for S6 AC1 (legibility test) and S7 AC4 (dry-run). Must be named and time-committed before S1 branch is merged. Blocking on S6 and S7 execution — not on S1–S5. | Hamish | S6 W4, S7 W4 |
| DL-004 | 2026-03-31 | RISK-ACCEPT | Review finding 1-M1 (S2 AC1 "stores in memory" describes internal state, not observable behaviour): risk accepted; addressed at test level — S2 test plan verifies the observable outcome (hash in trace matches file bytes at invocation time) rather than internal state. AC1 story text not amended. | Hamish | S2 AC1, Review run 1 |
| DL-001 | 2026-03-30 | RISK-ACCEPT | S3 AC1 partial gap accepted — "not from session" constraint cannot be disproved by automated test; mitigated by three structural measures in S3 test plan | Hamish | S3 AC1, ADR-001 |
| DL-002 | 2026-03-30 | DESIGN | S3 hash-before/hash-after NFR test establishes prior coverage for S6 tamper-evidence territory; S6 references S3 rather than duplicating | Hamish | S3 NFR, S6 AC3 |
| DL-003 | 2026-03-30 | DESIGN | S4/S5 test boundary: S4 covers happy-path and unit-level hash-mismatch precondition; formal injected-failure protocol (M3) is S5's sole ownership | Hamish | S4 Out of Scope, S5 test plan |

---

### DL-008 — Agent module guard: `require.main === module` required in all agent files

**Date:** 2026-03-31
**Type:** IMPL
**Decided by:** Copilot/Hamish
**Linked to:** S2–S4 integration tests

**Context:**
During S2 Task 5, when `runDevAgent()` was exported from `src/agents/dev-agent.ts` and the integration test imported it, Jest workers crashed with `ENOENT: no such file or directory, scandir '...\queue\inbox'`. The root cause: `main()` at module level executed at import time — the agent tried to read the queue before the test had set up any fixture directories. Jest hit 4 worker retries and failed the entire suite.

**Pattern:**
Every agent file (`dev-agent.ts`, `review-agent.ts`, `assurance-agent.ts`) must wrap the `main()` call with a module-execution guard:

```typescript
if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
  });
}
```

Without this guard, any `import { exportedFunction } from '../../src/agents/[agent]'` in a test file will execute `main()` at parse time, before `beforeEach` or `beforeAll` fixtures are set up.

**Why this matters for S3 and S4:**
S3 `review-agent.ts` will be imported by `s3-review-agent-trace.integration.test.ts` via `import { runReviewAgent } from '../../src/agents/review-agent'`. If the guard is absent, the integration test suite will crash identically to S2 before the guard was applied. S4 `assurance-agent.ts` has the same exposure. The guard is **mandatory**, not optional. It must be included in the initial agent file creation step (Task 1 of the S3 plan and Task 1 of the S4 plan), not discovered during integration test authoring.

**Canonical reference:** `src/agents/dev-agent.ts` (commit `924fc5c`) — see the `if (require.main === module)` block at the end of the file.

**Plan update required:**
S3 and S4 implementation plans must include an explicit sub-step in the "Create agent file" task: *"Add `require.main === module` guard around `main()` invocation."* The plan reviewer should flag any S3/S4 agent creation step that omits this guard.

---

### DL-005 — Participant required for S6 and S7 before demonstration

**Date:** 2026-03-31
**Type:** ACTION
**Decided by:** Hamish
**Linked to:** S6 W4 (legibility test), S7 W4 (dry-run usability test)

**Context:**
S6 AC1 requires a non-engineer participant to answer 3 questions about the trace log — this is a
manual, observable test that cannot be simulated. S7 AC4 requires an uninitiated engineer (not the
builder) to complete the full pipeline end-to-end from the README alone with ≤ 2 assistance requests.
Both tests require advance scheduling. Finding a participant available on the day is a real project
risk at MM1 if left until S6 starts.

**Decision:**
Name a participant and get a tentative time commitment before S1 branch is merged.
The tests themselves are not needed until S6 and S7 execute. The booking is needed now.

**Participant:**
| Role | Required by | Named | Tentative date |
|------|-------------|-------|----------------|
| Non-engineer (S6 AC1 — legibility) | Before S6 begins | `[NAME]` | `[TENTATIVE DATE]` |
| Uninitiated engineer (S7 AC4 — dry-run) | Before S7 begins | `[NAME]` | `[TENTATIVE DATE]` |

**Blocking rule:** S6 and S7 DoR instructions blocks include a hard stop: if no named participant
is confirmed, the agent must pause and log a PR comment — do not fabricate results, do not proceed.

---

### DL-001 — S3 AC1 partial gap: "not from session" constraint accepted with structural mitigation

**Date:** 2026-03-30
**Type:** RISK-ACCEPT
**Decided by:** Hamish
**Linked to:** S3 AC1, ADR-001

**Context:**
S3 AC1 requires the review agent to read the dev trace "from the filesystem only — not from in-memory
or session context." No language-level mechanism prevents reading in-memory module state in an
automated test environment. We can only test the observable behaviour: the agent reads from a file
path argument, does not retain a cached copy across invocations, and throws when the file is absent.

**Decision:**
Accept the partial gap. The constraint is architectural, not behavioural, and is enforced by
the process-boundary invocation pattern — the same mechanism documented in ADR-001. The automated
test suite applies three structural mitigations: (1) missing-file-throws unit test; (2) stale-file-
replacement integration test (file deleted + replaced before review agent reads, confirming no
cached copy used); (3) no-cross-imports NFR assertion covering module-level state sharing.

**Impact:**
S3 test plan records the gap in the Coverage gaps table. The risk is accepted because the
architectural enforcement (separate process invocation) provides the runtime guarantee that no
automated test can replicate. If the process boundary is removed in a future phase, this gap must
be re-evaluated — see ADR-001 Revisit triggers.

---

### DL-002 — S3 hash-before/hash-after NFR test covers S6 tamper-evidence territory

**Date:** 2026-03-30
**Type:** DESIGN
**Decided by:** Hamish
**Linked to:** S3 NFR "Dev trace integrity", S6 AC3

**Context:**
S3's NFR test "Dev trace integrity — trace file is unchanged after review agent run" verifies
that the review agent does not modify the dev trace file (hash comparison before and after
review agent invocation). S6 AC3 requires that a modified prior trace entry produces a
detectable inconsistency at the next assurance verification run.

These two tests address the same property from different angles: S3 proves the review agent
is not the source of modification; S6 demonstrates that post-hoc external modification is
detectable. There was a risk of duplicating the hash-comparison test in both stories.

**Decision:**
S3's NFR test is the canonical automated coverage for trace-file integrity at the
review-agent boundary. S6's test plan references this as prior coverage and focuses on what
S3 cannot cover: legibility for non-engineers (M5) and the manual demonstration of deliberate
external tampering (M6). S6 does not add a second automated hash-comparison test.

**Impact:**
S3 test plan annotated with an S6 cross-reference under the "Dev trace integrity" NFR test.
S6 test plan annotated to reference S3 as prior coverage in the AC3 gap entry.

---

### DL-003 — S4/S5 test boundary: injected failure protocol ownership is S5 only

**Date:** 2026-03-30
**Type:** DESIGN
**Decided by:** Hamish
**Linked to:** S4 Out of Scope, S5 test plan, M3

**Context:**
S4's test plan includes unit-level hash-mismatch edge cases (e.g., `buildAssuranceRecord` emits
`escalate` verdict when given a mismatch result). S5's test plan defines the formal M3 protocol:
a deliberate wrong hash is injected into a live trace → assurance agent must catch it → loop must
not close. Without an explicit boundary, there was a risk of S4 and S5 owning overlapping tests
for the same scenario, or S4 being credited with M3 coverage it does not provide.

**Decision:**
S4's mismatch unit tests are precondition tests: they confirm the function-level contract
(`buildAssuranceRecord` populates `criteriaOutcomes` at criterion level and emits the correct
verdict when given a mismatch input). They do not constitute a protocol-level test of the full
failure detection chain. The formal protocol (inject → verify caught → verify loop stays open)
is S5's ownership exclusively. If S5 cannot pass because S4's implementation does not populate
`criteriaOutcomes`, that surfaces as an S4 implementation defect, not an S5 test failure.

**Impact:**
S4 test plan Out of Scope section updated with an explicit boundary statement. S5 test plan
remains the sole owner of M3.

---

## Architecture Decision Records

### ADR-001 — Agent isolation verification: structural test strategy for architectural independence constraints

**Date:** 2026-03-31
**Status:** Accepted
**Decided by:** Hamish — product owner and sole builder

> **Note on governance:** In a team context, this decision would require architecture review before
> S4 implementation begins. In this project, Hamish holds both product owner and sole builder roles.
> The ADR itself is the governance record that compensates for the absence of a second approver.
> Any future contributor taking over S4 implementation must read this ADR before writing code.

---

**Context:**

During test planning for S3 (AC1: review agent reads from filesystem only, not in-memory or session
context) and S4 (AC5: assurance agent has no access to prior agents' execution context), a class of
acceptance criterion emerged that cannot be fully verified by automated tests. These are
*correct-by-architecture* constraints: the violation could only occur within the same process where
the test runs, and the test cannot distinguish "structurally unable to violate" from "happened not
to violate during this run."

The architectural independence of the assurance agent is not incidental — it is the mechanism by
which the governance loop produces *verifiable* rather than *correlated* validation. If the assurance
agent shares execution context with the agents it validates, the prototype demonstrates echo, not
assurance. Shared context means the assurance result is produced by the same runtime environment
that produced the work it is checking — the validation chain is circular, and MM1 ("every governance
decision traceable to versioned policy") is a claim without a structural foundation.

A decision was therefore required on what the automated test suite is responsible for proving, what
is left to structural inspection, and what is enforced at runtime through the invocation pattern.

---

**Options Considered**

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| A — Structural tests only | No-cross-imports assertion (Jest / `fs.readFileSync`); filesystem stale-file-replacement integration test | Automated and deterministic; catches the structural violation class (import-level shared state); no architectural changes required for this phase | Cannot catch runtime context sharing introduced via a dynamic mechanism that has no static import footprint (e.g. shared singleton accessed via dynamic `require`) |
| B — Manual protocol only | Cold-start checklist documented in README; no automated structural assertion | Simple; maps directly to real-world deployment verification | Not repeatable without human effort; not part of CI; a structural violation introduced silently would require code review to catch; insufficient for a governance claim at the foundation of MM1 |
| C — Dependency injection boundary | All agent context passed as explicit function parameters; no module-level singletons permitted; compliance validated at compile time by interface shape | Fully automated and exhaustive for the shared-state class; eliminates the violation class rather than testing for it; aligns with Foundry-hosted agent architecture | Requires refactoring agent module signatures before S4 implementation; introduces additional design complexity outside the scope of this phase; the architectural pattern does not yet exist in the codebase |

---

**Decision:**

**Option A** — structural tests only — with the process-boundary invocation pattern as the runtime
enforcement mechanism.

The automated test suite covers:
1. No-cross-imports structural assertion: `assurance-agent.ts` and its direct imports contain no
   `import` statement referencing `dev-agent` or `review-agent` module paths.
2. Cold-start independence integration test (stale-file-replacement pattern): the assurance agent
   entry point is invoked twice against the same file path; the file is overwritten between
   invocations; the second assurance record reflects the second file's content, confirming no
   module-level caching across invocations.

The runtime enforcement mechanism is the process-boundary invocation pattern: each agent is invoked
as a separate Node.js process — the calling script reads the task from the filesystem queue and
invokes each agent file directly. This is documented in the README and cold-start protocol. Removing the process boundary constitutes an architectural change requiring
this ADR to be revisited (see Revisit triggers).

**Option B** is rejected: a manual-only strategy is insufficient for a structural claim at the
foundation of MM1. The governance credibility of the loop depends on the assurance agent's
independence being architecturally enforced, not merely documented.

**Option C** is noted as the correct long-term implementation path and is the specified implementation
direction for any phase that triggers the revisit conditions below. It is deferred for this phase
because it requires foundational module-architecture changes outside the scope of the prototype.

---

**Consequences:**

- The automated test suite cannot catch runtime context sharing introduced via dynamic mechanisms
  that have no static import footprint (e.g. `require(someVariable)` at runtime). This is an
  accepted residual risk.
- Mitigated by: (1) the no-cross-imports assertion covers the structural violation class; (2) the
  process-boundary invocation pattern is the runtime enforcement mechanism — removing it is a
  breaking architectural change and must trigger this ADR for review; (3) the README cold-start
  protocol documents the assurance agent's cold-start requirement as a standing operational
  instruction.
- S4's verification script includes a manual cold-start scenario that confirms the live mechanism
  is operational before S4 is marked done.
- Any contributor introducing a new module-level singleton or shared service accessible across agent
  boundaries must revisit this ADR and update it before merging.

---

**Revisit triggers:**

The following conditions require this ADR to be reviewed before the relevant change is implemented.
If any trigger is reached, **Option C** from the options above becomes the implementation path.

1. **Process-boundary removal:** Any future phase that removes the process boundary and consolidates
   agent invocation (e.g. a single Node.js process hosting all three agents as modules).

2. **Foundry-hosted agent model:** Adoption of a Foundry-hosted agent model — hosted agents share
   infrastructure by design; the isolation mechanism must be re-established at the platform level
   rather than the process level. Option C's dependency injection boundary provides the correct
   abstraction for this context.

3. **Parallel agent invocation:** Any extension that introduces parallel agent invocation.
   Sequential invocation is what makes the current process boundary a clean isolation mechanism;
   parallelism breaks that assumption without necessarily breaking the structural tests, creating a
   gap between what the tests assert and what the runtime enforces.

---

### ADR-002 — Filesystem queue replaces Mission Control; Azure AI Foundry is the first real runtime

**Date:** 2026-03-31
**Status:** Accepted
**Decided by:** Hamish — product owner and sole builder

> **Context for future collaborators:** Mission Control was the original queue platform.
> A pre-flight check at the start of S1 implementation confirmed Docker was not running
> in the target environment, surfacing the alpha-software instability risk documented in
> the discovery (Assumption 1). Rather than resolve the Docker issue, the decision was made
> to eliminate the external dependency entirely — the queue mechanism was never part of the
> governance proof, only the scaffolding around it.

---

**Context:**

The original discovery mandated Mission Control (MC) — an alpha Kanban-style queue that runs
via Docker Compose — as the queue and agent runtime for the prototype. Three specific concerns
made this a poor fit:

1. **External service dependency.** MC requires Docker Desktop running, an image pull from
   Docker Hub (pinned to a specific release), and a container process staying alive across all
   three agent invocations. Any of these failing before or during a demo collapses the 30-minute
   self-service bar (M4).

2. **Alpha software risk.** MC is under active development. API contract, column name schema, and
   HTTP response shapes could change between the moment of pinning and any future clone of the
   repo. The S1 pre-flight check exposed this risk before it produced any rework.

3. **Governance claim dependency on scaffolding.** The governance loop — skill loading, trace
   emission, hash verification, assurance agent independence — does not depend on any property
   of Mission Control specifically. It depends on reliable shared state transitions. A filesystem
   queue (folder moves + JSON files) satisfies that requirement with zero external dependencies,
   full determinism, and no Docker or network required.

**Additionally:** MC was originally positioned as a stepping stone toward Azure AI Foundry.
After removing MC, Foundry becomes the direct next target after the prototype, not the third
step. This simplifies the migration path: governance layer (skills, trace schema, authority
registry, agent logic) transfers unchanged; only the queue mechanism swaps.

---

**Options Considered**

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| A — Keep Mission Control | Debug Docker, proceed with MC as planned | No artefact rewrite | External dependency; alpha software risk; Docker required for every demo; pre-flight friction |
| B — Filesystem queue, then MC, then Foundry | Prototype on filesystem, migrate to MC, then migrate to Foundry | Migration path incremental | Two migration steps instead of one; MC adds complexity without additional governance value |
| C — Filesystem queue, then Foundry directly | Prototype on filesystem, next version on Foundry | Zero external service; deterministic; one migration path; removes entire MC risk class | Foundry timeline is less certain than local prototype — explicitly not a prototype concern |

---

**Decision:**

**Option C** — filesystem queue for the prototype; Azure AI Foundry is the first real runtime
target after the prototype.

**Filesystem queue design:**
- `queue/inbox/` — task JSON files awaiting the dev agent
- `queue/review/` — task JSON files awaiting the review agent
- `queue/quality-review/` — task JSON files awaiting the assurance agent
- `queue/done/` — completed task JSON files
- `queue/history.jsonl` — append-only newline-delimited JSON history of all transitions
- Tasks are JSON files named `task-<id>.json`
- State transitions: `fs.rename()` moves the file between folders; history entry appended to `queue/history.jsonl`
- No Docker, no HTTP API, no external service of any kind

**What transfers unchanged to Foundry:**
- All three agent logic files (`dev-agent.ts`, `review-agent.ts`, `assurance-agent.ts`)
- Skill loading and prompt hashing (`src/lib/skill-loader.ts` — S2)
- Trace schema (`src/types/trace.ts`, `TraceEntry`, `AssuranceRecord` — S2–S4)
- Authority registry pattern (S4)
- Only the queue client (`src/lib/queue-client.ts`) is replaced when migrating to Foundry

---

**Consequences:**

- `node-fetch` dependency removed from `package.json` — no HTTP client needed
- `docker-compose.yml` removed from the repository — no Docker required for the prototype
- Integration tests no longer require Docker — they use temporary directories (`os.tmpdir()`) as fixture queues; this means `@integration` tagged tests can run in any CI environment without Docker available
- S1 complexity rating changes from 2 → 1 (filesystem operations are well-understood; no alpha software risk)
- S1 W2 warning (unstable — MC alpha software) is dissolved; scope stability becomes Stable
- S7 setup instructions change: `mkdir -p queue/{inbox,review,quality-review,done}` or `npm run init-queue` replaces `docker compose up`
- All other stories (S2–S7): governance logic, trace schema, skill loading are unchanged — only references to MC column names or MC API are updated to filesystem equivalents

---

**Revisit triggers:**

1. **Filesystem queue becomes a bottleneck:** If sequential filesystem reads/writes become
   unreliable under any test scenario (unlikely — prototype is single-threaded and sequential),
   revisit the queue mechanism before adding concurrency.

2. **Foundry hosting becomes available for the prototype phase:** If Azure AI Foundry hosted
   agents become accessible within the prototype timeline, migrate the queue client directly
   to Foundry's queue mechanism without introducing MC as an intermediate step.

3. **Demo environment requires a UI:** If a stakeholder demonstration requires a visible
   Kanban-style board rather than reading JSON files, add a thin read-only HTML visualisation
   of `queue/history.jsonl` rather than reintroducing MC.
