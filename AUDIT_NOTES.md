# Budget HQ 0.9.32 — pending activity, paydays, calendar audit

## Install
Stop the Budget HQ server, replace the app folder with this extracted version, restart START_BUDGET_HQ.cmd using the same Windows user and data-home setting, and refresh the browser. Settings should display version 0.9.32. Refresh the bank connection to retrieve pending entries previously withheld for a future posting date. All earlier updates are included.

## Confirmed fixes
- Transactions now has a Pending Bank Activity panel covering active cash and credit accounts, separate from recorded spending. Card purchases do not reduce checking cash.
- Pending transactions with bank-supplied future posting dates are retained. Posted future transactions are still withheld. Pending entries remain unbooked and available balances are not reduced twice.
- Income occurrences are sorted by date across all income sources, so Next Payday uses the closest eligible occurrence, not the first source entered. Paid occurrences are excluded.
- Idle refresh updates the budget on a new day even when the saved revision is unchanged; returning to the app also checks for updates. Open forms and Design Mode defer refresh.
- Opening Calendar without a specific month uses the current budget month. Explicitly selected month routes still work.
- Calendar estimates now include paid scheduled amounts without deleting payment history from the balance calculation. Calendar requests use one budget snapshot.
- Emergency-fund essential-cost calculations now include recurring bills categorized as Car, consistent with the existing transportation description.

## Recurring bills and estimates
Active, valid recurring bills and debt schedules generate calendar events and forecast expenses. Positive debt balances require a payment amount, due date and supported frequency. Existing debt inputs are linked entries, not duplicate bills.

Calendar now shows Schedules Needing Attention for missing/invalid dates, missing amounts, unsupported recurrence values and expired one-time dates. Edit Schedule opens the relevant bill or debt. Complete the actual details there; the app does not invent due dates. Previously skipped/cancelled occurrences remain excluded; paid occurrences are excluded from outstanding bills but included in predicted scheduled totals.

## Verification and limits
311 automated tests passed, including HTTP, ledger, categorization, recurring schedules, pending transitions and UI rendering contracts. Tests cover pending activity on cash and cards, future pending dates, multiple employers in reverse date order, date rollover without a revision change, recurring bill/debt inclusion in forecast totals, and paid debt estimates without changing ledger balances.

The local app package contains no live user budget or bank history. The reported missing-bill issue cannot be attributed to one specific saved record without that data. Tests verify valid schedules; the new panel identifies incomplete schedules in the running app. If an apparently valid bill is still absent, share its Edit Schedule fields and the selected calendar month, with personal details removed.

Pending items can only be displayed when the bank supplies them. Bank available balance may contain holds for which no individual pending transaction was returned. The panel says this explicitly; it never invents transaction details. A real browser visual review and live bank synchronization were not performed.
