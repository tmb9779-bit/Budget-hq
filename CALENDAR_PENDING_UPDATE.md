# Budget HQ 0.9.33 — calendar/forecast consistency and pending diagnostics

## Install
Stop the server, replace the app folder with this extracted version, restart under the same user and data-home setting, and refresh the browser. Confirm Settings shows 0.9.33. All prior updates are included.

## Calendar and 60-day forecast
The calendar now receives its budget and forecast from the same server snapshot. A new Same 60-Day Forecast as Plan summary shows the exact forecast dates, starting cash after saved money, expected income, bills/debt and ending balance. Select a calendar day to see the corresponding forecast income, outflows and projected balance. Overdue amounts reserved today are itemized in both the calendar and forecast day details, while original bill dates remain visible.

The calendar's former PREDICTED monthly card is now MONTHLY SCHEDULED. It includes scheduled amounts already paid during the selected month. This monthly historical comparison is intentionally distinct from a forward-looking 60-day cash forecast of remaining payments. The new captions explain the difference.

## Scott Credit Union pending charges
Transactions → Pending Bank Activity → Pending Sync Status now reports counts separately for each bank: received, imported and withheld, plus withholding reasons and the connection check timestamp. Click Refresh Bank Connection there to populate the diagnostics. No bank credentials or raw bank payloads are displayed.

A received count of zero means no pending records were supplied in the cached transaction data available to that sync; it does not prove the bank lacks support. A failed sync is explicitly labeled rather than reported as zero. Withheld records identify account mapping, discarded records, missing/unsupported currency or invalid fields. Individual pending charges may not be available even when the available balance reflects holds.

Scott Credit Union's live pending-transaction support has not been verified. To identify the remaining issue, send the Scott Credit Union Pending Sync Status counts and timestamp after refresh. No account number or transaction amounts are needed.

## Validation
Automated checks cover all-day equality of calendar/forecast income and outflows, overdue reserves, partial debt payments, UI breakdowns, and pending diagnostic counts for success, zero records, withholding and failure. All 110 tests in the affected UI and calendar-consistency suites passed after the final changes. The broader suite also verified the remaining ledger, HTTP, bank-import and scheduling checks. No live bank connection or real-browser visual verification was available.
