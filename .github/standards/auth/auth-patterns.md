# Authentication & Authorisation Patterns

<!-- Fill in your auth/authz rules. Examples below — replace with your own. -->

## Authentication mechanism

[e.g. JWT Bearer tokens issued by the identity service. Tokens expire after 15 minutes. Refresh tokens valid for 7 days.]

## Session management

[e.g. Sessions stored server-side. Session cookie: HttpOnly, Secure, SameSite=Strict. No sensitive data in JWT payload.]

## Authorisation model

[e.g. RBAC. Roles: admin, user, readonly. Permissions checked at the service layer, not just the route layer.]

## MFA requirements

[e.g. Required for all admin actions. OTP delivered via notification service. 6-digit codes, 5-minute expiry, 3-attempt lockout.]

## Password rules

[e.g. Minimum 10 characters. bcrypt with cost factor 12. No maximum length. Breach-check on registration via HaveIBeenPwned API.]

## Prohibited patterns

- No credentials in URLs or logs
- No storing plaintext passwords or tokens
- No client-side auth decisions without server verification
