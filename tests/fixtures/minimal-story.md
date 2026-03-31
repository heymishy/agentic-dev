# Story — Minimal Smoke Test Fixture

**Status:** Draft
**Story slug:** csv-export
**Epic:** results-export

## User story
As Alex (workshop lead), I want to export session results as a CSV so that I can include them in same-day reports without manual copying.

## Acceptance criteria

**AC1:** Given I am on the results view, when I click "Export CSV", then a CSV file is downloaded to my browser with columns: card_title, x_value, y_value, exported_at.

**AC2:** Given the session has no cards, when I click "Export CSV", then an empty CSV (header row only) is downloaded.

**AC3:** Given the export succeeds, when I inspect the file, then no PII fields are included.

## Out of scope
- PDF export
- Server-side export
- Export of multiple sessions at once

## Benefit linkage
Metric: facilitator-export-time (target: < 30 seconds)

## Complexity
1 — well understood, clear path

## Scope stability
Stable

## Architecture constraints
Client-side only. No new API endpoints. Uses browser Blob + URL.createObjectURL pattern.

## NFRs
Performance: export of 100 cards must complete in < 500ms
Data classification: no PII — card content only
