# Discovery: Agentic SDLC Prototype — Policy-as-Prompt Governance

**Status:** Approved
**Created:** 2026-03-30
**Approved by: Hamish
**Author:** Copilot / human

---

## Problem Statement

Software delivery governance is retrospective and unverifiable. Policy lives in documents — Confluence, Word, PowerPoint, wikis — and is enforced by humans who are expected to internalise it through onboarding and tribal knowledge. At scale (500+ engineers across 100+ teams), consistent policy application is impossible. The result:
architectural decisions diverge from standards with no record of either the standard or the deviation.

When audit asks "what policy governed this decision and how was it verified?", the honest answer in most organisations is: "a human applied judgement informed by a document we can't prove they read." There is no closed loop between the policy that was supposed to govern a decision and the decision that was actually made.

Engineering leads experience this as inconsistency — teams making different architectural choices for the same problem because the standard was never operationalised. Risk and compliance experience it as an audit gap. The cost is retrospective governance: code review, architecture review, and audit catch violations
after the fact, often after something has gone wrong.

---

## Who It Affects

Five personas experiencing the same structural gap from different angles:

**Engineers doing the work** — mid-task, under delivery pressure, policy three clicks away in a documentation system they didn't open. Making reasonable judgement calls with incomplete context; the judgement is invisible to everyone the moment they move on.
Cost: unknown violations or productivity drag from manual policy-hunting before every non-trivial decision.

**Engineering leads and architects** — maintaining coherence across teams they can't directly observe. No reliable signal that standards are being followed until a review, incident, or audit surfaces a violation. Lag between violation and discovery: weeks to months. Cost: architectural drift that compounds silently until expensive to reverse.

**Delivery and programme managers** — unable to answer "how do we know this was done correctly?" with anything more specific than "the team followed the process." Need evidence, not assurance — something to point to rather than take on faith.

**Internal audit** — independently verifying controls are operating as designed. Finds a gap between control as documented and control as practised, with no artefact bridging the two. Sampling is the only tool; coverage is thin; findings are always retrospective.

**External regulators** — assessing whether the organisation has adequate controls over consequential decisions. Receives policy documentation and attestations but no mechanism to verify the link between policy and practice in operation. 
Cost: not just a finding — erosion of organisational credibility on governing autonomous systems, increasingly material as AI is used in more consequential decisions.

---

## Why Now

Four forces have converged simultaneously:

**1. Autonomous agents changed the risk profile of the gap.**
The governance gap was previously bounded by human throughput — perhaps dozens of consequential decisions per person per day, slow enough that review and course correction were at least theoretically possible. Agents remove that bound. Thousands of decisions per hour, each inheriting the same governance gap, compounding at machine speed. The same misconfiguration that produced drift in a human team produces systematic deviation at scale before anyone notices. The gap didn't worsen conceptually — it worsened operationally.

**2. The tooling to close the loop has only just become viable.**
Encoding policy as versioned, executable instructions and having agents apply, trace, and verify them was theoretically possible but practically out of reach for most organisations until roughly the last 18 months. SKILL.md standards, lightweight agent runtimes, and MCP servers providing live organisational context are new. The ability to build a governed three-agent loop on a laptop over a weekend is new. The problem is old; the tractability is recent.

**3. Regulatory direction is becoming explicit about AI governance.**
The Basel Committee, financial services regulators across multiple markets, and internal audit frameworks are moving from "we're watching" to "here are our expectations." The specific emerging requirement — demonstrate which policy governed a given AI decision and how compliance was verified — is exactly the gap this prototype
addresses. Organisations that can answer with a verifiable audit trail are ahead of the curve; those that answer with attestations are not.

**4. Agentic development tooling has arrived inside the SDLC right now.**
AI coding assistants are already in developer hands. Whether they're applying organisational standards consistently is not a future question. It's happening today, in every repository where a developer accepts a suggestion without a mechanism to verify it was consistent with the architectural standards the organisation has set. The SDLC is the most visible, most tractable domain to demonstrate the closed loop — and the pattern is directly portable to every domain where agents arrive next.

---

## MVP Scope

A single trivial feature request (e.g. "add a health check endpoint") flows from inbox to Done through three stateless agents. The work content is intentionally irrelevant —
the governance pattern is what's demonstrated.

**Dev agent:** receives task from queue, loads `feature-dev` skill, executes work
(implementation file, test file, changelog entry), checks its own output against the
skill's falsifiable criteria, emits a structured trace proving it did so, moves task
to Review, terminates.

**Review agent:** receives task from Review, loads `feature-review` skill, validates
the dev agent's trace (not the code), checks that the prompt hash in the trace matches
the currently registered `feature-dev` skill version, emits its own trace, moves task
to Quality Review or rejects to inbox with a reason, terminates.

**Assurance agent:** receives task from Quality Review, loads `feature-dev` skill
independently (ignores review agent's opinion), independently verifies both traces
against their respective skills, confirms both prompt hashes match registered versions,
emits an assurance record, moves task to Done or escalates to human review, terminates.

**A complete run satisfies all of:**
- Task is in Done (in the queue's `queue/done/` folder)
- Three trace entries exist (agent identity, skill name + version, prompt hash,
  per-criterion pass/fail, decision outcome)
- Assurance record confirms prompt hash in dev agent trace matches currently registered
  `feature-dev` skill version
- A person who wasn't present can open the trace log and reconstruct what happened,
  what policy governed it, and whether compliance was verified — without asking anyone

**Form:** a running system. Cloneable, self-contained. Clone → initialise queue folders
(`npm run init-queue`) → create task → trigger loop → read complete audit trail in
under 30 minutes on a laptop, no guided walkthrough. No Docker, no external services.

---

## Out of Scope

1. **Autonomous agent polling / self-invocation** — agents are triggered manually or
   via a simple script. Self-invocation is production runtime complexity that adds
   nothing to the governance proof. The queue state is what matters, not what reads
   from it.

2. **Bitbucket/GitHub API integration** — skills are read from the local filesystem.
   API-layer automation (webhooks on SKILL.md merge, PR-gated skill promotion,
   pipeline-triggered runs) is deferred. Git is already the versioning mechanism; the
   prototype hashes files from disk.

3. **Production-grade security hardening** — no mTLS, no secrets management, no RBAC
   beyond filesystem-level access controls, no network isolation, no penetration testing.
   Prompt hash verification and trace integrity are the security-relevant behaviours in
   scope. Everything needed for regulated production deployment is explicitly deferred.

4. **Complex or realistic feature tasks** — the task flowing through the prototype is
   deliberately trivial. Complexity in the work obscures complexity in the governance.
   Proving the loop closes on a simple case is the goal; proving it on a complex case
   follows after.

5. **Human-in-the-loop approval flows** — no approval gates, notifications, or
   escalation paths involving a human decision within the prototype run. The core claim
   is that assurance validation is independently verifiable without human judgement.
   Adding human approval steps to the MVP would undermine that claim before it's
   established.

6. **Integration with real external systems** — no live issue trackers, code repos via
   API, CI/CD pipelines, or IAM systems. Authentication, network dependencies, and data
   sensitivity concerns would dominate build effort and obscure the governance proof.
   The pattern is system-agnostic; demonstrating portability is a later problem.

---

## Assumptions and Risks

**Assumptions:**

- **Filesystem queue provides reliable shared state for sequential agent handoffs** —
  single-threaded sequential invocation produces no race conditions; `fs.rename()` is
  atomic within a single filesystem. No external service, no Docker, no alpha software
  dependency (see ADR-002).

- **Prompt hashing is stable and meaningful** — requires consistent file encoding, line
  endings, and whitespace handling across dev and assurance agent environments. A hash
  mismatch caused by OS line-ending differences (Windows vs Unix) would produce a false
  negative without indicating actual policy drift.

- **The assurance agent can be kept genuinely independent** — requires cold invocation
  in a clean context every time. If all three agents run in the same session or share
  execution context, the independence claim breaks down silently. The trace looks
  identical whether assurance was independent or implicitly correlated.

- **Falsifiable criteria are actually machine-checkable** — some criteria that appear
  falsifiable may require contextual reasoning an agent can't perform consistently. If
  the assurance agent must exercise judgement to evaluate a criterion, the criterion
  isn't falsifiable — it's a checklist item with an AI opinion attached.

- **A synthetic prototype is sufficient to demonstrate the governance claim** — the
  prototype controls every variable. Whether it proves anything about governed delivery
  under realistic conditions (ambiguous requirements, partial completions, contested
  criteria, policy conflicts) is a separate and harder question.

**Risks:**

- **The loop closes but not necessarily correctly** — the assurance agent verifies
  process was followed, not that outcomes were sound. A trace claiming 80% test
  coverage on meaningless tests is formally valid but substantively wrong. This is a
  fundamental limitation of process-based governance and must be stated explicitly when
  demonstrating — a sceptical auditor will identify it otherwise.

- **Agent independence is harder to enforce than to assert** — correlated validation is
  invisible in the output; the trace looks the same whether assurance was independent
  or implicitly correlated. *Mitigation: enforce cold-start invocation as a hard
  architectural rule; document how independence is maintained as part of the
  prototype's own governance record.*

- **30-minute self-service bar may not be achievable** — requires zero-friction queue
  initialisation (`npm run init-queue`), clearly scripted agent invocation, and a
  readable trace log. If any of those three requires a guide, the prototype has described
  the governance model alongside the system rather than embedded it — exactly the problem
  it exists to solve. The absence of Docker removes the most common setup friction point.

- **Sceptical auditors may not accept a synthetic task** — proves the loop can close
  under ideal conditions, not under production complexity. If presented as proof of
  production readiness it will be correctly dismissed. Presented as a proof of concept
  with a clear articulation of next phases, it's a credible foundation.

---

## Directional Success Indicators

1. **The loop closes without human intervention** — task moves inbox to Done through
   three agents; no human action beyond creating the task and triggering the first
   invocation. Must close on first run against an unseen task. If it only works on a
   rehearsed example, it's a demo, not a system.

2. **Every decision traceable to a versioned skill** — every trace entry contains skill
   name, version number, and a prompt hash that resolves to a specific committed file
   in the skills-repo. The hash must be independently verifiable by someone who wasn't
   present. A reference to a skill is not sufficient — a verifiable link to the exact
   governing content is required.

3. **The assurance agent validates from the trace alone** — given only the trace log
   (no session access, no conversation with anyone involved), produces a complete
   assurance record: criteria pass/fail, prompt hash match confirmed. Validated by
   deliberately introducing a criterion failure in a test run and confirming the
   assurance agent catches it. If it only works when everything passes, it's
   confirmation, not assurance.

4. **30-minute self-service bar** — an uninitiated person clones the repo, follows the
   README, runs the system, creates a task, triggers the loop, reads a complete audit
   trail — no help, under 30 minutes. This is a governance metric, not a usability
   metric.

5. **The trace log is self-interpreting** — a reader from risk, compliance, or audit
   with no engineering background can answer three questions without assistance: what
   policy governed this decision, how was compliance verified, and who or what made the
   assurance call. Formatting, field naming, and structure of trace entries are in-scope
   success criteria, not just content.

6. **A meaningful stakeholder reaction** — at least one person from outside the build
   (risk, compliance, or architecture) reviews the running prototype and responds with a
   question about the next phase rather than a question about whether the concept is
   valid. "How would this work at scale?" is success. "But does this actually prove
   governance?" means the prototype didn't land.

---

## Constraints

**Runtime and infrastructure:** A filesystem-based queue (folder moves + JSON task
files) is the queue mechanism for the prototype — no Docker, no external service.
Must run on a single laptop without external network dependencies beyond initial
clone. No cloud infrastructure, no always-on compute, no external services required
for a complete run. Azure AI Foundry is the first real runtime target after the
prototype (see ADR-002 in feature decisions.md).

**Skills and filesystem:** Skills are read from the local filesystem (cloned
skills-repo). No remote skill registry, no API-based skill resolution. The skills-repo
must be present on the same machine.

**Language and stack:** TypeScript with strict mode enabled. No exceptions. The stack
must be legible to an enterprise engineering audience and compatible with the Foundry
SDK when the prototype moves to the next phase.

**LLM provider:** GitHub Copilot Pro. No OpenAI API keys, no Anthropic API calls, no
Azure OpenAI endpoints in the prototype itself. Those are next-phase concerns when
Foundry enters the picture.

**Team size:** One person. If it can't be built and demonstrated by one person it's too
complex to be a convincing proof of concept.

**Time:** Four to six focused evening or weekend sessions. Anything that would push the
build beyond six sessions belongs in a later phase by definition.

**Organisational and security:** No real organisational data, credentials, or system
connections. No corporate network dependencies. No code touching any production system,
internal API, or proprietary organisational context. Must be demonstrable on a personal
machine using only public tooling and synthetic data. Must be fully open — nothing in
it that couldn't in principle be shared publicly.

---

**Next step:** Human review and approval → /benefit-metric
