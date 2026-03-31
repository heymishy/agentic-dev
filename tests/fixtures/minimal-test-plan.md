# Test Plan — Minimal Smoke Test Fixture

**Story:** csv-export
**Feature:** smoke-test-feature
**Date:** 2026-03-29
**Review run:** 1 (PASS)

## Tests

### T1 — CSV downloaded with correct columns (AC1)

```
GIVEN I am on the results view with 3 cards loaded
WHEN I click the "Export CSV" button
THEN a file named session-export.csv is downloaded
AND the file contains the header row: card_title,x_value,y_value,exported_at
AND each card appears as a data row with correct values
```

Type: unit
File: `src/utils/export.test.js`
Function under test: `exportToCSV(cards)`

### T2 — Empty CSV when no cards (AC2)

```
GIVEN I am on the results view with no cards
WHEN I click the "Export CSV" button
THEN a file is downloaded containing only the header row: card_title,x_value,y_value,exported_at
AND no data rows are present
```

Type: unit
File: `src/utils/export.test.js`
Function under test: `exportToCSV([])`

### T3 — No PII in export (AC3)

```
GIVEN exportToCSV is called with card data that includes internal metadata fields
WHEN the CSV string is produced
THEN the output contains exactly the columns: card_title, x_value, y_value, exported_at
AND no other fields are present
```

Type: unit
File: `src/utils/export.test.js`
Function under test: `exportToCSV(cards)` — assert column count = 4

## Test data strategy

No PII scope: cards contain facilitator-entered text only. No user identifiers, session IDs, or personal data in scope. Test data: synthetic card titles and numeric axis values.

## AC coverage table

| AC | Test(s) | Covered |
|----|---------|---------|
| AC1: CSV downloaded with correct columns | T1 | ✅ |
| AC2: Empty CSV when no cards | T2 | ✅ |
| AC3: No PII fields | T3 | ✅ |

## Gap table

None.
