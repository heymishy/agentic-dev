# Security Standards

<!-- Fill in your security rules. Examples below — replace with your own. -->

## OWASP Top 10 mitigations

- **Injection:** Parameterised queries only. No string concatenation in queries.
- **Broken auth:** See auth-patterns.md. Token expiry enforced server-side.
- **Sensitive data exposure:** TLS 1.2+ only. Secrets in vault, not env files committed to git.
- **XXE:** XML parsing disabled or hardened. Prefer JSON.
- **Access control:** Deny by default. Permissions checked at service layer.
- **Security misconfiguration:** No default credentials. Debug mode off in production.
- **XSS:** Output encoding in all templates. CSP headers set.
- **Insecure deserialisation:** No deserialisation of untrusted data to objects.
- **Vulnerable components:** Dependency scanning in CI. No unpatched critical CVEs shipped.
- **Logging:** Security events logged (auth failures, access denials). No secrets in logs.

## Secrets management

[e.g. All secrets stored in Azure Key Vault / AWS Secrets Manager / HashiCorp Vault. No secrets in code, config files, or environment variables committed to git.]

## Dependency policy

[e.g. `npm audit` / `pip audit` runs in CI. Builds fail on critical CVEs. Review required for high CVEs before merge.]

## Security review triggers

[e.g. Any change to auth, payments, or PII handling requires a security review before merge.]
