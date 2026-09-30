# Budget HQ 0.9.24 — transaction categorization fix

## Install
1. Stop the running Budget HQ server.
2. Extract this ZIP and use its budget-hq-desktop folder in place of the previous app folder.
3. Start with START_BUDGET_HQ.cmd, using the same Windows user and any existing BUDGET_HQ_DATA_HOME setting. Keep the same browser address for your saved design.
4. Open Transactions and click Auto-categorize Other.

Your budget is stored separately from the application folder. This update does not reset your budget or require a new bank connection.

## What changed
- Adds Pets, Personal care, Services, Education, Insurance, Bank fees, Government & taxes, Donations, and Home improvement.
- Uses detailed bank categories plus merchant/description fallback rules when bank categories are missing or unrecognized.
- Retains bank category metadata for later categorization.
- Auto-categorize Other applies saved suggestions and description rules to existing uncategorized transactions. It also turns off the optional category-review setting so future bank imports receive categories automatically.
- Preserves manual category choices, linked payments/transfers, adjustments and excluded transactions.
- Fixes inconsistent category-review behavior on repeat bank refreshes.
- Does not treat every deposit as income: unidentified credits and ambiguous refunds can remain Other.

Previously imported records did not retain bank category metadata. Refresh the bank connection to retrieve available metadata, then run Auto-categorize Other again if needed. Unknown merchants may still require a manual category. Merchant rules describe likely purchase types, not item-level receipt contents.

Validation: 290 existing tests and 3 new categorization regression tests passed with sample/mocked data. Live bank data and visual browser rendering were not tested.
