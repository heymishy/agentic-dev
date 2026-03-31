# Data Standards

<!-- Fill in your data modelling, validation, and residency rules. Examples below — replace with your own. -->

## Data classification

[e.g. Public / Internal / Confidential / Restricted. Classification determines encryption, logging, and access requirements.]

## Data residency

[e.g. All data stored in Australia East region. No replication to regions outside Australia without explicit approval.]

## Validation rules

[e.g. All input validated at service boundary. Use Zod / Joi / Pydantic schemas. Reject unknown fields. Sanitise before persistence.]

## PII handling

[e.g. PII fields encrypted at rest using AES-256. PII never logged. PII masked in error messages. Right-to-erasure supported via soft-delete + scheduled purge.]

## Database standards

[e.g. PostgreSQL. Migrations via Flyway / Liquibase. No raw SQL in application code — use ORM. All foreign keys enforced at DB level.]

## Identifiers

[e.g. UUIDs v4 for all entity IDs. No sequential integer IDs exposed externally.]
