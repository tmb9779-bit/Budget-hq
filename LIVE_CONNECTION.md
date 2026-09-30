# Plaid transactions and debt details — 0.9.20

Stop the old server. Extract into a new folder, start START_BUDGET_HQ.cmd, then press Ctrl+Shift+R. This uses your existing clean budget and bank connections. Click the top-right Refresh button.

New connections request consent for Liabilities as well as Transactions. For an existing connection, Settings → Accounts & Connections → Plaid Connection → Reconnect / Update Permissions can collect updated consent. Your Plaid developer project also needs the appropriate product access. Product usage may be billable under your Plaid plan.

Refresh still runs daily at 6 a.m. in the server computer’s time zone while the server is running. A missed run catches up at startup. Manual refresh runs the same account, transaction and liability updates.

Posted bank transactions automatically appear in Transactions and reports, marked Bank history. They never debit snapshot cash again. Pending transactions appear separately and are excluded from reports. Stable transaction IDs, cursor pagination, updates and bank removals are handled without replaying deposits or spending. Transaction fetching may take time after first connection; later refreshes retrieve available history.

Potential matches to existing manual spending/payments are held under Transactions → Needs Review → Imported History. Discard an imported candidate when the original payment/purchase already exists. Accept only if it is a separate record. Discarded or explicitly deleted imports remain suppressed on refresh. Bank-owned amounts, account and dates cannot be manually changed; categories can be edited.

Supported credit cards use purchase APR, minimum payment and next due date. Student loans use interest rate, minimum payment and due date. Mortgages use interest rate, next monthly payment and due date. These update the existing debt account schedule, not an additional recurring bill. Later monthly dates and payment amounts are projections until the next bank update. Cash-advance/transfer APRs are retained as metadata; payoff estimates still use a single purchase APR.

Manual APR/payment/date overrides are retained. Null bank fields never overwrite existing values with zero. Missing debt details are shown in Settings. Auto loans and other unsupported loan types require manual APR/payment/date input. Liability refresh errors do not block transactions or account balances.

Plaid /accounts/get returns cached balances, not guaranteed real-time. A reported balance becomes authoritative; pending local payments may not be reflected until the bank posts them. No payments are initiated by this app.

Automated tests use mocked bank responses. Compare the first real refresh against your banking app before relying on the forecast.
