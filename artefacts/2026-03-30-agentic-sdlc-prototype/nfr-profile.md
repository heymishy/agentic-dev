# NFR Profile: Agentic SDLC Prototype — Policy-as-Prompt Governance

**Feature:** 2026-03-30-agentic-sdlc-prototype
**Created:** 2026-03-30
**Last updated:** 2026-03-30
**Status:** Active

---

## Performance

| NFR | Target | Measurement method | Applies to story |
|-----|--------|--------------------|-----------------|
| Agent script execution time | Each agent script completes its queue interaction and trace emission within 5 seconds under normal local conditions | Manual timing during build and dry run | S1, S2, S3, S4 |
| Skill file hashing + criteria evaluation | Completes within 2 seconds on a standard laptop | Manual timing | S2, S3, S4 |
| Full loop end-to-end (3 agents) | Under 30 seconds total for a standard task | Manual timing; recorded in M4 dry-run results | S7 |

**Source:** Story NFR sections (S1, S2). Not formal SLOs — signals that the runtime is responsive enough for demonstration. No throughput or load targets defined for the prototype (single-user, local environment).

---

## Security

| NFR | Requirement | Standard or clause | Applies to story |
|-----|-------------|-------------------|-----------------|
| No credentials in code or artefacts | Zero tolerance — no API keys, tokens, passwords, or organisational secrets in any committed file | Discovery constraint ("fully open / publicly shareable") | All stories |
| No organisational data | No real business data, internal system references, or proprietary context in any script, trace, or artefact | Discovery constraint | All stories |
| No external connections at runtime | All runtime operations are local; no network calls to external services during a prototype run | Discovery constraint | All stories |
| Input to trace log | Trace log entries are written by agent scripts only — no user-supplied content injected into the trace without agent mediation | OWASP A03: Injection | S2, S3, S4 |
| Append-only trace log | Prior trace entries must not be modifiable after the assurance record is written | M6 requirement / S6 | S6 |

**Data classification:** ✅ Public — no PII, no sensitive data, no regulated content. All data is synthetic and designed to be publicly shareable.

**Source:** Discovery constraints section; OWASP A03 (injection); M6 metric requirement.

---

## Data Residency

| Requirement | Region / boundary | Regulatory basis | Applies to story |
|-------------|------------------|-----------------|-----------------|
| All data remains on local machine | No data leaves the developer's laptop during a prototype run | Discovery constraint ("no cloud infrastructure, no external services") | All stories |

---

## Availability and Reliability

No availability SLA defined. The prototype runs on-demand on a local machine; there is
no uptime requirement. Mission Control is pinned to a specific release at the start of
the build (see discovery risks — Mission Control alpha instability mitigation) and is
not updated during the prototype phase.

**Failure handling:** Out of scope per discovery. No retry logic, error recovery, or
fallback paths. If an agent script fails, the builder diagnoses manually.

---

## Accessibility

Not applicable — the prototype has no user interface beyond Mission Control's built-in
board (which is an alpha third-party tool) and a command-line trace log file. The
trace log legibility requirement (M5) is a governance readability requirement, not an
accessibility requirement — addressed in S6.

---

## Compliance

No named compliance frameworks apply to the prototype itself. The prototype
*demonstrates* a governance pattern that addresses emerging regulatory requirements
(Basel Committee, financial services AI governance) — but the prototype is a proof of
concept on a personal machine with synthetic data. It is not subject to PCI-DSS, GDPR,
SOC 2, or any other regulatory framework.

**Regulatory context note:** The prototype's purpose is to produce a verifiable audit
trail that illustrates what compliant AI governance looks like. The prototype itself
is not a regulated system.

---

## TypeScript Build Integrity

| NFR | Requirement | Applies to story |
|-----|-------------|-----------------|
| Strict mode | `strict: true` in `tsconfig.json` — no exceptions | All stories |
| Type coverage | All trace entries conform to `src/types/trace.ts`; no `any` in trace-related code | S2, S3, S4, S6 |
| Build clean | `tsc --noEmit` passes with zero errors before any story is marked complete | All stories |

**Source:** Discovery constraint ("TypeScript with strict mode enabled — no exceptions").

---

## NFR Summary

| Category | Status |
|----------|--------|
| Performance | Soft targets defined — not hard SLOs |
| Security | Hard constraints: no credentials, no PII, no external connections, append-only trace |
| Data residency | Local machine only |
| Availability | No SLA — on-demand prototype |
| Accessibility | Not applicable |
| Compliance | None — proof-of-concept on synthetic data |
| TypeScript build | Hard constraint: strict mode, clean build required |

**Human sign-off required at DoR:** No named regulatory clauses. No sign-off required
beyond standard DoR process.
