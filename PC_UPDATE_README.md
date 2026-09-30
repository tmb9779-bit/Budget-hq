# Budget HQ 0.9.18 — Design Mode

The editor starts at the bottom. Drag its header to move it, or use Top / Bottom. It floats over the app and does not constrain pop-up width or height. Minimize / Expand leaves more room for the canvas. Scroll the page to reach elements near the bottom. Click editable text and use Edit Text to change labels and descriptions; calculated amount fields are not relabeled.

Open **Edit Layout** at the bottom left. Your current design remains the default.

## Simplified Editor and Pop-up Isolation
Click an element directly, then use Appearance, Move & Position, or Icon. More Properties retains the detailed controls. Whole-app styles and page layout are collapsed and are available only while editing the page.

Opening any pop-up locks the page behind it and limits element selection to that pop-up. Its element changes are stored under that dialog, not the page. Close the pop-up to return to page editing. In Design Mode, clicking any app element selects it instead of running its action. Open pop-ups only from the editor’s pop-up menu, and change pages from its page menu. Normal interactions return when the editor closes. Clicks inside the iPhone preview select the corresponding element too. Existing global styles still apply, but global editing controls are hidden while working on a pop-up.

## Dropdowns
Select a content section/container and open Dropdown. Collapsible Dropdown wraps its contents under an editable heading. Always Show Contents removes the added wrapper or keeps an existing disclosure expanded with its heading visible. Original Layout restores its original behavior. Contents and their actions are retained. Native form choice lists are not removed. Use Open Sections / Close Sections to preview without leaving selection mode. Converting a complex grid to a dropdown can change its inner flow; review the result before saving.

## X / Y Movement
Pick an element, then use Position · X / Y. X/Y now display coordinates from one shared top-left origin: the page canvas, or the current pop-up. Enter coordinates, or use the arrows for 1px nudges (Shift for 10px). Reset Position restores that state’s original placement. Changes preview live and support Undo, Save and Export. This is visual positioning, not flow reordering: neighboring elements keep their space, and large offsets can overlap or clip. Check desktop and phone layouts. Inline text becomes an inline block when explicitly moved.

## Color Presets
Every editor color control now has a Palette button. Choose the approved icon/text colors, soft background tints, or neutrals. Custom Color offers a native color picker and a six-digit hex field. Choosing a color enables that override, previews it immediately, and participates in Undo and Save My Design. The existing app palette is unchanged until you choose a customization.

## Work on a page or pop-up
1. Under Pages, Pop-ups & Menus, choose a page or one of the 22 available pop-up previews. Edit previews use the first existing record when one is available; they do not create records.
2. Use the pop-up selector for the registered previews; app buttons select their design instead of opening dialogs. Expand Page Menus opens the current page and dialog's expandable sections.
3. Click the specific text, icon, button, field, card or section you want to change. Its normal click action will not run during selection. Select Container moves outward to its container.
4. Customize its normal, hover, selected/expanded, focus or disabled appearance. Preview This State shows it without triggering the action.
5. Enable only the properties you want: colors, gradient, corners, padding, borders, shadow, typography, alignment, width, height, gap and vertical spacing. Changing Gap works on existing flex/grid containers.
6. Change the selected element's icon using the approved icon list, with individual size and color. The separate Icons section changes all occurrences of an icon type.

Display text changes are labels only, not edits to financial data. Do not replace calculated amounts or account names with static labels. Use the normal app outside Design Mode for budget edits.

Global styles still edit whole groups. Supported section controls retain reorder, visibility, label and minimum-height editing. Undo, Redo, Reset Element and Reset Design let you compare or recover changes.

## Save and share
Save My Design stores the design in this browser at this address. Close discards unsaved edits. Export Design downloads Budget_HQ_Design.json; send that file back to incorporate your chosen design into the next app version. Import previews a design before you save it. Prior version-1 design files still work.

Design files contain appearance settings and any text labels you entered, not the budget database. Designs are separate from financial backups: export a copy before clearing browser data. Specific element references follow the page's structure; dynamic lists or future UI changes may require remapping. This is an app-specific editor, not an arbitrary HTML or workflow builder. Native browser select menus cannot be fully restyled.

## iPhone 17 preview
Use iPhone 17 Preview for a simulated 402 × 874 CSS-pixel screen with a phone frame, Dynamic Island representation and home indicator. The portrait content viewport is 402 × 790 after illustrative top/bottom insets. Rotate swaps the screen to 874 × 402. It scales to fit your desktop without changing the layout viewport.

Changes update live. The page and a pop-up chosen from the preview list follow your desktop selection. Scroll and open menus inside the phone independently. Open pop-ups from the editor menu; app buttons in the phone select their corresponding desktop element. The frame approximates a standalone app; it does not emulate Safari, its changing browser bars, iOS fonts, keyboard or safe-area behavior. Verify final results on your actual iPhone.

Screen reference: https://www.apple.com/iphone-17/specs/ (1206 × 2622 physical pixels; preview uses 3× scaling).

## Preview safety
While Design Mode is open, form submissions and app API writes are blocked on the desktop and inside the phone preview. Close the editor to record real changes. Preview field values are not saved. Budget calculations, storage, and bank-import behavior are unchanged.

## Dynamic Financial Goals
- Emergency Reserve: select 1–24 months, calculated from recurring essential bill categories and debt schedules, or enter monthly costs yourself. The estimate excludes unrecorded costs. Target and savings projections update with your budget.
- Debt Milestone: link a debt account and choose a target balance. Progress follows recorded payments and corrections. It reserves no cash, creates no payments, and receives no duplicate savings allocation.
- Savings Deadline: choose amount/date, see remaining cost divided among scheduled payday dates, and compare with the planned savings pace. Skipped paydays are excluded. On-track is a projection, not a promise.
- Existing goals remain; edit them to choose a type. Existing saved amounts are protected once. Goal suggestions never move money automatically.
- Move any saved amount out before converting a savings goal into a debt milestone; the app blocks accidental loss of that reserve.

## Latest Changes
- Safe-to-spend warning appears only for a confirmed forecast low point below the cash buffer.
- Empty Needs Attention uses a dotted Nothing here box.
- Calendar groups recurring and one-time bills separately.
- Current Buffer in Plan opens the buffer editor.
- Global Plaid status matches Settings; imports remain paused.
- Sinking Fund editor no longer offers photos.

## Tools and Colors
Transactions, Insights, and Reports now use the reference-inspired comparison cards, spending bars, trend charts, category icons, and coordinated dialogs. Colors are slightly richer, retaining the approved palette. The desktop layout, budget calculations, and local storage are preserved. Notes and History remain excluded.


## Settings
- Tab labels are black.
- Planning Preferences and Weekly Check-In shortcuts have been removed from Settings.
- Click an expanded Settings tile again to close it. Browser Back and refresh preserve the selected section.
- Accounts & Income includes a Plaid Connection section for private setup, sign-in, status checks, reconnecting, and disconnecting.
- Paused Wishes has been replaced by Recently Deleted under Safety & Data. Paused wishes remain on Goals.

## Recently Deleted
Deleted recorded debt payments, deleted paid-bill transactions, and bills are recoverable for 30 days in Settings. Skipped or removed scheduled occurrences are restored in Calendar → Skipped Occurrences, with the same 30-day recovery window. The expiry date is shown for each entry. Cleanup runs hourly while the server is running and on startup. Undated deleted records from earlier versions receive a full 30-day window on first use of this update.

Restoring a payment reapplies its original debt and cash effects exactly once. Recovery refuses incompatible later edits, balance corrections, missing accounts, transactions that were rematched, and amounts exceeding the remaining debt. Restoring a bill restores its recurring schedule. Restore a deleted source bill before restoring one of its occurrences.

Expired or permanently deleted occurrences remain cancelled and do not reappear on Calendar or in forecasts. Recently Deleted does not erase older full backups or downloaded exports; these may still contain old records. No saved backups are deleted by this update.

## Plaid Connection
Bank imports remain paused. These controls manage access only; connecting, checking, or disconnecting a bank never changes the budget ledger. Existing spreadsheet connections are not automatically brought over.

- Green check: **Connected**, successfully checked within 24 hours.
- Amber alert: **Stale**, last successful check at least 24 hours ago.
- Orange alert: **Old**, last successful check at least 7 days ago.
- Gray alert: **Not Connected**.
- Red alert: **Connection Issue**.

These labels describe the last connection check, not freshness of balances or bank transactions. A recorded connection error takes precedence over its previous successful check.

To set up later: open Settings → Accounts & Connections → Plaid Connection → Set Up Plaid. Enter your Plaid developer Client ID and secret privately in the app. They are stored encrypted outside the website files and are not included in budget exports. Sample mode permits only Sandbox; personal-budget mode (node server/server.mjs without --sample) also offers Production for an eligible Plaid developer account.

Click Connect a Bank, then Open Plaid Sign-In. Finish on Plaid’s secure page and return to click Check Connection. Reconnect follows the same process. No bank password is entered into Budget HQ. Connections can be checked or disconnected individually.

The implementation uses [Plaid Hosted Link](https://plaid.com/docs/link/hosted-link/) and [update mode](https://plaid.com/docs/link/update-mode/). Bank access and credentials must be verified on your own computer. Automated tests use mocked bank responses.

## Expense Forms
Add Expense and Edit Expense no longer ask for Expense Type. Recurrence determines whether an expense is one-time or recurring; Category remains available.

## Wishes and Cash Buffer
When Current Balance is below the cash buffer, wish savings suggestions automatically pause. Their next-paycheck share stays in the buffer. Saved wish money remains reserved, and manually paused wishes stay paused. Automatic pauses lift when Current Balance reaches the buffer again.

## Bill List
Recurring & Planned Bills is sorted by frequency: weekly, biweekly, monthly, quarterly, yearly, then one-time expenses. Entries with the same frequency keep their existing order.

## Home Details
- Current Balance shows cash accounts followed by the latest seven recorded cash-account transactions, with category icons. Direct cash-funded debt payments appear once; matched payments use their linked transaction. Add Account is available in Settings rather than this popup.
- Safe to Spend shows Wishes, Financial Goals, and Sinking Funds as simple totals inside Money Set Aside. Money Set Aside and Bills remain collapsible, with chevrons that rotate when opened or closed.
- Every Next 7 Days entry has a red trashcan. Deleting an expected paycheck or scheduled debt payment removes only that dated occurrence; later dates, debt balances, and recorded deposits stay intact. Bill deletion retains its existing one-time or recurring-series confirmation. Restore deleted occurrences within 30 days in Calendar → Skipped Occurrences.
- Weekly Check-In's Confirm Balances list uses the same compact account icons and colored amounts as the rest of the app.
- Plan a Need has tighter spacing and a two-column name/cost row on desktop. Priority, suggested dates, custom dates, and validation remain available. Small screens and zoomed views can still scroll rather than cutting off controls.
- Needs Attention stays on Home when empty, with an All Caught Up message.
- Protect Your Buffer opens the short five-day forecast around the projected low point, with the cash-buffer line, marked low point, dates, and amounts.
- Skipped Occurrences appears only in Calendar; the duplicate list has been removed from Settings.

## Refresh
The top-right refresh icon is smaller and matches the regular navigation icon color.

## Summary Tiles
Home, Calendar, Plan, Debt, and Goals now share a 120 px minimum tile height, padding, icon sizing, and text scale on desktop. Each page retains its existing number of columns; longer content can expand without clipping.

## Install
Stop the old server, extract into a new folder, run START_BUDGET_HQ.cmd, and press Ctrl+Shift+R. Your password is reused. Updates retain the clean budget introduced in 0.9.18 and do not load earlier pre-reset budget folders.

## Verification
All 222 automated tests passed. JavaScript syntax checks passed. Browser interaction testing was attempted but the browser executable is unavailable; visual, drag-and-drop and end-to-end editor behavior remain unverified. No live bank calls were made.


## Moving elements and editing delete dialogs (0.9.18)

- Drag any page or pop-up element. Icons can be dragged independently from their colored badge or tile. Use **Select Icon Only** in Icon controls if needed.
- Blue guides snap edges and centers within 6 pixels. Hold **Alt** while dragging to bypass snapping. **Undo** reverses a move; **Escape** cancels a drag.
- Selection outlines hug text and icons. Use **Select Container**, then drag its small move handle, to move a whole group.
- Drag the edit bar by its header, or use **Top** / **Bottom**. Pop-ups use their regular viewport size, independent of the edit bar.
- Choose delete/remove confirmations from **Open a Page or Pop-up**. They use the real dialog layout with safe example records; destructive actions are blocked in Design Mode. Each record type has its own editable design.
- Click **Save My Design** to keep changes in this browser, and **Export Design** to send the design back. Desktop and phone designs remain separate.
- Moving an element changes its visual position, not its budget data or calculation. Check nearby content after moving items; snapping aligns elements but does not prevent overlap.

## Separate transaction and paycheck confirmation edits
Delete Received Paycheck now has its own design settings, separate from Delete Transaction. Previously shared edits remain on Delete Transaction. Reapply any intended paycheck-specific changes to Delete Received Paycheck, then Save My Design. Other design edits remain intact.

## Icon center snapping
Drag an icon near the center of its badge. Within 8 pixels, horizontal and vertical center guides take priority over nearby elements. Hold Alt to bypass snapping.

Your supplied Budget_HQ_Design.json is included and is the default in a new browser. Existing browser-saved edits take precedence. To apply the supplied copy, choose Design Files & Reset → Load Included Design, then Save My Design. The original JSON is also included for safekeeping.

Phone editor: larger device preview with a full-height right-side editor. Desktop: supplied design is included, with the Delete Wish trash icon centered. The supplied export is retained as Budget_HQ_Design.json in the desktop package.

## Remove design elements
Select a button, icon, text element, or section and choose **Remove Element**. Save My Design keeps it removed and Export Design includes removals. Use Undo immediately, or open **Removed Elements** in the editor to Restore later, even after reloading. This hides UI elements without deleting records or changing calculations. Removing a form field or action can make that workflow unavailable until you restore it. The page and popup roots and editor itself cannot be removed.
