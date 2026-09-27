# Folio

Local expense dashboard with live TypeSafe Jev categorisation.

## Run

Use Node 22+. Put `TYPESAFE_API_KEY=...` in `.env` (the existing `typesafeai_api_key` name also works), then run `npm start`. Open http://localhost:3000. No runtime npm packages are needed. `npm install` installs the optional browser-test dependency.

## Data and decisions

The original TXT statement loads automatically: 339 transactions, PLN 24,206.84 outgoing. The accompanying CSV contains 350 rows; all 339 original rows match exactly by booking date, normalized merchant, amount, currency and description. Additional CSV rows do not silently expand the original statement. Import the CSV to see all its rows.

Jev first classifies merchant/description/operation data. A second Jev Choice compares that decision against the bank category. Account numbers, owner information and reference numbers are not sent to TypeSafe. Decisions are cached locally in ignored `data/` files. Original bank and initial Jev labels remain available in each row and CSV export.

Evidence-based corrections for Vintrica (transport), Siepomaga (giving) and Żona Krawca (food and coffee) are recorded in `reviewed.mjs`, with primary-source links. These are labeled Evidence reviewed, not shown as AI confidence. Manual edits take precedence and are saved in this browser's local storage. Other and model confidence below 70% go into Needs a look. This threshold is a review heuristic, not a validated accuracy guarantee.

Uploaded TXT files must match the bank's tab-separated layout. CSV files use the provided Polish semicolon-separated headers. Maximum upload 2 MB / 3,000 rows. Amounts in different currencies are kept separate by the currency selector. Positive amounts are displayed as incoming, not expenses.

## Checks

`npm test` checks parsing, privacy of model payloads, reconciliation, duplicate matching and evidence corrections. `node browser-check.mjs` uses installed Google Chrome to check search, pagination, review navigation, invalid imports, JavaScript errors and mobile overflow.
