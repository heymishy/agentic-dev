# Benefit Metric: Agentic SDLC Prototype — Policy-as-Prompt Governance

**Discovery reference:** `artefacts/2026-03-30-agentic-sdlc-prototype/discovery.md`
**Date defined:** 2026-03-30
**Metric owner:** Hamish (sole builder and primary demonstrator)

---

## Tier Classification

**⚠️ META-BENEFIT FLAG:** Yes

This initiative simultaneously delivers a working prototype (Tier 1: system behaviour
metrics) and validates whether policy-as-prompt governance is tractable as a concept
(Tier 2: meta-learning metric). The project can succeed on Tier 2 even if Tier 1
targets need another iteration — but only because that tradeoff is explicit here.

---

## Tier 1: Product Metrics (System Behaviour)

### M1: Autonomous loop completion on an unseen task

| Field | Value |
|-------|-------|
| **What we measure** | Does a task move inbox → Done through all three agents with zero human actions beyond initial task creation and first trigger, on first run against a task the agents haven't seen before? |
| **Baseline** | 0% — system does not exist yet |
| **Target** | 100% — loop closes cleanly on first attempt against an unseen task |
| **Minimum validation signal** | Loop closes on a rehearsed/known task — this is a **build checkpoint only, not a success signal**. The unseen-task run is the only result that counts. |
| **Measurement method** | Single-person verification during build: run the loop against a new task the agents have never processed. Observe outcome. Binary pass/fail. |
| **Feedback loop** | If loop doesn't close on first unseen run: diagnose which agent failed (queue/state issue vs skill issue) before recording a result. Do not substitute a rehearsed-task result as evidence. |

---

### M2: Per-decision traceability to versioned skill

| Field | Value |
|-------|-------|
| **What we measure** | % of trace entries containing all three fields: skill name, version number, AND a prompt hash that resolves to a specific committed file in the skills-repo |
| **Baseline** | 0% — no trace entries exist |
| **Target** | 100% of all three trace entries in every run |
| **Minimum validation signal** | All three trace entries contain a prompt hash (manual hash resolution acceptable for build phase) |
| **Measurement method** | After each run: open trace log, verify each entry contains all three fields. Verify hash matches committed SKILL.md content by independently computing SHA from disk and comparing. Manual verification is acceptable in prototype phase. |
| **Feedback loop** | Any trace entry missing a field or with an unresolvable hash is a build defect — resolve before demonstrating. **Note:** fully automated hash resolution (e.g. a verification script comparing trace hashes against the skills-repo automatically) is a next-phase hardening item — its absence in the prototype is a deliberate deferral, not an oversight. |

---

### M3: Assurance agent detects injected criterion failure

| Field | Value |
|-------|-------|
| **What we measure** | Does the assurance agent (a) correctly identify a deliberately injected criterion failure and (b) correctly pass a clean trace without false positives? |
| **Baseline** | Not measurable — system does not exist |
| **Target** | 1/1 injected failures detected; 0/0 false positives on a clean run |
| **Minimum validation signal** | 1/1 injected failures detected (clean run verification is also required — this metric only passes when both tests pass) |
| **Measurement method** | Two formal test runs before any external demonstration: (1) modify dev agent trace to contain a false criterion pass — verify assurance agent flags it and does not move task to Done; (2) run a clean loop where all criteria genuinely pass — verify assurance agent closes the task without flagging errors. Both results recorded explicitly. |
| **Feedback loop** | Injected failure not detected → assurance agent is doing confirmation not assurance — blocking defect. False positive on clean run → assurance agent criteria are miscalibrated — blocking defect. Both failure modes are equally unacceptable. |

---

### M4: Time to complete audit trail — uninitiated person

| Field | Value |
|-------|-------|
| **What we measure** | Time from `git clone` to reading a complete audit trail, by a person who has never seen the prototype, following only the README, with no assistance |
| **Baseline** | Not yet established |
| **Target** | Under 30 minutes, with no more than 2 assistance requests |
| **Minimum validation signal** | Under 60 minutes — proves self-containment even if README needs polish |
| **Measurement method** | At least one dry run with a person unfamiliar with the build. Clock time recorded. Assistance requests counted and noted verbatim (each one identifies a specific README defect). |
| **Feedback loop** | If over 30 minutes: identify which step caused the overrun — queue initialisation, script clarity, or trace readability — and fix before external demonstration. **More than 2 assistance requests during the dry run is a blocking defect regardless of total time.** A run completed in 28 minutes with 5 interventions does not pass — fix the README before any external demonstration. |

---

### M5: Trace log is self-interpreting to a non-engineer reader

| Field | Value |
|-------|-------|
| **What we measure** | Can a non-engineer reader answer all three questions from the raw trace alone, without briefing or assistance: (1) what policy governed this decision, (2) how was compliance verified, (3) who or what made the assurance call? |
| **Baseline** | 0/3 — no trace exists |
| **Target** | 3/3 questions answered correctly in writing by at least one non-engineer, answers match ground truth |
| **Minimum validation signal** | 2/3 questions answerable without assistance — **on the condition that question 1 ("what policy governed this decision?") is always one of the two answered**. Question 1 failing is a blocking defect regardless of other scores: if the trace cannot answer the policy question it has not demonstrated governance, it has demonstrated logging. |
| **Measurement method** | Ask at least one non-engineer to read the raw trace log and write answers to the three questions. Score answers against ground truth. Do not brief the reader in advance. |
| **Feedback loop** | Any unanswered question identifies a specific structural gap — fix the field naming, labelling, or narrative structure of that trace entry. Question 1 failure is a blocking defect before any external demonstration. |

---

### M6: Trace log integrity — tamper-evidence

| Field | Value |
|-------|-------|
| **What we measure** | Are completed trace entries append-only after the assurance agent has written its record? Can the contents of a prior trace entry be modified without detection? |
| **Baseline** | Not yet established — no trace log exists |
| **Target** | Manual inspection confirms all trace entries are append-only; no entry written before the assurance record can be silently modified |
| **Minimum validation signal** | At least one explicit verification that modifying a trace entry post-assurance (e.g. editing the file timestamp and content) either fails or is detectable |
| **Measurement method** | Manual inspection during build: after a complete run, attempt to modify a prior trace entry and confirm the change is either blocked (filesystem/tooling) or produces a detectable inconsistency (e.g. hash mismatch on re-verification). Document the mechanism explicitly. |
| **Feedback loop** | If no tamper-evidence mechanism exists at all: document this explicitly in the prototype's own governance record and in the README — a sceptical auditor will ask this question and the answer must be "we know this is the current limitation and here is what the next phase adds." Absence of an answer is worse than absence of the control. |

---

## Tier 2: Meta Metrics (Learning / Validation)

### MM1: Concept conviction — outside stakeholder

| Field | Value |
|-------|-------|
| **Hypothesis** | A running governed prototype — demonstrable by the viewer themselves — is sufficient to convince a risk, compliance, or architecture stakeholder that the pattern is viable and worth developing further |
| **What we measure** | Nature of the first substantive unprompted question from at least one outside reviewer after running the prototype themselves |
| **Baseline** | No outside reviews have occurred |
| **Target** | At least one reviewer from risk, compliance, or architecture asks a next-phase question (e.g. "how would this work at scale?", "what would productionising this require?") rather than a concept-validity question (e.g. "but does this actually prove governance?") |
| **Minimum signal** | Reviewer engages with the prototype long enough to form at least one specific question — any specific question — rather than rejecting the premise |
| **Measurement method** | One structured demo to at least one outside stakeholder before claiming success. Record their first question **verbatim before responding to it** — once you engage, their subsequent questions are shaped by your answer; only the first unprimed question is clean data. Classify as next-phase or concept-validity. When uncertain, classify as concept-validity (conservative default). |

---

## Metric Coverage Matrix

*Populated by /definition — 2026-03-30.*

| Metric | Stories that move it | Coverage status |
|--------|---------------------|-----------------|
| M1: Autonomous loop completion | S1 (proves bare loop); S2–S4 (governance added without breaking loop) | ✅ Covered |
| M2: Per-decision traceability | S2 (dev trace); S3 (review trace); S4 (assurance record — all three legs) | ✅ Covered |
| M3: Assurance detects injected failure | S4 (establishes independent assurance mechanism); S5 (formal injection + clean-run tests) | ✅ Covered |
| M4: 30-minute self-service bar | S7 (packaging, README, dry-run validation) | ✅ Covered |
| M5: Trace self-interpreting | S6 (schema finalisation, non-engineer legibility test) | ✅ Covered |
| M6: Trace integrity / tamper-evidence | S6 (tamper-evidence mechanism built and tested) | ✅ Covered |
| MM1: Stakeholder concept conviction | Measured post-Epic 2 via structured demo after S7; not a buildable story — outcome depends on demonstration, not implementation | ✅ Acknowledged — post-S7 activity |

---

## What This Artefact Does NOT Define

- Individual story acceptance criteria — those live on story artefacts
- Implementation approach — that is /definition and /implementation-plan
- Sprint targets or velocity — these metrics are outcome-based, not output-based
- Production security controls — explicitly deferred per discovery out-of-scope
