# Product Constraints

<!--
  This file is read by /discovery to pre-populate the Constraints section,
  and by /definition to scope what is technically and commercially feasible.
  
  Constraints here are HARD LIMITS — not preferences.
  If something is a guideline or recommendation, put it in .github/standards/ instead.
-->

## Regulatory and compliance

<!-- Laws, regulations, and compliance frameworks the product must follow.
     Example: "PCI-DSS Level 1 — all card data must be tokenised before storage"
              "GDPR — user PII requires explicit consent and right-to-erasure support" -->

- [FILL IN — or type "None identified" to explicitly confirm]

---

## Data residency

<!-- Where data must (and must not) be stored or processed.
     Example: "All customer data must remain in the AU Sydney region (ap-southeast-2)" -->

- [FILL IN — or "No data residency constraints"]

---

## Security requirements

<!-- Non-negotiable security constraints.
     Example: "No secrets in source code — all secrets via Vault/SSM",
               "All external endpoints must require authentication" -->

- [FILL IN]

---

## Performance floors

<!-- Minimum acceptable performance — below which a feature is not shippable.
     Example: "Page load < 3s on 4G connection",
               "API response < 200ms at P95 under 100 concurrent users" -->

- [FILL IN — or "No formal performance SLOs defined yet"]

---

## Availability and reliability

<!-- Uptime targets, RTO, RPO, deployment windows.
     Example: "99.9% uptime SLA — planned maintenance < 4h/month" -->

- [FILL IN — or "No SLA defined — internal tool only"]

---

## Budget and team constraints

<!-- Practical limits the team operates within.
     Example: "Single engineer — no dedicated QA",
               "AWS free tier only until product finds customers" -->

- [FILL IN]

---

## Integration constraints

<!-- External systems the product must work with — and limitations on those integrations.
     Example: "Must use the existing Salesforce instance — no new CRM",
               "Vendor API has rate limit of 100 req/min — no SLA on availability" -->

- [FILL IN — or "No external integration constraints"]
