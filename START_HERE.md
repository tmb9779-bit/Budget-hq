# Budget HQ 0.9.148 — Persistent sidebar Tools tabs

- The sidebar reserves visible space for Transactions, Recurring, Insights, and Reports. The primary navigation scrolls within its own area on shorter desktop windows.
- Transaction Tools returns to its previous place on the Transactions page; this update addresses the sidebar tabs.

# Budget HQ 0.9.147 — Stable header and visible transaction tools

- Connected and Refresh occupy a fixed header slot from the initial page load, avoiding movement when navigating or when connection status arrives.
- Transaction Tools appear immediately below the Transactions tabs on both All Transactions and Needs Review, rather than below a long activity list.

# Budget HQ 0.9.146 — Calendar, recovery, and review controls

- Calendar highlights the selected day and restores expandable bill options in the monthly bill list. Selected-day expense details remain read only.
- Recurring bills and Transaction Tools show their controls directly, without section dropdowns. The Not a Recurring Bill rows sit 9 pixels below their divider.
- Data & Recovery places Recently Deleted between Export Budget and System Health. Backup Now is beside View History & Restore, and System Health opens for full diagnostics.
- Confirmed bank matches leave the review list while retaining their accounting links. Denied bank transactions stay excluded from future match suggestions.

# Budget HQ 0.9.145 — Review warnings stay in Needs Review

- Transaction review warnings for Other categories, duplicates, debt payment matches, and imported history appear only in Transactions → Needs Review.
- Each warning has a dismiss button. Dismissing hides its current warning without removing records or review actions; new issues can show it again.
- Home no longer repeats these review warnings.

# Budget HQ 0.9.144 — Other transaction review

- Other transactions have their own Home Needs Attention card with Resolve and Dismiss. Resolve opens the categorization section; dismissing hides the current records until new ones appear.
- Auto-categorization points to Home when manual review remains.
- Apply to Debt uses title case and a slightly wider button.

# Budget HQ 0.9.143 — Review cleanup

- Needs Review only shows sections with items and uses action-oriented section titles.
- Bank Activity Matches is hidden when there are no suggestions, confirmed links, or dismissed matches. Confirmed links appear only when present.

# Budget HQ 0.9.142 — Needs Review cleanup

- Removed the Manage Account Balances in Settings button from Transactions → Needs Review.

# Budget HQ 0.9.141 — Compact transaction amounts

- Amount bubbles in Transactions fit their values and sit centered beneath the Amount heading.

# Budget HQ 0.9.140 — Transactions action alignment

- Apply to Debt, Edit/View, and Delete keep fixed positions across transaction rows.
- Transactions page category and disclosure chevrons are hidden; their controls still work.

# Budget HQ 0.9.139 — Transactions alignment

- Transactions now has only All Transactions and Needs Review at the top. Account and category choices remain in Filters; Balance Updates is under a new Type filter.
- Category and amount columns use consistent widths and aligned headings.

# Budget HQ 0.9.138 — Transactions cleanup

- Transactions and its filters now appear first.
- Pending bank activity appears once below the ledger; its sync details start collapsed.
- Automatic Categories and Import Review are grouped under Transaction Tools.

# Budget HQ 0.9.137 — Recently Deleted tile

- Data & Recovery now shows Recently Deleted as its own clearly labeled tile, immediately after Backups & Restore. Open it to restore deleted payments or bills within 30 days.
- Export Budget and System Health remain available below it.

# Budget HQ 0.9.136 — Seven-day Safe to Spend window

Extract this ZIP over your current Budget HQ folder and restart the server. Keep your existing private data folder.

- Safe to Spend reserves unpaid scheduled bills and debt minimums due in the next seven days by default, matching the original behavior. The window no longer changes based on the next payday, and future paychecks are not counted as cash on hand.
- Keeps the simplified Settings page, centered debt chevrons, and the other 0.9.133–0.9.135 changes.

All 477 automated checks passed. This ZIP is a local update and has not been installed on your device.

# Budget HQ 0.9.135 — Payday Safe to Spend window

Extract this ZIP over your current Budget HQ folder and restart the server. Keep your existing private data folder.


# Budget HQ 0.9.134 — Debt chevron alignment

Extract this ZIP over your current Budget HQ folder and restart the server. Keep your existing private data folder.

- Debt chevrons now use a compact 18-pixel box, center vertically on the account name, and keep their open-state rotation. Their inset position remains tuned for desktop and phone widths.

All 477 automated checks passed. This ZIP is a local update and has not been installed on your device. A live visual check was unavailable here; inspect the Debt page after installing.

# Budget HQ 0.9.133 — Safe to Spend and settings cleanup

Extract this ZIP over your current Budget HQ folder and restart the server. Keep your existing private data folder.

- Safe to Spend now reserves every unpaid scheduled bill and debt minimum through the full 60-day forecast by default, even when an obligation falls after the next paycheck. Future paychecks remain excluded from today's cash. Its Home tile and breakdown identify the 60-day window.
- Data & Recovery is simplified around budget export, backups and restore, recently deleted records, and diagnostics. The separate Backup Now, transaction export, and source archive controls are removed. Dismissed recurring items are in the Recurring tab.
- Planning Preferences, Forecast Choices, and Low-balance Alerts are removed from Settings. Weekly Check-in remains on Home, email switches use sliding dots, and Income amounts align without the “Plan uses” label.
- Debt account chevrons sit inside each account row and line up with the account text. Accounts & Connections was left unchanged.

All 477 automated checks passed. This ZIP is a local update and has not been installed on your device. A live visual check was unavailable here; inspect the updated pages after installing.

# Budget HQ 0.9.131 — Focused Plan and recovery settings

Extract this ZIP over your current Budget HQ folder and restart the server. Keep your existing private data folder.

- Home is the single Needs Attention area for incomplete bill and debt schedules, excluded income sources, review records, the weekly check-in, buffer warnings, and forecast mismatches. Plan no longer displays Forecast Checks, calculation disclosure, or a duplicate Needs Attention card.
- Income forecasts use each source’s selected estimate method. Older global Forecast Choices settings are ignored. Income source amounts align without the “Plan uses” label.
- Planning Preferences and its manual schedule checkbox are removed. Safe to Spend becomes available when account balances and schedules are complete. The Cash Buffer remains adjustable on Plan; Low-balance Alerts now has a switch in Settings → Privacy & Preferences. Weekly Check-in remains on Home.
- Data & Recovery groups backups and exports, restore and recently deleted items, and system diagnostics. Transaction CSV export is available alongside the budget export; the source archive remains under Original import & saved notes.
- Debt account chevrons are drawn inside their rows and aligned with the account names. Accounts & Connections was not changed.

All 476 automated checks passed. The ZIP is a local update; it has not been installed on your device. A live visual review was unavailable in this environment.

# Budget HQ 0.9.130 — Automatic bill protection

Extract this ZIP over your current Budget HQ folder and restart the server. Your private budget data remains in its existing data folder.

Safe to Spend automatically subtracts unpaid bills and debt minimums due through the day before the next forecast paycheck, in addition to set-aside savings and the cash buffer. It never counts a future paycheck as cash you have today. If no later paycheck is forecast, it protects scheduled bills across the 60-day forecast and labels that window clearly.

The Protect Upcoming Bills menu was removed from Forecast Choices. Older saved seven-day preferences no longer affect the calculation; saving Forecast Choices records the automatic setting. No bills are paid or money moved by this choice.

All 474 automated checks passed. Please compare the Safe to Spend breakdown with your real upcoming bills after installing; a live visual review from this environment remains unavailable.

# Budget HQ 0.9.129 — UI and workflow update

Extract this ZIP over your current Budget HQ folder and restart the server. Keep your existing private data folder.

- Record Transaction separates regular entries, transfers and debt payments. Historical entries remain an advanced option; the submit label follows the selected type.
- Calendar keeps matched past expenses visible as read-only and leaves unmatched past occurrences editable. The selected-day Add Expense action uses the main blue style.
- Plan day details are read-only. Forecast Checks shows a compact status and calculation, while Needs Attention lists review actions.
- Financial Goal creation reveals the relevant target method, previews emergency reserves, clarifies saved cash and uses specific save labels. Wish and Sinking Fund cards label their targets.
- Debt accounts can use an explicit category for grouping. Payment tabs and summary tile notes are clearer; row chevrons and group totals are aligned.
- Income sources show a compact summary with details and actions inside. Forecast Choices is separate; the income amount field has a shorter label.
- Data & Recovery shows the latest manual backup, explains exports, clarifies diagnostics and collapses an empty Recently Deleted section. Report switches use sliding dots.
- The page scrollbar space and header control width are reserved to reduce Connected badge movement between pages.

The Accounts & Connections layout was left alone. The changes remain local until you install this ZIP. All 472 automated checks passed. A visual check on your device is still needed because the isolated browser cannot connect to this local server.

# Budget HQ 0.9.128 — UI consistency pass

Extract this ZIP over your current Budget HQ folder and restart the server. Your existing private data stays in its data folder.

- Income Sources now labels the amount each source contributes to Plan, including when a source is excluded.
- Income History says “Needs history” when typical and cautious estimates cannot be calculated, instead of displaying a misleading $0.
- The Plan forecast calculation has a defined disclosure layout, clear rows and keyboard focus styling.
- Deposit review buttons identify their deposit in assistive technology.

All 467 automated checks passed. A live visual check on your device is still needed for spacing, color and responsive behavior; the isolated browser could not reach the local app.

# Budget HQ 0.9.127 — Cross-app scrub

Extract this ZIP over your current Budget HQ folder and restart the server. Your private budget and bank connection settings stay in their existing data folder.

Verified and corrected four inconsistencies:

- PWA: the app no longer unregisters its service worker during startup. The generic offline fallback can remain available after later navigations. It never stores financial pages or budget API responses.
- Offline page: Try again is a normal link, so it works under the app's Content Security Policy, which blocks inline event handlers.
- Owner sign-in: sessions are bound to the current password record. A password change invalidates old sessions, including saved sessions after restart. Normal restarts with the same password still retain sessions.
- Weekly Check-in: “Next 7 Days” uses only that week's bills even when Safe to Spend protects through payday, and the Expected Pay section shows only paychecks due in that week.

All 466 automated checks passed. An isolated HTTP run confirmed the offline assets and login gate. A live browser install/offline navigation and your real-budget figures still need checking on your device; the isolated cloud browser could not connect to this local server.

# Budget HQ 0.9.126 — Reports and Insights verification

Extract this ZIP over your current Budget HQ folder and restart the server. Your budget and bank connection settings stay in their existing storage location.

- A refund on a credit card categorized as Income no longer appears in the cash Income breakdown. The breakdown now contains the same cash deposits used by its total; card refunds still affect the card balance.
- Annual Review includes months containing only recorded debt payments, so those payments and their cash effect do not disappear from the month list.
- Verified monthly and yearly report rows against totals, including cash income, card refunds, payment-only months, transfers, corrections and linked payments. Existing heatmap and category checks remain passing.
- All 463 automated checks passed. Review one month in Reports against Transactions, particularly a month with a card refund or only a debt payment.

# Budget HQ 0.9.125 — Calendar and recurring bill verification

Extract this ZIP over your current Budget HQ folder and restart the server. Your budget and bank connection settings stay in their existing storage location.

- Calendar day actions now use only unpaid scheduled occurrences. Paid bills still count in the read-only monthly Scheduled comparison, but they no longer appear as actionable day entries that fail when tapped.
- The monthly Recurring Expenses and One-time Bills lists indicate how many occurrences are paid or partly paid. Skipped occurrences remain excluded from scheduled totals and forecasts.
- Verified that overdue reservation, marking a bill paid, skipping a later occurrence, restoring it, Safe to Spend, and Plan all agree without changing cash twice.
- All 462 automated checks passed. Check a month with a paid bill and confirm its monthly total remains while its day no longer offers another payment action.

# Budget HQ 0.9.124 — Debt and Goals verification

Extract this ZIP over your current Budget HQ folder and restart the server. Your budget and bank connection settings stay in their existing storage location.

- A savings deadline now counts only paydays actually included in Plan’s forecast. For example, Cautious forecasting withholds an income source without enough deposit history, so Goals no longer divides the target by paydays that Plan omitted. Deadlines beyond the 60-day forecast show that limit instead of a misleading amount per payday.
- Debt milestone progress remains connected to recorded debt balances and current credit limits. Verified that a recorded payment reduces cash and principal once, that a changing credit limit changes the utilization target, and that removing the payment reverses its effects.
- All 460 automated checks passed. After updating, compare a savings deadline’s forecast paydays with Plan, and compare any utilization milestone with the corresponding Debt account.

# Budget HQ 0.9.123 — Plan forecast verification

Extract this ZIP over your current Budget HQ folder and restart the server. Your budget and bank connection settings remain in their existing storage location.

- Plan → Forecast Checks now has a 60-day reconciliation. It shows current cash, money set aside, scheduled income, bills, debt minimums, and the resulting ending projected balance using the same events as the daily forecast. The cash buffer is a protected minimum, not a second deduction.
- Plan calls out unconfirmed income sources separately from confirmed sources excluded by Forecast Choices. Duplicate bank activity still appears as a review warning.
- Safe to Spend verification covers both seven-day and until-payday protection windows, including when cautious forecasting omits a paycheck. The window still does not assume future deposits have arrived.
- All 458 automated checks passed. After updating, compare Plan’s breakdown with the first and last forecast days and review excluded or unconfirmed sources.

# Budget HQ 0.9.122 — Income choices and deposit review

Extract this ZIP over your current Budget HQ folder and restart the server. Your budget and bank connection settings stay in their existing storage location.

- On Income, choose Typical deposits, Cautious deposits, Entered amount, or Hourly wage for each source. Typical and cautious use matching deposits from the last 56 days; until enough distinct dates are available, a source uses its entered fallback. Cautious forecasting can omit a source when history is thin or expected deposits are repeatedly missed.
- Income shows Entered, Typical, Cautious, and the amount actually used by Plan. History shows which deposits are used. Review any unusually high or low deposit with Use in estimate or Exclude, and restore automatic treatment at any time. This affects future estimates only.
- Forecast Choices is available on Income and Plan. It can use each source's choice, Typical, Cautious, or Entered amounts across sources. The older “Manually Entered Sources Only” preference remains available for existing budgets.
- Receiving or matching a paycheck still records cash once and advances the scheduled payday. Review Income's next payday and Plan's next paycheck after updating.
- All 455 automated checks passed.

# Budget HQ 0.9.121 — Income reliability

Extract this ZIP over your current Budget HQ folder, then restart the server. Your budget and bank connection settings remain in their existing storage location.

- Income shows the last matching deposit and flags two or more expected pay periods without a matching deposit. The warning asks you to review the schedule and bank activity; a delayed bank update may be the reason.
- Under Cautious forecasting, a formerly regular source with two missed periods is excluded from projected income until a matching deposit resumes. Expected forecasting still includes the source but shows the warning. Manual pay choices remain under your control.
- Recorded cash, saved income schedules and past transactions are not changed by this forecast decision.
- All 451 automated checks passed. Check the next paycheck date and amount on Income and Plan against your actual pay pattern after updating.

# Budget HQ 0.9.120 — Transaction reconciliation

Extract this ZIP over your current Budget HQ folder, then restart the server. Existing budget and bank connection settings remain in their storage location.

- A posted paycheck can match its scheduled occurrence near the deposit date even when the income schedule still has an older anchor date. A confirmed match advances the schedule once without adding cash a second time.
- When several employer deposits arrive in one sync, automatic matching processes them in payday order even if the bank supplied newest records first. Up to 100 deposits can be considered in one batch.
- Ambiguous employer matches and deposits far from the expected amount remain in Bank Activity Matches for review. They do not advance a schedule automatically.
- All 450 automated checks passed. This release does not auto-link personal debt payments or transfers without review; those existing review flows remain in place.

After updating, check Income for the next payday and Transactions → Bank Activity Matches for any deposit left for review. If a deposit cleared the wrong paycheck, unlink it there before changing its schedule.

# Budget HQ 0.9.119 — Plaid reliability pass

Extract this ZIP over your current Budget HQ folder, then restart the server. Your budget and private connection settings remain in their existing storage location.

- A multi-bank refresh now saves each completed bank check before starting the next bank. If a later bank stalls or the process stops, earlier check progress is durable and can be imported on the next sync.
- An incomplete transaction removal response is rejected without advancing the Plaid cursor or discarding earlier history.
- Fresh-request messages now distinguish an accepted request and the data available at the immediate check from records the bank may supply later.
- Tests cover partial multi-bank failure, incremental persistence, pending-to-posted transitions, changed and removed transactions, duplicate protection, and retry behavior. All 446 automated checks passed.

This release has not been verified against your live bank connection. On your running app, check Settings → Accounts & Connections for the last successful account check and bank transaction update time, then compare newly imported transactions and balances with your bank. A fresh request can take time to appear in Plaid.

# Budget HQ 0.9.118 — Financial consistency audit, first pass

Extract this ZIP over your current Budget HQ folder, then restart the server. Your budget and private connection settings remain in their existing storage location.

- Income history and monthly reports count Income deposits only from cash accounts. An inflow on a credit or loan account no longer inflates reported cash income or a paycheck estimate. Historical income remains in reports if a cash account is later made inactive.
- Plan's “Check Your Expected Paycheck” action now appears only when the shared forecast actually has a paycheck scheduled today. A source excluded by cautious forecasting, or anchored to a past date with its next occurrence later, no longer produces a misleading prompt.
- These changes affect calculations and page messages; no bank transaction, balance, or saved goal is rewritten by the update.
- All 443 automated checks passed. This is the first consistency pass, not a completed live Plaid reconciliation. The next roadmap phase is bank sync reliability and real-account verification.

# Budget HQ 0.9.117 — Live debt and utilization goals

Extract this ZIP over your current Budget HQ folder, then restart the server. Your existing budget and bank connection settings remain in their storage location.

- Debt milestones recalculate progress from the account balance whenever the budget changes. Reaching the target displays Reached automatically; it does not make or record a payment.
- Credit-card utilization milestones now calculate their dollar target from the current credit limit. Editing a card's limit or balance updates the goal. Existing goals named “Get to 40% utilization: Card” (or another percentage) are recognized without re-creating them.
- New or edited debt goals can set an optional Target Utilization %. The Goals card displays current utilization, credit limit, and the resulting target balance. A missing limit is clearly marked instead of claiming completion.
- Emergency-reserve targets already recalculate from essential costs; savings balances still change only when money is explicitly set aside or recorded. This release does not move money automatically or create new goals.
- All 441 automated checks passed. Live bank synchronization and iPhone installation still require verification with your running copy.

# Budget HQ 0.9.116 — Forecast clarity

Extract this ZIP over your current Budget HQ folder, then restart the server. Your budget records and private connection settings remain in their existing storage location. Keep a copy of your current folder before updating.

- Income now shows the amount the forecast actually uses for each source. It explains when your forecast setting caps or excludes an estimate and shows the next forecast date when one falls within 60 days.
- Plan calls out excluded income sources and bank transactions waiting for duplicate review. Its forecast and paycheck calculations still use the existing shared model.
- Debt account details show where the displayed balance came from and when a linked bank balance was retrieved.
- Goals now show the same planning readiness warning used on other financial pages.
- 439 automated checks passed. Real bank synchronization and iPhone Home Screen use still require verification on your own running copy.

# Budget HQ 0.9.115 — Installable PWA

Extract this ZIP over your current Budget HQ folder, then restart the server. Your budget data and private settings stay in their existing storage location.

The app includes its install manifest, icons, service worker, and an offline connection screen. It needs the Budget HQ server running to display and change financial data; the offline screen does not store budget or bank information.

- On a desktop browser, open Budget HQ through localhost and use the browser’s Install app option.
- On iPhone, open Budget HQ through a trusted HTTPS address in Safari, tap Share, then Add to Home Screen. A plain `http://` phone address on local Wi-Fi does not provide the required secure context for a service worker.
- Keep the PC server running and reachable from your phone when using the installed app. This package does not deploy a public server or create an App Store listing.

# Budget HQ 0.9.91 — Goal tile icon alignment

- Goals summary tile icons now sit to the left, matching the Home tiles. The tile order, saved goal and wish reordering, priority glow, paycheck details, and Calendar grouping from 0.9.90 remain included.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.91.

# Budget HQ 0.9.92 — Gold goal priority glow

- Goals and wishes use a soft gold priority glow to match the Next Target tile. The selected Next Target has the strongest glow.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.92.

# Budget HQ 0.9.93 — Compact Goals summary tiles

- The four Goals summary tiles are shorter, with tighter padding and smaller icons and text. Their left-side icon alignment and gold priority glow remain.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.93.

# Budget HQ 0.9.94 — First item sets target priority

- Dragging a goal or wish into the first position makes it Next Target and applies its automatic category allocation boost. Reordering other positions leaves the active priority unchanged.
- Goal and wish display order stays aligned with the saved order, including paused wishes.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.94.

# Budget HQ 0.9.102 — Next Target icon correction and dismissal reset

- Dragging goals or wishes changes only their order within their own list. It no longer changes Next Target or paycheck allocations.
- Choose allocation priority in the Next Target popup. A gold halo marks the selected target; list position does not imply priority.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.102.

# Budget HQ 0.9.90 — Goal priority, paycheck details and Calendar grouping

- Goals tiles follow Wish List Savings, Financial Goal Progress, Sinking Funds, and Next Target, sized to match Home’s summary tiles.
- Goals and wishes can be dragged into a saved order. Their soft halo reflects their order, with the selected Next Target highlighted most strongly.
- Next Target previews expected income, bills, buffer, flexible spending, and dollar and percentage allocations for each category and target. Navigate between upcoming paychecks from the popup.
- Calendar lists each recurring bill or debt schedule once per month, shows its occurrence dates and monthly total, while individual dates remain available in the calendar day details.


# Budget HQ 0.9.89 — Sinking Funds tile and paycheck projection

- Added a blue Sinking Funds tile between Next Target and Financial Goal Progress. Its pop-up shows money already set aside and projected sinking fund contributions by paycheck.
- Financial Goal Progress paycheck rows now show Paycheck, Income, and Money Allocated to Goals without the Projected Savings Goal Total column.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.89.


## Budget HQ 0.9.79 — Allocation clarity and dismissible alerts

- Next Paycheck Plan again lists Extra Debt, Sinking Funds, Goals, Wishes, and Flexible Spending separately. Amounts and percentages use optional surplus after bills and the buffer.
- Accounts & Connections puts account management beside Plaid status and actions, with both sections visible directly.
- Income settings call the history-based estimate “Predictive” and use shorter source summaries while retaining deposit history and actual-versus-predicted details.
- Data & Recovery presents backup, restore, imported data, recently deleted items, and diagnostics directly without nested recovery drop-downs.
- System Health checks forecast math, paycheck allocation, goal and wish projections, debt balances, calendar schedules, ledger availability, local backup access, bank connections, and email reports. Diagnostics are read-only.
- Monthly and Yearly Report switches live on Privacy & Preferences. Email Preferences keeps the email address, SMTP setup, and test email actions.

- Paycheck Allocation shows Bills and Buffer as percentages of expected paycheck income; the remaining category percentages continue to use optional surplus.
- Red alert and warning cards can be dismissed, including Home attention items.
- Accounts & Connections stacks the Plaid card first, followed by expandable Manage Accounts.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.79.

# Budget HQ 0.9.76 — Goal progress and paycheck categories

- Financial Goal Progress includes both savings goals and debt milestones. Debt progress follows the account balance and stays distinct from cash reserved for savings; Wish List Savings remains separate.
- Paycheck Plan shows Extra Debt, Sinking Funds, Goals, Wishes and Flexible Spending separately, with each percentage based on optional surplus after bills and the buffer.
- A debt milestone selected as Next Target directs the suggested extra debt allocation to its linked account.
- Next Target shows how allocation percentages change without embedding the next paycheck breakdown.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.76.

## Previous release notes

# Budget HQ 0.9.75 — Unified paycheck goal allocation

- Paycheck Allocation groups savings goals, wishes, sinking funds and extra debt under one visible Financial Goals section. Each destination shows its projected amount and share of that section.
- The paycheck breakdown uses one percentage base: optional surplus left after bills and the cash buffer.
- Paycheck allocation details are shown in the paycheck plan; the Goals page stays focused on goals and wishes.
- Wish List Savings now opens a paycheck projection with current savings, projected contributions and a per-paycheck breakdown. Projection respects the cash buffer, pauses and each wish’s remaining cost.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.75.

## Previous release notes

# Budget HQ 0.9.74 — Debt account edit cleanup

- Edit Debt Account no longer includes a Delete button. Delete remains available in the expanded account row.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.74.

## Previous release notes

# Budget HQ 0.9.73 — Goals, Wishes, and account forms

- Deleted financial goals stay deleted after refresh. The old automatic milestone starter no longer repopulates them; deleting a selected Next Target also clears its automatic boost.
- Goal Savings by Paycheck updates from each future paycheck's available Goals allocation. The table centers its columns, and Show All stays below the financial goal grid.
- Next Target is the single priority control for automatic Wishes, Financial Goals, and Sinking Funds. Its category receives the selected allocation boost; within that category the target gets two shares and other automatic targets get one. Custom weekly savings and pauses still override automatic shares. The pop-up previews category and target amounts for the next paycheck.
- A fully funded Wish offers Add to Expenses with a purchase date picker. Debt account Add and Edit forms use purpose-specific sections, including clear balance corrections.
- Transaction categories and other text choices sort alphabetically in drop-downs. Disclosure chevrons sit at the far right; linked debt payment copy is spaced lower.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.73.

# Budget HQ 0.9.72 — Expense categories, debt details, and editor previews

- Phone is an expense category with its own icon. Choose it in the existing Category menu; the separate bill Icon menu is removed.
- Calendar’s linked debt details use tighter spacing, and Skipped Occurrences has the same chevron spacing as other expandable bars.
- Upcoming debt payments use the account icon. Additional debt payments use the Debt Payment icon.
- Financial goal progress includes measurable progress already made toward current savings and debt targets, using the account’s starting balance where available.
- The design editor’s pop-up previews use current forms and are grouped by the page where they belong.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.72.

## Previous release notes

# Budget HQ 0.9.71 — Goal contributions match paycheck allocations

- Goal Contribution now follows the Goals share set under Paycheck Allocation for each future paycheck. It stops at the target and protects the cash buffer. The paycheck panel shows the same contribution and moves any unused Goals share to flexible spending. These are projections; no money is transferred.
- Edit Recurring Bill includes a Phone icon choice for expenses such as Mint; the choice carries to Calendar.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.71.

## Previous release notes

# Budget HQ 0.9.70 — Expense icon choice

Edit a recurring bill such as Mint and choose Phone under Icon. The chosen icon appears in expense rows and Calendar, with a matching calendar dot. The default option continues to use the category icon.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.70.

## Previous release notes

# Budget HQ 0.9.69 — Consistent goal icons

- Every financial goal card and the Goal Savings summary use the target icon.
- Delete and Remove confirmation buttons show trashcans, and Calendar dots use event icon colors.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.69.

## Previous release notes

# Budget HQ 0.9.68 — Delete icons and calendar colors

- Delete and Remove confirmation buttons in pop-ups show a trashcan beside the label.
- Calendar dots use the same foreground color as each event icon, including custom category colors. Amount bubbles retain their lighter backgrounds.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.68.

## Previous release notes

# Budget HQ 0.9.67 — Updated included design

Your latest desktop design is now the included design. It adjusts the Home action, Plan spacing, Manage Accounts amount weight, toolbar icons, a Need label, and a delete label. The same JSON is in Budget_HQ_Design.json. Existing browser-saved designs take precedence; use Edit Layout → Design Files & Reset → Load Included Design → Save My Design to apply this design in a browser with an earlier saved design.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.67.

## Previous release notes

# Budget HQ 0.9.66 — Design editor and test email

- Edit Layout restores the design editor. Saved designs in this browser remain available, and you can import or export a design.
- Email Preferences now has Send Test Email. Configure your Gmail SMTP settings first, then enter the recipient and send. The test message contains no budget data. SMTP acceptance does not guarantee inbox delivery.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.66.

## Previous release notes

# Budget HQ 0.9.65 — Accounts, income, and calendar polish

## What changed

- Current Cash Accounts shows Checking and Savings separately, with a single total available balance at the bottom. Savings has a blue icon and regular text color. Manage Accounts amounts use the same regular weight.
- Debt accounts can use any icon offered in Budget HQ, including the new phone icon; the chosen icon follows the debt into Calendar. Calendar dots and amount bubbles follow their icons’ colors.
- Goals starts with the first four saved goals visible and lets you show the rest or add more. The recommended-goals section is gone. The Goal Savings table wraps labels between words.
- Income Sources aligns the history table columns, offers Hourly or Historical Predictive estimates, and places a short “How estimates work” link beside estimated amounts. Remove has a trash icon and matching weight.
- Plaid Connections has concise instructions. Each connection has Sync Bank, Change Permissions, and Delete on one line. Sync Bank requests fresh balances and transactions. Plaid Set-up is under Advanced, with separators between actions and accounts.
- Scheduled Needs offer a confirmation when an existing purchase is near the scheduled date and amount. Confirmation clears the calendar item without another charge. Recurring suggestions can be dismissed permanently for that merchant and account.
- Closing a dialog leaves its originating dropdown open. Expandable chevrons face right when closed and turn smoothly down when opened. Settings tiles stack with each panel directly below its tile.
- System Health uses current budget, bank, and email status. Email Preferences includes private SMTP set-up; enter your own provider credentials to enable delivery. Data & Recovery keeps the running version and Sign Out below dismissed recurring charges. The design editor and Display & Editing tile are removed from the interface.

## Install

Extract this update over your current Budget HQ folder using the same Windows user and data-home setting. Existing budget records remain in their current data location. Settings should display version 0.9.65. For email reports, open Email Preferences, set up the provider connection, and enable the desired reports.

## Older release notes

# Budget HQ 0.9.60 — Move sections around, and unbold text

Design Mode (Edit Layout) can now rearrange a page instead of only nudging things on top of each other.

- Drag a section by its background or its heading and the page reorders: a blue line shows where it will land, and the other sections close up to make room. Dragging anything inside a section still moves that element freely, as before.
- With a section selected, Move & Position now shows where it sits ("Section 1 of 3"), a "Move by" box and Up/Down buttons. Set it to 2 and press Down to move it two places; the sections it passes move up to fill the gap.
- Text weight is now an ordinary control next to Text size, in words: Original, Normal (not bold), Medium, Semibold, Bold. Choosing Normal also unbolds headings, labels and amounts inside the element, which the old numeric setting did not do.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.59 — Pop-up layouts, wish saving and Record Transaction

- Current Balance pop-up: My Balance now sits below your accounts instead of above them, with the same spacing.
- Safe to Spend pop-up: one total at the bottom instead of a running balance after every line. Current Cash, Protected Buffer, Money Set Aside and Bills are listed, then the single Safe to Spend figure.
- Next Paycheck Plan now starts saving for wishes as soon as the projected balance clears your buffer. Before, a dip below the buffer before payday cancelled the whole plan, so wishes never received anything. Running out of cash entirely still stops it.
- Record Spending is now Record Transaction, and the first choice in the form is money out or money in, so deposits, refunds and other income can be recorded the same way as spending.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.58 — Received works when the deposit is already imported

If your bank had already imported the paycheck deposit, pressing Received did nothing at all: it stopped with "A possible paycheck is already imported. Review Bank Activity Matches in Transactions first." The paycheck stayed on the schedule, Next Payday did not move, and Safe to Spend did not change.

- Received now links that imported deposit to the payday it covers and clears it, instead of refusing. Next Payday moves to the following payday and Safe to Spend recalculates.
- No second deposit is created, so your balance stays as your bank reports it.
- Employer deposits that arrived while Budget HQ was closed are matched and cleared on the next daily check, as well as during a bank sync.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.57 — Received no longer changes your balance

Marking a paycheck Received used to add the deposit to your cash, which double-counted it once the same deposit arrived from your bank.

- Received now simply clears the paycheck from the schedule and moves it to the next payday. Your balance changes when the bank deposit imports, and only then.
- The dialog has a Balance choice. The default is "Already in my bank balance (or coming from the bank import)". Pick "Add this deposit to my balance" only for pay your bank will never show, such as cash or a cheque you deposit yourself.
- A deposit that names your employer on an expected payday now clears that paycheck automatically when it imports, with no review step. A deposit that does not name the employer, such as "MOBILE DEPOSIT", is still offered under Bank Activity Matches for you to confirm.
- Employer names are matched allowing for extra words, so "ALAMO DRAFTHOUSE PAYROLL" is recognised as "Alamo Drafthouse" even when the amount differs after withholding.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.56 — Instalment plans are found too

Affirm and similar buy-now-pay-later payments were never suggested as recurring bills. Two reasons, both fixed:

- Banks file them as loan payments, and anything categorised as a debt payment was skipped entirely. Instalment plans are now suggested, marked "Recorded as a loan or installment payment". Payments to an account you already track as a debt, and payments already linked to a recorded payment, are still left alone.
- Some rows carry the city and state ("AFFIRM" one time, "AFFIRM INC SAN FRANCISCO CA" the next), which split one bill into two groups. Descriptions that only add words to a shorter one from the same account are now treated as the same merchant.

Suggestions are still only suggestions: nothing is added to your budget until you review it.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.55 — Tabs by bank, not by account

The Transactions tabs now follow the bank or lender on each account instead of giving every account its own tab. Accounts that share an institution read together: student loans and a personal debt at Scott Credit Union sit under Scott Credit Union, an auto loan at Quiksilver sits under Quiksilver.

- The institution comes from each account's Institution field (Settings → Accounts → Edit). Bank-linked accounts already carry it; set it on manual accounts to group them.
- An account with no institution keeps its own tab under its own name.
- Only groups with recorded activity get a tab, so loan accounts that simply receive payments do not add empty tabs.
- Balance Updates stays its own tab, and Needs Review is unchanged.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.54 — A tab for each account

The Transactions page now has a tab per account alongside All Transactions and Needs Review, plus a Balance Updates tab.

- Each account tab shows only that account's activity, so Scott Credit Union and Capital One can be read separately.
- Balance Updates collects the balance corrections made when you confirm a balance, keeping them out of the way while you review spending.
- The tabs come from your account list, so adding or renaming an account updates them automatically, and a closed account drops out.
- Search, date and category filters still apply inside whichever tab you are on, and the tab row scrolls sideways on a phone.
- Balance corrections now have their own mark in the list instead of the Other icon.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.53 — Every type has its own icon

Two types were borrowing artwork from elsewhere in the app. Transfer used the same card-and-check mark as Debt payment, and Donations used the plain heart that marks wish-list savings.

- Transfer now has its own icon: two arrows pointing opposite ways, for money moving between your accounts.
- Donations now uses the giving-hand-and-heart icon that already existed in the app.

Every type except Other is now drawn with its own icon, and a new automated check fails if any two types ever share one again.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.52 — Pets and vet bills are one type

Pet spending now uses a single type, Pets, covering vet visits, food, supplies, grooming and boarding. Vet is no longer separate.

Existing records move over automatically when you start this version: anything filed as Vet or Vet Bills becomes Pets, and the colour keeps the vet colour unless you had already chosen one for Pets. Bank imports send vet clinics, animal hospitals, PetSmart, Petco, Chewy, groomers and kennels to Pets, while doctors and dentists stay under Medical.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.51 — One list of transaction types

Transactions and bills used to use two different lists of types that did not line up. Bills could only use 11 types, so an insurance bill was quietly filed as a utility, and Pets, Education, Services, Donations, Bank fees and Taxes could not be budgeted at all. There is now one shared list of 23 types used everywhere: transactions, bills, planned expenses, calendar colours, icons and reports.

- Food is now split into Groceries and Dining out, including for bank imports: restaurants, coffee and delivery are separated from supermarkets.
- Every spending type can be used for a bill or planned expense, and each has its own colour and icon. Expense Type Colors now lists all 21 spending types.
- Income and Transfer stay transaction-only, since they are not spending.

Your saved records move over automatically the first time you start this version. Old names become their current ones (Utility to Utilities, Car to Transportation, Vet Bills to Vet, Government & taxes to Taxes), existing Food transactions are split into Groceries or Dining out based on where the money went, and any colours you chose follow their type. Nothing is deleted and no amounts change.

Also fixed: on the Transactions page the row buttons were breaking one letter per line, which made every row very tall.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.50 — Better recurring bill detection

Suggested Recurring Bills (on the Calendar and Transactions pages) now finds bills it used to miss:

- Two subscriptions from one company, such as two Apple charges on the same day.
- Bills whose bank description includes changing reference numbers, dates or a location.
- A bill charged a few days late one month, or skipped for a month.
- A new subscription charged twice so far at the same price (marked "Seen twice").
- Yearly memberships with two renewals on record, and quarterly bills seen twice.
- A bill whose charge this month is running up to about a week late.
- Rent or other fixed payments made by bank transfer, such as Zelle, with a reminder to confirm it is a bill.

It also stops flagging regular shopping trips as weekly bills. Suggestions remain suggestions: nothing is added until you review it, and bills you already track, debt payments and transfers between your own accounts are never suggested. Suggestions you dismissed before stay dismissed.

To install: extract over your current folder while Budget HQ is running; open pages update by themselves.

# Budget HQ 0.9.49 — Your budget on your phone, anywhere

Budget HQ now works on your phone at home and away, using Tailscale: a free app that creates a private, encrypted connection between your own devices. Budget HQ is never put on the public internet.

## One-time setup (about 10 minutes)

1. Install Tailscale on this PC and on your phone from https://tailscale.com/download. Sign in to both with the same account.
2. In the Tailscale admin page, https://login.tailscale.com/admin/dns, turn on MagicDNS and HTTPS Certificates (both are on by default for new accounts).
3. With Budget HQ running, double-click SETUP_PHONE_ACCESS.cmd. It shows your phone address, which looks like https://your-pc.your-network.ts.net.
4. On your phone, open that address and sign in with your Budget HQ password. Then add it to your home screen: Safari: Share → Add to Home Screen; Chrome: ⋮ → Add to Home screen.

## Good to know

- This PC must be on, awake and running Budget HQ. Consider setting Windows sleep to "Never" while plugged in.
- Only devices signed in to your own Tailscale account can reach Budget HQ, and your password is still required. Other people on your Tailscale network are refused, and Tailscale's public sharing feature (Funnel) is always refused.
- Live updates work on the phone too: changes made on the PC appear on the phone within seconds.
- To turn phone access off, double-click TURN_OFF_PHONE_ACCESS.cmd. It stops working within a few seconds, even on a phone that is already signed in.
- The layout editor (Edit Layout) remains a PC tool and is hidden on phone screens.

To install this version: extract it over your current folder while Budget HQ is running (0.9.48 or later). It restarts and your pages update by themselves.

# Budget HQ 0.9.48 — Live updates

Updates now appear by themselves. Leave Budget HQ running, extract a new version into the same folder (choose Replace when Windows asks), and open pages catch up within a second or two:

- Style changes appear instantly, without reloading the page.
- App changes reload the page on the screen you were on. If a window or form is open, the page waits and shows "Update ready"; it loads when you close the window, so nothing you are typing is lost.
- Server changes restart the server automatically. The page reconnects and you stay signed in.
- Budget changes made in another tab, or by a bank sync, show up right away instead of within a minute.

If an update is extracted only partly, the server may stop briefly; it starts again as soon as the rest of the files arrive. The console window shows what happened.

To install this version (one time only, because it includes the new launcher): stop the old server, extract this update, and start Budget HQ with START_BUDGET_HQ.cmd. Refresh the browser with Ctrl+Shift+R. From then on, updates apply live. Existing budget data is stored separately; do not delete or reset it.

# Budget HQ 0.9.47 — Cleaner app code (no visible changes)

This update reorganizes app.js without changing what you see or how anything works. Earlier releases added features by wrapping existing functions again and again; some functions had been replaced up to 19 times, and 43 of those replaced versions could never run. They are removed, each screen and button handler is now defined once, and app.js is about 20% smaller.

Every function, button action and page was compared before and after the change using both a small budget and the full sample budget: 17,473 of 17,662 checks produced identical results, and the other 189 were direct calls to seven unused helpers that were removed. All automated tests pass, including a new check that keeps functions from being re-wrapped in future updates.

Stop the old server, extract this update, and start Budget HQ. Refresh the browser with Ctrl+Shift+R. Existing budget data is stored separately; do not delete or reset it.

# Budget HQ 0.9.46 — Reliability and speed fixes

Fixed text containing accented letters or emoji occasionally saving as garbled characters in larger changes.

All date decisions — today, paydays, due dates and the 6 AM bank sync — now use one time zone. It stays America/Chicago unless you set BUDGET_HQ_TIMEZONE to another zone name, such as America/New_York.

Saving is faster and the budget file is much smaller. Undo still reverses the latest change; older history entries keep their name and date but no longer store a full copy of the budget. On first start, your existing file is slimmed automatically.

Automatic daily backups are now pruned: the last 14 days plus one per month for a year are kept, along with the last 10 safety copies made before a restore. Backups you create yourself are never deleted.

The app checks a small revision stamp each minute and downloads the budget only when it changed. Budget totals, the calendar and bank imports calculate faster with large transaction histories, with identical results. App files are reused by the browser until an update changes them.

Bank notifications are answered immediately even while a sync runs, unsigned traffic can no longer crowd them out, and failed updates stop retrying after about a day. Bank Connections shows the reason if one stopped.

Stop the old server, extract this update, and start Budget HQ. Refresh the browser with Ctrl+Shift+R. Existing budget data is stored separately; do not delete or reset it.

# Budget HQ 0.9.45 — Apply transactions to personal debt

Transactions now offers Apply to Personal Debt on eligible posted cash outflows, including imported Venmo history. Choose your debt, principal amount, and scheduled occurrence or extra payment. Cash is not deducted again. Use Already Included if the debt balance already reflects that payment. Older payments before the debt starting balance must use this history-only option. Matching an existing payment preserves its principal and schedule instead of recording it twice.

Pending, transfer, excluded and already-linked records cannot be applied. Venmo payments are never assumed to be debt automatically. View linked payments in Debt; deleting the payment link preserves the transaction and restores its previous category.

Stop the old server, extract this update, and start Budget HQ. Refresh the browser with Ctrl+Shift+R. Existing budget data is stored separately; do not delete or reset it.

# Budget HQ 0.9.44 — Simpler planning and scheduled debt

Removed the Overdue Bills card from Calendar, Forecast Options and Bills Included in Forecast panels from Plan, and Wish Protection controls and automatic buffer-based wish pauses. Existing bill schedules still feed the forecast automatically; individually paused wishes remain paused.

Recurring suggestions disappear when none remain to review. Dismissed recurring suggestions can be restored from Settings → Data & Recovery. Debt account forms exclude cash and include Personal debt separately from Loan. Scheduled payment history now shows upcoming debt payments from the same 60-day schedule as Calendar and Plan, separately from recorded payments.

Goal Savings and financial goal cards now use forecast surplus above the buffer, without requiring a Goals allocation percentage, capped by each paycheck and outstanding targets. Starter Emergency reserve, Travel fund, and Home down payment cards appear automatically; set their targets before they enter your savings plan. Includes the 0.9.43 Home dialog refinements.

Car Repairs is a personal budget record, not bundled sample data. Open Debt → Car Repairs → Delete to remove it locally. If existing activity blocks deletion, preserve those records and review the message before moving or removing history.

Stop the old server, extract this update, and start Budget HQ. Refresh the browser with Ctrl+Shift+R. Existing budget data is stored separately; do not delete or reset it.

# Budget HQ 0.9.43 — Home pop-up refinements

Current Cash Accounts again shows the last seven transactions. Safe to Spend uses its full-size icon without the arrow and shows a running balance after each deduction. Removed the redundant shortfall message. Next Paycheck Plan and forms use tighter spacing; Financial Goals use the same priority dots as Wishes and Needs.

Stop the old server, extract this update, and start Budget HQ. Refresh the browser with Ctrl+Shift+R. Existing budget data is stored separately; do not delete or reset it.

# Budget HQ 0.9.42 — Resolve bank account conflicts

Sync Available Data, then open Resolve Account Conflicts on Home or Bank Connections. For Regular Share, select the correct saved account if offered, or choose A separate account. The selected account is reconciled to its bank balance and included in cash immediately. Sync again to import any newly linked transaction history. Existing history is preserved and no new Plaid connection is created.

Stop the old server before starting this version and refresh the browser with Ctrl+Shift+R.

# Budget HQ 0.9.41 — Fix blank Home on startup

Fixed an undeclared Goal Savings function that stopped the browser module before Home loaded. Added a native module startup regression test. Includes all 0.9.40 features.

Stop the old server, extract this update, and start Budget HQ. Refresh the browser with Ctrl+Shift+R. Existing budget data is stored separately; do not delete or reset it.

# Budget HQ 0.9.40 — Fresh balances and clear Plan deductions

Goal Savings by Paycheck now projects contributions from the 60-day forecast, respects the Goals share, protects the buffer across remaining days, and reserves earlier projected contributions before later ones.

Plan now shows all included bill occurrences, restores the bill list in each paycheck period, and shows starting cash + income − bills = ending cash when inspecting a forecast day. Regression checks cover multiple paychecks, bills, and debt payments on the same day. Schedule warnings also appear in Plan.

Request Fresh Bank Data now requests fresh transactions and fresh balances on existing bank connections. The returned balances flow into My Balance and Safe to Spend through the existing cash calculations, without subtracting pending charges twice. Balance status and errors appear separately from transaction refresh status. Unavailable fresh balance requests fall back to available Plaid data with a visible warning.

Balance and Transactions Refresh are included in Plaid’s free Trial. This update does not change your plan, create bank connections, or enroll you in paid services. Budget HQ cannot verify your billing plan; paid-plan terms apply if you upgrade through Plaid. Ordinary Sync Available Data and scheduled background syncs do not request fresh Balance data.

Stop the old Budget HQ server and start this version. Click Connected, then Request Fresh Bank Data beside Scott. Check Fresh bank balance request for the result.

# Budget HQ 0.9.39 — Request fresh bank transactions

Request Fresh Bank Data calls Plaid Transactions Refresh, then retrieves and imports the latest data. Ordinary Refresh / Sync Available Data does not request that paid add-on. Existing connections are reused. Background syncs continue retrieving available data without on-demand requests. Per-bank status shows fresh-request success or failure separately from ordinary sync success.

Plaid Transactions Refresh is an optional, separately billed add-on requiring access. Capital One credit-card-only connections do not support it and fall back to available data. Balances may still be cached, and pending details depend on bank support. No new connections or paid plan subscriptions are created by this update.

Stop the old server before starting this version. Use Request Fresh Bank Data only when you want the optional Plaid service. Check Scott’s Fresh bank transaction request status afterward.

# Budget HQ 0.9.38 — Clear bank refresh status

Refresh now shows progress and failures on the page. Pending Sync Status separates the latest refresh attempt from the last successful account check. Failed checks preserve existing pending records.

Stop the old Budget HQ server before starting this version, then refresh your bank connection.

# Budget HQ 0.9.37 — Spending account choices

Record Spending now limits Paid From to cash accounts and credit cards. Loans remain available as debts to pay. Added explanations for transfers and historical entries.

# Budget HQ 0.9.36 — Compact Wish priority choices

Add a Wish now uses small priority radio buttons like Need, keeping High, Normal, and Low priorities. Field spacing and expandable sections are tighter. Existing wish priorities are preserved.

# Budget HQ 0.9.35 — Home cash pop-up and realistic paycheck allocations

Home → My Balance / Current Cash Accounts now shows one total and one row per cash-account record. Removed the repeated account breakdown and pending/recent transaction lists from this pop-up. View Transactions opens activity and pending details. Each account row uses the same adjusted cash amount as My Balance, so the rows add up to the displayed total. Edit and Manage Accounts remain available.

This removes duplicate presentation of an account such as Extreme Checking. It does not delete or merge saved accounts, balances or transaction history. Distinct account records with the same name remain distinct.

Next Paycheck Plan assigns $0 (0%) to Goals, Sinking Funds and Wishes when there are no active unfinished targets. Manually paused targets and debt-milestone goals do not receive savings allocations. Extra Debt is $0 if no active debt has a balance. Unused shares go to Flexible Spending; saved allocation percentages remain unchanged. Buffer protection still holds eligible wish allocations when cash is below the buffer.

Stop the server, replace the app folder, restart using the same user/data-home setting, and refresh the browser. All prior fixes and pending diagnostics are retained.

---

# Budget HQ 0.9.34 — keep the forecast in Plan

Removed the added 60-day forecast summary and daily projected-balance section from Calendar. Calendar retains its monthly totals, bill dates and normal day details. Plan retains the 60-day forecast using the same recurring bill and debt schedules.

Monthly bills repeat on their scheduled day throughout the forecast window; paid, skipped and cancelled occurrences are excluded from upcoming cash deductions. Overdue reserves still appear in Plan's daily details when enabled. The calculation uses saved bill amounts, due dates and recurrence settings. If a bill lacks a valid schedule, use Edit Schedule in Schedules Needing Attention.

Stop the server, replace the app folder, restart with the same user/data-home setting and refresh the browser. All earlier fixes, including Scott Credit Union pending diagnostics, are retained.

---

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

---

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

---

# Budget HQ 0.9.31 — debt inputs in recurring charges

Calendar → Recurring & Planned Bills now includes active debts with a positive balance, linked directly to their account's payment amount, due date and frequency. Debt schedule edits and bank-provided minimum payment updates are reflected automatically. No separate bill copy is created, so existing calendar and Safe to Spend calculations continue to count each debt schedule once.

Use Edit Debt Schedule on a linked row to change the payment amount, date or recurrence. Missing payment amounts/dates show setup prompts. Fully paid or inactive debts are hidden. A debt set to One-time appears under One-time Bills. The entered payment is the scheduled/minimum payment, not the entire debt balance. This schedules budget entries only; it does not send money to lenders.

Stop the server, replace the app folder with this version, restart under the same user/data-home setting and refresh the browser. Existing debt inputs appear automatically. Includes all prior updates.

---

# Budget HQ 0.9.30 — My Balance includes pending charges

My Balance now uses bank available balances for checking/savings when provided, capped at posted cash so extra available credit or pending deposits do not inflate the total. Pending charges are not subtracted again from a bank available balance. When available balance is missing, the app estimates posted cash minus reported pending outflows. Estimates depend on the bank's pending data and balance conventions.

Tap My Balance for posted cash, the pending/hold adjustment, each account's calculation method, and pending charges. Safe to Spend and cash forecasts use the same adjusted cash amount. Credit-card purchases remain on the card and do not reduce checking cash until a payment occurs. Ledger balances and reconciliation remain posted, and pending transactions do not become booked spending.

Install: stop the server, replace the application folder, restart under the same user/data-home setting, then refresh the browser and bank connection. Bank data may be cached; pending amounts can change. All previous updates are included.

---

# Budget HQ 0.9.29 — Need categories, icons, and suggested financial goals

Needs now have a Bill Category dropdown in the Plan a Need / scheduling dialog. Choose a category or leave Automatic selected for the existing description-based rules. Your choice is saved with the Need and carried into its one-time bill when scheduled. Existing scheduled bills can be recategorized with Edit Expense.

Nine transaction categories now have dedicated icons: Pets (paw), Personal care (mirror/comb), Services (wrench), Education (graduation cap), Insurance (shield/check), Bank fees (bank/minus), Government & taxes (government building/document), Donations (hand/heart), and Home improvement (house/hammer). Icons use the app's existing SVG style and category color palette.

New Financial Goals offer ten starting ideas: emergency fund, credit card payoff, loan payoff, car repair fund, vet emergency fund, education, travel, moving, home down payment, and annual bills reserve. Select an idea, then choose your own amount, date or debt account. Nothing is created until you save. Existing goal edits keep their current values.

Stop the server, replace the app folder with this extracted version, restart under the same user/data-home setting, and refresh your browser. All previous fixes are included.

---

# Budget HQ 0.9.28 — restore schedule review

Fixes the missing Planning Preferences control after the Settings redesign. The Review Planning button in the setup banner now opens the correct dialog directly. The same control is available at Settings → Privacy & Preferences → Planning Preferences → Review Planning.

After checking your recurring bills, debt due dates and expected paycheck schedules, tick “I Have Checked My Recurring Bills, Debt Due Dates, and Expected Paycheck Schedules” and Save. This marks the schedule reviewed, not a paycheck received. Safe to Spend appears when cash accounts exist, balances are confirmed, and required debt due dates are complete. The app does not automatically confirm these for you.

Install: stop the server, replace the app folder with this extracted version, and restart START_BUDGET_HQ.cmd using the same user/data-home setting. Refresh the browser. All prior income, categorization and credit utilization updates are included.

---

# Budget HQ 0.9.27 — income suggestions with gaps

Fixes income patterns such as August 27, September 3, and September 17: a seven-day gap followed by a fourteen-day gap can now produce a tentative weekly suggestion. Regular biweekly history remains biweekly. Suggestions with gaps explicitly ask you to confirm frequency and next payday. No missing deposits are created and no future income schedule is saved without review.

Stop the server, replace the app folder with this extracted version, and restart START_BUDGET_HQ.cmd under the same user/data-home setting. Refresh the browser, then open Settings → Income → Suggested Paychecks & Income. If your transactions are already Income, you do not need to recategorize them. Review Alamo and confirm your actual pay frequency, expected amount and next payday.

Includes previous categorization and credit utilization fixes. Tested with the reported dates and simulated transactions; the user's complete bank history was not available.

---

# Budget HQ 0.9.26 — Alamo Drafthouse income

Incoming Alamo Drafthouse deposits now count as income, including Alamo Draft House spelling and bank descriptions with payroll suffixes. Explicit refunds, reversals, reimbursements and peer-to-peer transfers are excluded from this employer rule. Outgoing purchases retain spending categories.

Stop the server, replace the app folder with this extracted version and restart under the same user/data-home setting. Open Transactions → Auto-categorize Other to repair old automatic Alamo categories too. Manual category choices and linked records remain protected. Then open Settings → Income → Suggested Paychecks & Income. Three regularly spaced deposits in one cash account are required before a suggestion appears; review it to set the next payday and expected amount. If history is insufficient, add the income schedule manually. Existing Alamo income schedules suppress duplicate suggestions.

Includes credit utilization bars and prior category fixes. No live bank records were available for verification; tests use simulated deposits. If a deposit description omits Alamo Drafthouse entirely, provide its description (without account details) so its payroll alias can be added accurately.

---

# Budget HQ 0.9.25 — credit utilization bars

Credit cards show current balance / credit limit again. The bar changes from green (below 10%) to yellow (10–29.9%), orange (30–49.9%), and red (50%+). These are display bands. Over-limit values retain the actual percentage, with the bar capped at full width. Missing credit limits show an instruction instead of a misleading percentage. Loans still show payoff progress.

Stop the server, replace the application folder with this extracted version, and restart START_BUDGET_HQ.cmd under the same user and data-home setting. Refresh the browser. Includes the 0.9.24 categorization fixes.

---

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

---

# Budget HQ 0.9.23 — bank activity matching

1. Stop the old server with Ctrl+C.
2. Extract this ZIP into a new folder. Do not merge it with the old folder.
3. Run START_BUDGET_HQ.cmd or npm start.
4. Open http://localhost:4173 and use your existing app password.
5. Press Ctrl+Shift+R once.

Uses the clean budget introduced in 0.9.18 (existing entries are preserved). On its first launch it contains no accounts, bills, income, needs, wishes, goals, payments, transactions or bank connections. The cash buffer starts at zero until you set it in Plan. No spreadsheet snapshot is loaded. The bundled old financial snapshot has been removed.

Your approved design and sign-in are retained. Browser-saved design edits still take precedence. Older budget folders on your computer are not erased, but this version does not load them. New entries in this clean budget persist across restarts.

The popup flash fix is included. Reset Design restores the included approved design.

Live bank connection: Settings → Accounts & Connections → Plaid Connection. Enter Production credentials only in the local app. Connecting or refreshing now creates and updates supported USD accounts using Plaid current balances. Transactions now import as history without affecting snapshot balances again. Supported APRs, minimum payments and due dates populate existing debt accounts. Google OAuth credentials are not Plaid credentials.

## Suggested Recurring Bills
Open Calendar → Suggested Recurring Bills after importing transaction history. Transactions also links there when suggestions are available.

- At least three regularly spaced posted charges for the same merchant and account are required. Matching is conservative; changing merchant descriptions may need a manually added bill.
- Review shows the supporting charges. Confirm or edit the name, latest-charge estimate, frequency and next due date, then Save. Amounts can vary; provider dates should be checked.
- Saving creates a future recurring bill, never another historical charge or cash deduction. Existing same-name recurring bills and scheduled debts are excluded; accepted suggestion identities prevent repeated acceptance.
- Use Not a Recurring Bill to dismiss a pattern. Dismissed Suggestions offers Restore.
- Pending charges, transfers, debt payments, corrections, suspected duplicates and unaccepted imported history are excluded. Older inactive patterns are withheld. This is not a guarantee that every subscription is found.
- The new Review Suggested Bill pop-up is included in Edit Layout.

This update preserves the existing budget, bank connections and design. No reset or new Plaid setup is required. It uses the history already available in the app; limited history may produce no suggestions. All 269 automated tests passed using sample/mocked data. Live bank behavior and visual browser rendering were not verified here.

## Suggested Paychecks & Income
Open Settings → Income → Suggested Paychecks & Income. Transactions links there when suggestions are available. The new Review Suggested Income pop-up is also available in Edit Layout.

- Uses at least three regularly spaced posted deposits categorized as Income, from the same source and cash account. Categorize genuine income in Transactions first. Different descriptions, limited history, irregular pay and unsupported schedules may require manual entry.
- Review supporting deposits, then confirm employer/source, expected take-home pay, frequency and next payday. The suggested amount is the median of matching deposits; variable pay shows its range. Bank posting dates can differ from scheduled paydays, especially around holidays.
- Saving adds one forecast schedule, not cash or duplicate historical transactions. Existing source names and accepted source identities prevent repeated suggestions. Verify the schedule before relying on forecast income.
- Known transfers, refunds, corrections, pending deposits and suspected duplicates are excluded. Classification is imperfect: confirm that a suggestion represents genuine income rather than a transfer or reimbursement.
- Not Regular Income dismisses a suggestion; Dismissed Income Suggestions lets you restore it. Bill and income dismissals are separate.

The update preserves the current budget, bank connection and supplied design. All 276 automated tests passed with sample/mocked data. Live bank behavior and visual browser rendering remain unverified here.

## Bank Activity Matches
Open Transactions → Bank Activity Matches after refreshing Plaid.

- Paycheck: review imported deposit versus expected pay, then confirm. Advances the source schedule and records expected versus actual without adding cash again.
- Bill: review imported charge versus scheduled bill. Completes only that occurrence; never inserts another expense.
- Transfer: review both accounts and confirm equal opposite entries. Categorizes both as Transfer, excluding them from income/spending totals.
- Card/loan payment: links the cash outflow and debt-account inflow. Counts the cash-side payment once without reducing principal again. Optionally choose a matching scheduled debt payment to complete; otherwise the schedule remains unchanged. This does not create an additional manually recorded payment.
- Ambiguous candidates require your selection. Amount/date proximity is not proof. Unaccepted imported history still uses the existing Imported History review.
- Confirmed Matches offers Unlink. Unlink later paycheck matches first if undoing earlier paychecks. Dismissed matches can be restored.
- If a bank removes or modifies a matched record, it is flagged for review; the schedule is not silently rewritten. Unlink and review the affected schedule. Removed bank records are excluded from reports.
- Review pop-ups are registered in Edit Layout, individually scoped by match type.

Settings → Accounts & Connections now shows each bank's app check time, bank transaction update time, available balance timestamps, product errors and consent notices. Reconnect remains next to the affected bank. Unknown timestamps are not presented as fresh.

Your 6 a.m. daily refresh and top-right manual refresh continue to work while the server is running. Optional bank-update notifications are prepared but OFF until hosting is configured; see PLAID_NOTIFICATIONS.md. No public hosting or bank setup was changed remotely.

Validation: the full existing suite plus targeted matching, webhook, freshness and UI checks passed using mocked/sample data. No live bank writes or calls were used. Real bank data and browser rendering still require verification on your computer.
# Budget HQ 0.9.103 — Accounts & Connections layout

- Accounts is back at the top of Settings, with Add Account at the bottom of its dropdown.
- Plaid Connection is an icon-led dropdown beneath Accounts. Connect a Bank now opens the Plaid sign-in page when its session is created; the buttons sit side by side with a small gap.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.103.
# Budget HQ 0.9.104 — Plaid icon restored

- Restored the original blue wallet-and-chain icon for Plaid Connection, keeping the Accounts-first order and Plaid dropdown from 0.9.103.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.104.
# Budget HQ 0.9.105 — Tighter Settings spacing

- Reduced the vertical gaps between the Settings tabs, Manage Accounts, and Plaid Connection.
- Kept the original blue wallet-and-chain Plaid icon and the updated Accounts & Connections layout.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.105.

# Budget HQ 0.9.106 — Plaid dropdown cleanup

- Removed the repeated “Complete sign-in with Plaid, then check the connection here” text from pending sessions. The sign-in and check buttons remain available.
- Widened Add Account and matched its button styling to Connect a Bank.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.106.

# Budget HQ 0.9.107 — Compact Accounts & Connections

- Add Account now spans nearly the full width of its tile, using the Connect a Bank button styling.
- Tightened the spacing between the Settings tab bar and account dropdowns, and between Manage Accounts and Plaid Connection.
- Only the newest pending Plaid sign-in row appears, preventing old duplicate sessions from filling the dropdown.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.107.

# Budget HQ 0.9.108 — Plaid sign-in cleanup

- Removed the visible Open Plaid Sign-In link. Connect a Bank opens Plaid directly; when a session is pending, Check Connection remains for the newest session.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.108.

# Budget HQ 0.9.109 — Consistent Settings card spacing

- Standardized the spacing between cards throughout Settings to 18px, including recovery cards and Income Sources / Suggested Paychecks.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.109.

# Budget HQ 0.9.110 — Plaid action button sizing

- Check Connection now matches the width, padding, and height of Edit Plaid Set-up.
- Dismissed Plaid warnings stay hidden across refreshes; changed warning text appears as a new warning.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.110.

# Budget HQ 0.9.111 — Simpler Income and balanced dropdown highlights

- Reorganized Income Sources into compact rows with History, Edit, Received, and Remove actions.
- Replaced nested estimate and history dropdowns with Hourly / Predictive choices and one combined history view.
- Moved dismissed paycheck suggestions into a separate view and removed the nested deposit disclosure.
- Centered dropdown hover highlights so they extend equally to the left and right of each row.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.111.

# Budget HQ 0.9.112 — Income row actions

- Moved each income source’s History, Edit, Received, and Remove buttons to the right side of its row.
- Styled Remove like the other compact remove actions in the app.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.112.

# Budget HQ 0.9.113 — Plaid refresh warnings

- Bank refresh warnings now appear inside the Plaid Connection tile in Settings instead of as page-wide alerts.
- The Plaid tile opens when a new refresh warning needs attention. Dismissal persists until the warning clears or changes.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.113.

# Budget HQ 0.9.114 — Plaid notices stay on the Plaid tile

- Moved the fresh-sync “may take a couple of minutes” progress warning into the Plaid Connection tile.
- Plaid connection, finish, and refresh errors now use the tile’s dismissible warning style. Account-level fresh transaction and balance errors appear there too.
- Clearing a refresh warning after a successful sync allows it to appear again if the same issue returns.

Install by extracting this update over your current Budget HQ folder. Settings should display version 0.9.114.
