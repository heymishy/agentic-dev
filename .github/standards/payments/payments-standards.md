# Payments Standards

<!-- Fill in your payment processing rules. Examples below — replace with your own. -->

## PCI-DSS scope

[e.g. This service is in scope for PCI-DSS SAQ A-EP. Card numbers (PANs) are never stored — tokenised via payment gateway before persistence.]

## Tokenisation

[e.g. Raw PANs must never be logged, stored, or passed between services. All card data tokenised at point of capture via gateway SDK. Token stored, never PAN.]

## Retry and idempotency

[e.g. All payment requests include a client-generated idempotency key. Retries use same key. Maximum 3 retries with exponential backoff.]

## Failure handling

[e.g. Payment failures return a structured error with a decline code. No retry on hard declines (do_not_honour, invalid_card). Retry permitted on soft declines (insufficient_funds) with user consent.]

## Audit logging

[e.g. Every payment event (initiated, authorised, settled, refunded, declined) logged with: payment ID, amount, currency, timestamp, masked PAN (last 4), result code. Logs retained for 7 years.]

## Prohibited patterns

- No logging of full PANs, CVVs, or expiry dates
- No storing CVVs under any circumstances
- No client-side payment logic that bypasses gateway
