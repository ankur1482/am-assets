# What changed in Asset Manager

Newest first, written in plain English. Times are India time.

**Version numbers:** from 10 Nov 2026 every release gets a version number, starting at 10.11 and going up by one each time (10.12, 10.13 and so on). The number in use is shown under **Sign out**, both in the side panel on a computer and in the phone menu, so you can tell which release you are looking at.

**Going back to an earlier version:** each release lists a backup name. The backup is saved two ways:

- A zip of the code in `D:\asset-manager-backups\`, with the date and time in its name.
- A marker with the same name in GitHub, under Tags.

To undo a release, tell Claude "go back to backup" followed by the name. Vercel also keeps every earlier live version, which can be restored from its Deployments page in a click.

These backups cover the app itself, not your financial data. Your data is covered by the app's own Automatic Backups screen. None of the changes below alter your saved records.

---

## Version 10.26 (10 Nov 2026, 16:18): What you still owe builders, insurance as yearly on the dashboard

Backup taken before this release: `backup-2026-11-10-1618-IST`

- **Net worth counts what you still owe builders.** For a home being built, the part of the price not yet paid (**Still to pay**) now counts as owed until the home is ready. It reduces your net worth everywhere: Home, the Overall Dashboard table (a new **Still to pay builders** line), Goals and the Predictive Planner. This only applies to a home with at least one builder payment recorded (or **Paid so far from your own money** entered), so a home with nothing recorded is not shown as owing its whole price. Record its payments under **Homes being built** to include it. Once a home is marked Ready, nothing is counted as owed to the builder.
- **Insurance is yearly on the dashboard too.** The monthly cash-flow card no longer takes a twelfth of the yearly premiums from every month. **Premiums + Investments** is now **Investments** (monthly), with a separate **Insurance This Year** figure. **Available Cash Flow** now leaves insurance out, matching the Predictive Planner, which takes each premium in the month it falls due.
- **Web address.** The guide and the app's fallback settings now use the live address, `https://ankurgupta.vercel.app`, instead of the old one that no longer works.

## Version 10.25 (10 Nov 2026, 15:55): Employment drives salary, Company PF and gratuity

Backup taken before this release: `backup-2026-11-10-1555-IST`

- **A monthly question.** Each month, Home's **To do** tile asks for each salary: **Still employed — Ankur (HDFC Bank)? Yes / No**. **Yes** confirms it for the month.
- **When you answer No.** After you confirm, the app sets today as the last working day on that person's Salary, Company PF and Gratuity records, and marks them as not employed. From then on:
  - The salary stops counting as income.
  - Company PF contributions stop. Interest on the balance continues.
  - Gratuity is worked out up to that day and does not grow further.

  If a PF or gratuity record already has an earlier last working day, that earlier date is kept.
- **Planning to work until.** A Salary record now has **Currently employed?** and **Planning to work until** (for example 1 June 2030). Goals and the Planner use it:
  - **Goal projections:** Company PF contributions continue only until that date, and the balance keeps earning interest after it. Gratuity is valued at whichever comes first, that date or the goal's target date, because it grows with years of service.
  - **Planner cash flow:** the salary is paid for its last month and then stops in the 12-month forecast.
- **Applies only to the same person.** PF and gratuity follow the Salary record with the same account name, so one person leaving a job does not affect another.

## Version 10.24 (10 Nov 2026, 15:41): Investments drawer on the phone, and dividend cards

Backup taken before this release: `backup-2026-11-10-1541-IST`

- **More room on investment screens (phone).** The rows of tabs at the top of Stocks, Property, Fixed Income and the other investment screens are replaced by one slim bar: a **☰** button, the screen you are on (for example "Stocks & ETFs · Shilpi") and **Home**. The content now starts right below it.
- **Investments drawer.** Tapping **☰**, the screen name, or **Investments** in the bottom row slides in a panel from the left. It lists every investment type with its value (the ones you hold first, the rest as "None yet"), then the people and views for the current type: All, each person, and for Stocks, Watchlist, Dividends Earned and Dividend Buy Radar. Tap one to go there; tap outside or ✕ to close. Goals, Forecast and Settings keep the usual bottom row.
- **Dividends Earned on the phone.** The wide table is now one card per dividend, with the stock, person and amount at the top, and the received date, ex-date, shares × per share and where it was credited beneath. A total sits at the top. The computer keeps the table.

## Version 10.23 (10 Nov 2026, 15:16): New Home screen and a five-area menu

Backup taken before this release: `backup-2026-11-10-1516-IST`

- **Home.** The first screen is now **Home**: a set of tiles, one for each thing you usually open the app to check. Each tile shows the answer at a glance; click or tap it to open the detail.
  - **Net worth**: today's figure, today's change, and what you own and owe.
  - **Goals**: the expected value at the target dates as a share of all targets, and how many goals are on track, close or need work.
  - **This month's cash**: money ready to use (savings, cash and money parked in OD), monthly income, and what is still to pay this month.
  - **Loans**: total owed, monthly EMIs and when the next loan clears.
  - **To do**: documents to upload, payments still to make, dividends to confirm, premiums due in 30 days, fixed income values to review and goals needing work. Each opens the right place, and it says "All clear" when there is nothing.
  - **Investments** (computer): each type you hold, with its value, share and today's change.

  The earlier dashboard sections are still below the tiles, under **Details**. On the phone the tiles replace the summary block at the top.
- **Five-area menu.** The side panel and phone menu are now **Home**, **Investments**, **Plan** (Goals, Predictive Planner), **Loans** and **More** (Purchase Calculator, Automatic Backups, Settings, Admin Console). **Investments** lists only the types you hold; **Show all types** reveals the others, and **Show only what I hold** hides them again. The phone's bottom row reads **Home**, **Investments**, **Goals**, **Forecast**, **Settings**.

## Version 10.22 (10 Nov 2026, 14:59): A simpler dashboard and menu

Backup taken before this release: `backup-2026-11-10-1459-IST`

- **Dashboard.** Removed: the strip of Invested / Today's Gain / Month Start Value / Overall Gain / Current Net Worth; Monthly Portfolio Analysis; Portfolio health at a glance (return on cost, debt to assets, largest allocation, priority actions, return contributors); Data Freshness; Asset Allocation; and Risk & Performers. The rest of the dashboard is unchanged: the cash-flow figures, the Predictive Planner card, the performance chart and the Overall Dashboard table with My Networth.
- **Menu.** Removed from the side panel, the phone menu and the Menu Tabs list: All Investments and Transactions (Investments), Borrowings (Liabilities), Month on Month, Earnings by Person and Monthly Uploads (Planning), and Watchlist, Alerts and Household Access (Utility). The Predictive Planner on the phone no longer shows its Month on Month and Earnings by Person buttons.
- **Nothing is deleted.** Your records in these areas are kept and still count in every total, including any borrowings in net worth. Sales are still recorded as transactions, the Stocks page keeps its own Watchlist tab, and the "Upload now" banner still opens Monthly Uploads. Any of these can be put back. The code is kept, and this backup has the earlier version.

## Version 10.21 (10 Nov 2026, 14:34): Builder payments kept on edit, interest only on what the bank has paid, and scheme rates for planned investments

Backup taken before this release: `backup-2026-11-10-1434-IST`

- **Fixed: editing a property no longer deletes its builder payments.** Saving a property through **Manage → Edit** used to keep only the boxes on the form, so payments recorded under **Homes being built** were lost. The same happened to a goal's chosen holdings and planned investments when the goal was edited. These are now kept. Payments lost to this before today are not brought back automatically. If you need them, they are in your Automatic Backups from before the edit, or record them again.
- **Interest only on what the bank has paid out.** While a home is being built, the bank pays the builder in stages. For a property under construction, the loan's balance, interest and EMI are now worked out on the payments recorded as **from the home loan**, not the full sanctioned loan. The sanctioned loan amount still shows as entered.
- **Choice to pay only interest until possession (pre-EMI).** A property under construction with a loan has two new boxes: **Expected Possession Date**, and **Until possession, pay only the interest on the loan (pre-EMI)?** Choose Yes, and until possession the monthly payment is just the interest on what the bank has paid out. The full EMI then starts from the possession date. The **Homes being built** card shows the monthly interest and when the full EMI begins. The loan figures, the dashboard and the Predictive Planner's cash flow all use the interest-only payment.
- **Planned investments know their scheme.** **+ Plan an investment for this goal…** now lists the actual options, each with its rate: Sukanya Samriddhi (8.2%), PPF (7.1%), NSC (7.7%), Kisan Vikas Patra (7.5%), Post Office time deposit (7.5%), recurring deposit (6.7%), EPF/VPF (8.25%), bank FD, mutual fund SIP or shares, gold, silver, property, money-back insurance and other. Picking one fills in its rate, which you can change. Plans you added before this (such as "sukanya" or "ppf") are recognised from their name and now use 8.2% and 7.1% instead of 7%. A Sukanya or PPF record with no rate saved also uses its scheme's rate.

## Version 10.20 (10 Nov 2026, 14:17): Today's changes fitted to the phone

Backup taken before this release: `backup-2026-11-10-1417-IST`

- **Goals on the phone.** The Goals screen now has the same tools as the computer. At the top is a summary (all targets, today, expected by the target dates), then one card per goal, coloured green, amber or red like the computer table. Each card shows the target date, target, today, expected value and extra a month needed. Tap a card to jump to its details. Below are the home question, the funding picture, the growth rates, and for each goal the **Add what pays** and **Plan an investment** dropdowns and the projection.
- **Homes being built on the phone.** The Property screen shows the **Homes being built** section, where you can record payments to the builder.
- **Admin Console on the phone.** It now opens on the phone, with Growth Rates and Menu Tabs.
- **Fixes.** The long goal dropdowns used to push the phone screen sideways; dropdowns now fit the screen width. Text on the new cards was too pale to read and is now dark. Lists that were squeezed into two narrow columns (homes, asset types, menu tabs, Appearance Lab) are now one per line on a phone.

## Version 10.19 (10 Nov 2026, 14:01): Stage payments for homes being built, and a goals total

Backup taken before this release: `backup-2026-11-10-1401-IST`

- **Homes being built are paid in stages.** For a property marked Under Construction, the **Purchase Price** is the full price of the home. A new **Homes being built** section on the Property page lets you **Record a payment to the builder** each time one is made: the date, the amount, whether it came from your own money or the home loan, and the stage (for example "Slab 3"). The app adds them up and shows **paid so far**, **still to pay** (the price less what has been paid) and a progress bar, with a total across all homes being built. Remove a payment with ×; it asks first.
- **In the property table**, two new columns, **Paid to builder** and **Still to pay**, show the same figures for homes being built, and a dash for ready ones. A community with several units adds them up.
- **Goals use the own-money payments.** When a home being built is picked for a goal, it counts at the total of the payments made from your own money. If you have not recorded individual payments, the single **Paid so far from your own money** box on the property still works.
- **Goals table total.** A **Total** line under the goals table adds up the target amounts, today's values, what is short today, the expected value by the target dates (with the share of all targets), the expected shortfall and the extra a month needed. It also counts how many goals are on track, close or need work.

## Version 10.18 (10 Nov 2026, 13:40): A colour-coded goals table at the top, and shorter table rows

Backup taken before this release: `backup-2026-11-10-1340-IST`

- **The goals table now comes first** on the Goals page, above the funding details.
- **It shows where each goal is heading**, using the same growth rates as the goal cards:
  - **Expected by target date**: a realistic value at the target date, with the percentage of the target it reaches.
  - **Expected shortfall**: what will still be missing at the target date.
  - **Extra a month needed**: the extra monthly amount that closes it, allowing for growth (this replaces the old "monthly required", which ignored growth).
- **Colour-coded status** for each goal:
  - **On track** (green): expected to reach the target.
  - **Close** (amber): 80% to 99% of the target.
  - **Needs work** (red): under 80%.
  - Grey means no target date yet.

  Each row is tinted with a coloured stripe, and the table opens with the goals needing the most work first.
- **Interactive.** Click any column heading to sort by it, and click again to reverse. Click a goal's row to jump to its card below, where you can change what pays for it. **Manage** still opens the goal to edit it.
- **Shorter rows in every table on a computer** (Stocks, Property, Fixed Income, Loans, Goals and the rest). Amounts and words no longer break across lines (such as "₹85,00, / 000" or "Overdr / aft"), columns size themselves to their contents, and the row buttons are smaller. Rows are now about half as tall. Wide tables still scroll sideways. Phones are unchanged.

## Version 10.17 (10 Nov 2026, 13:16): Year-by-year growth, planned investments, homes being built

Backup taken before this release: `backup-2026-11-10-1316-IST`

- **Growth Rates in Admin Console.** A new section lists, for each of the last 10 years, how much shares (NIFTY 50), gold and silver went up or down that year, with this year so far and the 10-year average. Below it are the yearly rates used to project your goals, for every category: shares and funds, gold, silver, property, fixed income (used when a record has no interest rate), money-back insurance and other assets. Change any of them and it is saved to your login. Clear a box to go back to the default. The Goals page shows the same shares, gold, silver and property rates, and changing them there saves too.
- **Planned investments for a goal.** Each goal has a new **+ Plan an investment for this goal…** dropdown. Choose what it is (shares or SIP, gold, silver, property, fixed income, money-back insurance or something else), then whether it is every month or a one-off amount, and how much. It shows as a "Planned" label on the goal and is added to that goal's projection, growing at that category's rate. It does not change what the goal has today, only where it is heading. Remove one with ×.
- **Homes being built.** A property marked Under Construction now has **Paid so far from your own money**. When you pick that property for a goal, it counts at that amount, and the dropdown says "being built, paid ₹X from own money".

## Version 10.16 (10 Nov 2026, 13:00): Where each goal is heading by its target date

Backup taken before this release: `backup-2026-11-10-1300-IST`

- **Each goal shows its target date**, for example "by 01-Jan-2032 (62 months)", next to its name.
- **A projection under every goal.** It shows what the holdings you picked should be worth by the target date if they keep growing and your regular deposits carry on, and whether that reaches the target. If it falls short, it says how much more to invest each month. Each holding has its own line: value today, how fast it is assumed to grow and why, what you are adding each month, and its value at the target date.
- **How growth is worked out:**
  - Shares and funds use the NIFTY 50's average over the last 10 years, gold uses gold's 10-year average and silver uses silver's.
  - Property uses 4% a year.
  - Fixed income uses its own saved interest rate (for example PPF 7.1%, Sukanya 8.2%), and savings accounts 3%.
  - All of these are shown in a **Growth a year** row at the top, and you can type your own figures to see the difference.
  - Property loans are taken off as they stand today, which is cautious because loans shrink over time.
  - Past trends are not a guarantee.
- **Several homes.** The home question is now a tick list: **Which properties do you or your family live in, or will once built?** Tick as many as apply, including a home still being built. All of them are left out of goals and retirement. A holding picked for a goal before it was marked as a home now says so on its label, rather than "Removed holding".
- **Cash outside OD fix.** Money parked in an OD account beyond what its loan needs used to be added to **Cash outside OD accounts** on its own, which is why the box showed a figure (such as ₹1,47,500) with nothing ticked. It is now a line in the dropdown, **Spare money parked in OD**, ticked by default, and can be unticked like the rest.

## Version 10.15 (10 Nov 2026, 12:44): Property counts after its home loan

Backup taken before this release: `backup-2026-11-10-1244-IST`

- **A property picked for a goal now counts at what it is really worth to you:** its latest value less its own home loan. If part of the loan is covered by money parked in its OD account, only the uncovered part is taken off. The Goals dropdown shows the working, for example "Residential · Hyderabad — worth ₹1,70,00,000 less loan ₹60,00,000 (₹1,10,00,000)".
- **No loan counted twice.** The overall net worth on the Goals page already takes off every loan once, so a property picked for a goal sets aside only its value after its loan.
- **Easier to tell properties apart.** Each property in the dropdown now shows its location and community, not just one of them.

## Version 10.14 (10 Nov 2026, 12:36): Your home, family protection, and record dropdowns in the Planner

Backup taken before this release: `backup-2026-11-10-1236-IST`

- **The home you live in.** The Goals page now asks **Do you live in one of your properties?** Pick the one you live in (it can also be set on the property itself: **Is this the home you live in, for good?**). Only one property can be your home. Its value is then left out of your goals and out of the Predictive Planner's retirement projection, because you will not sell it. Its home loan still counts, as it has to be repaid from your other savings. The dashboard's net worth is unchanged. If the home is later let out, it stops counting as your home.
- **Two kinds of insurance.** Policies that pay money back (LIC, endowment, money back, ULIP) still count towards goals. Family protection (term plans, including those that return premiums, plus health, accident and critical illness cover) no longer counts towards goals or retirement. The Goals page instead shows how much life and health cover your family has, marked as not counted.
- **Pick records for each Cash flow box.** On the Planner's **Cash flow & loans** tab, each box now has a **Choose from your records** dropdown. Tick the savings accounts and cash for **Cash outside OD**; salary, rent and dividends for **Take-home income**; regular payments for **Living expenses**; SIPs and deposits for **Cash-funded investments**; and policies for **Insurance premiums**, which are grouped into *Pays money back* and *Family protection*. Each box adds up what is ticked. Other fixed income, such as an FD, can be ticked as cash if you would draw on it. Your ticks are saved to your login. You can still type a figure over any box.
- **Grams for gold and silver.** In the Goals dropdown, each gold and silver holding now shows its weight, for example "Gold · 20 g — Ankur", so you can see what you would be setting aside.

## Version 10.13 (10 Nov 2026, 12:12): Choose what pays for each goal; insurance as a yearly cost

Backup taken before this release: `backup-2026-11-10-1212-IST`

- **Pick what pays for a goal.** Under **What pays for each goal** on the Goals page, every goal has a dropdown listing your holdings by type: Fixed Income, Stocks, Mutual Funds, Gold & Silver, Property and the rest. Choose a whole type (for example **All Fixed Income**) or single items (one PPF, one stock). The goal's value is then worked out live from them, and its bar, shortfall and monthly amount update at once. Remove a choice with the × on its label.
- **Nothing counted twice.** Something already chosen for one goal is greyed out for the others. Goals with nothing chosen share whatever net worth is left after loans and after the chosen holdings, high priority first, then the nearest date.
- **One set of figures everywhere.** The Current Value column in the goals table and the Predictive Planner's **Goal readiness** tab now use these same live values, instead of a number typed in by hand. The **Current Value** box has been removed from the goal form for that reason.
- **Insurance is a yearly cost in the Planner.** On **Cash flow & loans**, the box is now **Insurance premiums / year**, filled in from your active policies. Each premium comes out of the forecast in the month it falls due, not as a small amount every month. A new **Insurance this year** card shows the total and when the next premium is due. **Available cash flow / month** no longer subtracts insurance.

## Version 10.12 (10 Nov 2026, 11:58): How far you are from your goals, and choose your menu tabs

Backup taken before this release: `backup-2026-11-10-1158-IST`

- **Goals now measure against everything you own.** The top of the Goals page adds up all your goal targets and compares them with your net worth as if it were cash today: Fixed Income, Stocks, Mutual Funds, Gold & Silver, Property, ULIPs, NSEL, Other Assets and Insurance value, minus all Loans, property-linked loans and Borrowings. It shows the total target, your net worth as cash, how much is still needed (or how far ahead you are) and the percentage funded. The same figures as the Overall Dashboard's My Networth line are used.
- **A picture of it.** Three bars: what you own (one colour per type), your loans, and what is left against the target, with a black line marking the target. Under them, each type shows its value and how much of the target it covers on its own.
- **Several goals.** When you have more than one, your net worth is handed out to them in order: High priority first, then the nearest target date. Each goal shows how much is covered, how much is short, and how much a month would close the gap by its date.
- **Choose which tabs appear in the menu.** Admin Console has a new **Menu Tabs** section. Untick any tab, such as Transactions or NSEL, to hide it from the menu on the computer and the phone. Hidden tabs still count in every total. Dashboard, Settings and Admin Console always stay, so you cannot lock yourself out. The choice is saved to your login, so it follows you to every device. **Show all tabs** brings everything back.
- **Simpler side panel heading.** It now reads just "Asset Manager" with the version number next to it. "Admin portfolio" and the **Active household** chooser are gone. The household you belong to is still picked automatically.

## Version 10.11 (10 Nov 2026, 11:35): Mutual fund prices refresh again

Backup taken before this release: `backup-2026-11-10-1132-IST`

- **Mutual fund NAVs were not updating.** AMFI, the official source for fund prices, added two columns ("Plan" and "Option") to its daily price file and moved it to a new web address. The app was reading the wrong column, so every fund said "NAV not available". It now finds the price column by its heading. If AMFI moves columns again, the app keeps working.
- **Today's change on holidays and weekends.** When the market is closed, for example today's Diwali Balipratipada holiday, stocks showed a change of 0 for the day. They now show the change from the last trading day, as most brokers do.
- **Stock, gold and silver prices staying the same today is expected.** NSE is closed for the holiday, so the latest price is Monday's close.
- **Version number shown.** This is the first numbered release. "Version 10.11" now appears under Sign out.

## 10 Nov 2026, 00:09: Buttons and headings no longer split words

Backup taken before this release: `backup-2026-11-10-0009-IST`

- **"Mana / ge" fixed.** When a table got tight, such as Stocks with several lots open, the **Manage** button broke its word in half, and **Show 3 lots** wrapped onto two lines. Buttons inside tables now always keep their text on one line, and the column keeps room for them.
- **Column headings** wrap between words only, so "TRANSACTION" no longer splits into "TRANSACTI / ON".
- This applies to every table in the app, not only Stocks.

## 9 Nov 2026, 21:50: Dashboard tables fit the phone

Backup taken before this release: `backup-2026-11-09-2150-IST`

- **Overall Dashboard table (phone):** it was about three screens wide, so you had to swipe sideways and the figures were cut off at the edge. Each line (Stocks, Mutual Funds, Property and so on) is now a small card: the name and its All / Add / Edit links on top, then Invested, Today's gain, Overall gain and Current value underneath, each with its label. The My Networth line works the same way.
- **All Investments Performance table (phone):** the same treatment, one card per person with Cost basis, Current value and Performance.
- **The computer view is unchanged.** Your figures are the same; only the phone layout changed.

## 9 Nov 2026, 21:35: Tappable More lists, and a solid phone header

Backup taken before this release: `backup-2026-11-09-2135-IST`

- **More ▾ lists could not always be tapped (phone).** On Stocks, opening **More ▾** in the account tabs dropped a list over the "Which stocks" row of Dividend Buy Radar. That row sat on top, so tapping Watchlist or ETFs hit the row underneath instead. An open list now sits above everything around it. This was the real cause of the red mark on GitHub from 6 Nov, so the entry below was wrong to call it a test problem.
- **The header no longer shows what's behind it.** Figures scrolling under the top header, the stuck menu row and the menu used to show faintly through them. They are now solid, in the same colours.
- **The blue + button sits lower.** It was 84 pixels up from the bottom, covering cards mid-screen. It now sits in the corner, and the end of each page has room to scroll the last card clear of it.

## 9 Nov 2026: Automatic checks fixed (the app itself didn't change)

No backup was needed, because only the automatic tests changed.

- **Checks that broke with the calendar:** from the 8th of each month, the made-up test household had overdue monthly documents, so the app locked and nearly every phone test failed. The tests now always run as if it were 5 Nov 2026, so the date no longer changes their results.
- **Indian time:** GitHub's machines run on UTC. The tests now use India time, as you do.
- **The red mark from 6 Nov:** one phone test sometimes tapped a tab just as the row was rearranging itself while loading. It now retries until the tap lands. The app behaved correctly; the test was too impatient.

## 6 Nov 2026, 19:36: Easier-to-read chart on the phone

Backup taken before this release: `backup-2026-11-06-1936-IST`

- **All Investments Performance chart:** its labels were far too small to read on a phone. The chart is now drawn at phone size, with fewer labels so they don't overlap.
- **Chart dates** now look like the rest of the app, such as 06-Nov-2026.
- **Monthly Portfolio Analysis:** its figure now lines up with the text on the phone.

## 6 Nov 2026, 19:26: Matching figures, and a steadier phone screen

Backup taken before this release: `backup-2026-11-06-1926-IST`

**Your numbers**

- **Largest asset class now shows one figure.** Three panels gave three different percentages for the same thing, because each worked it out differently. All of them now use its share of your total assets. So you may see different percentages from before in Asset Allocation and Risk & Performers. Your actual values haven't changed.
- **"Yearly Gain" is now called "Overall Gain".** It was always your gain since purchase, not this year's gain, so only the name changed.

**On the phone**

- **The header and main menu stay on screen as you scroll,** so you don't have to go back to the top of a long page.
- **Account tabs moved to the top** of each investment screen, because they decide what the whole screen shows.
- **Text no longer touches the card edge** on Forecast, Month on Month and the Dividend and Payment panels.
- **The + Add button stays on one line** on small phones.
- **Payments, Dividends and Expenses tabs** checked and tidied so labels and table headings show properly.

## 6 Nov 2026, 19:20: The same tab row on three more phone screens

Backup taken before this release: `backup-2026-11-06-1916-IST`

- **Forecast, Month on Month and Dividend Radar** now use the same single row of tabs as the rest of the phone app.
- **Shorter names on the phone** so they fit, such as "Wealth" for "Wealth & retirement". Desktop keeps the full names and its own look.

## 6 Nov 2026, earlier today: Phone tidy-up

- **One row of tabs everywhere on the phone.** The main menu, Investments menu, dashboard tabs and account tabs look alike. Anything that doesn't fit goes under **More ▾**.
- **Investments row shows only what you hold.** Empty types stay in the ☰ menu and on desktop.
- **Scrolling fixed.** A swipe starting on the market prices or an asset row used to do nothing.
- **Pinch to zoom** now works.
- **The + button** moved to the bottom left.
- **Full dashboard on the phone.** The Overall tab now includes the sections desktop has, and the phone has the same four tabs.
- **Clearer dashboard panels on the phone.** Invisible labels, broken words and tables with no headings are fixed.
