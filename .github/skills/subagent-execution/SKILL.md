---
name: subagent-execution
description: >
  Executes an implementation plan by dispatching a fresh subagent per task,
  with two-stage review after each task: spec compliance first, then code
  quality. Fresh context per subagent prevents confusion and keeps tasks focused.
  Use when the implementation plan exists and subagents are available.
  If no subagents are available, use /tdd task-by-task instead.
triggers:
  - "execute the plan"
  - "dispatch the subagents"
  - "implement using subagents"
  - "subagent execution"
  - "run the plan"
---

# Subagent Execution Skill

## Entry condition

1. Implementation plan at `artefacts/[feature]/plans/[story-slug]-plan.md`
2. Worktree exists and baseline is clean (run /branch-setup if not)

If not met:

> ❌ Entry condition not met.
> Missing: [list what is missing]

---

## Core principle

Fresh subagent per task + two-stage review (spec compliance → code quality) = high quality, fast iteration.

**Why fresh subagents:**
You delegate each task to an agent with precisely constructed context.
They inherit nothing from this session — you give them exactly what they need.
This prevents context pollution and keeps each task focused.

The reviewer subagents also receive precisely constructed context — not your session history.
This keeps reviewers objective.

---

## Policy overlays (embedded)

Read `.github/context.yml` at start of execution.

- If `optimization.routing` exists: choose implementer/reviewer model class from
  policy first, then fall back to the default model-selection table below
- If `optimization.token_policy` exists: keep task prompts minimal and only pass
  task-local context, not full session history
- If `mapping.stage_aliases` exists: include org-stage labels in progress updates
  while keeping canonical stage names for state updates

---

## Step 1 — Read the plan once

Read `artefacts/[feature]/plans/[story-slug]-plan.md` fully.

Extract all tasks:
- Task number and title
- Full task text (every step, all code, expected outputs)
- Adjacent context (what was built before, what comes next)

Create a todo list tracking all tasks.

---

## Step 2 — Per-task loop

For each task:

### 2a — Dispatch implementer subagent

Construct context for the subagent:

- Full task text (copy verbatim from the plan — do not paraphrase or summarise)
- Scene-setting context: what has been built so far, where this task fits in the plan
- Constraints from the DoR: architecture guardrails, out-of-scope items
- Test command
- Instruction: "Follow /tdd. RED—GREEN—REFACTOR. Commit after each test passes."

Wait for the implementer to return one of four statuses:

| Status | Meaning | Your action |
|--------|---------|-------------|
| `DONE` | Task complete, committed | Proceed to spec review (Step 2b) |
| `DONE_WITH_CONCERNS` | Complete but flagged doubts | Read concerns. If correctness/scope issue: address before review. If observational: note and proceed. |
| `NEEDS_CONTEXT` | Missing information | Provide the missing context and re-dispatch |
| `BLOCKED` | Cannot complete task | See escalation path below |

**Escalation path for `BLOCKED`:**

1. Context problem → provide more context and re-dispatch
2. Task requires more reasoning → re-dispatch with a more capable model
3. Task too large → break into smaller pieces and re-dispatch
4. Plan itself is wrong → escalate to human and stop

Never force the same model to retry without changes. Never ignore an escalation.

### 2b — Dispatch spec compliance reviewer

Construct context:

- Full task text from the plan
- Git diff since the task started: `git diff [start-sha] HEAD`
- ACs from the story artefact that this task covers
- Instruction: "Review ONLY for spec compliance. Does the implementation match the spec? Nothing extra, nothing missing."

Reviewer responds with:

- ✅ Spec compliant — proceed to code quality review (Step 2c)
- ❌ Issues found — list them specifically

If issues found: dispatch the implementer (same subagent, updated context) to fix.
Re-dispatch the spec reviewer after each fix.
Repeat until ✅.

**Spec compliance must be ✅ before starting code quality review.**

### 2c — Dispatch code quality reviewer

Construct context:

- Git diff for the task
- Codebase conventions from the active agent instruction file (e.g. `copilot-instructions.md` or `AGENTS.md` — see `context.yml: agent.instruction_file`) and `.github/architecture-guardrails.md`
- Instruction: "Review for code quality: naming, structure, test quality, YAGNI, DRY. Report Critical / Important / Minor issues."

Reviewer responds with:

- ✅ Approved — mark task complete
- Critical or Important issues → implementer fixes, reviewer re-reviews

Repeat until ✅.

### 2d — Mark task complete

- Check off the task in the implementation plan file
- Record the ending git SHA for this task

---

## Step 3 — Final review

After all tasks complete:

Dispatch a final reviewer subagent with:

- Full diff from first task to last: `git diff [first-sha] HEAD`
- All ACs from the story artefact
- Instruction: "Review the complete implementation against all ACs. Confirm nothing is missing or extra."

If issues found: address before proceeding.

---

## Step 4 — Hand off

> ✅ **All [N] tasks complete.**
>
> Final review: PASSED
>
> Next: run /verify-completion to confirm all ACs are satisfied before opening a PR.

---

## Model selection

Use context policy first (`optimization.routing`). If not configured, use the
least capable model that can handle each role to conserve cost:

| Role | Recommended model |
|------|------------------|
| Mechanical implementation (1—2 files, clear spec) | Fast/cheap model |
| Integration task (multi-file, pattern matching) | Standard model |
| Architecture, review, final review | Most capable available |

---

## Red flags

**Never:**

- Start implementation on main/master without explicit consent
- Skip spec compliance review
- Skip code quality review
- Start code quality review before spec compliance is ✅
- Move to the next task while either review has open issues
- Let the implementer's self-review replace the reviewer subagent
- Dispatch multiple implementer subagents in parallel (causes conflicts)
- Make subagents read the plan file themselves — provide full task text

---

## Integration

**Reads:** implementation plan, DoR artefact, story artefact, architecture guardrails
**Subagents use:** /tdd (per task)
**Follows:** /implementation-plan
**Precedes:** /verify-completion
**If no subagents available:** use /tdd task-by-task instead

---

## State update — mandatory final step

> **Mandatory.** Do not close this skill or produce a closing summary without writing these fields. Confirm the write in your closing message: "Pipeline state updated ✅."

Update `.github/pipeline-state.json` in the **project repository** progressively during execution:

- When execution begins: set story `stage: "subagent-execution"`, `health: "green"`, `updatedAt: [now]`
- Initialise a `tasks` array on the story — one entry per task in the implementation plan:
  ```json
  { "id": 1, "name": "<task name>", "tddState": "not-started" }
  ```
- As each task moves through TDD, update its `tddState`:
  - Failing test written: `"red"` → minimal implementation passes: `"green"` → refactor done: `"refactor"` → committed: `"committed"`
- After each task commits: run the full test suite and update `testPlan.passing` with the current passing count, and update story `updatedAt`
- At any point that the running test count is known, keep `testPlan.passing` current — the visualiser reads this live
- If a task is stuck or a subagent fails a review: set story `health: "amber"`, note the task in `blocker`
- When all tasks complete and two-stage review passes: set `health: "green"`, clear `blocker`
- If a critical issue blocks progress: set `health: "red"`, `blocker: "[issue description]"`
