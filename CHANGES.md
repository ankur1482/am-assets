# What changed in Asset Manager

Newest first, written in plain English. Times are India time.

**Version numbers:** from 10 Nov 2026 every release gets a version number, starting at 10.11 and going up by one each time (10.12, 10.13 and so on). The number in use is shown under **Sign out**, both in the side panel on a computer and in the phone menu, so you can tell which release you are looking at.

**Going back to an earlier version:** each release lists a backup name. The backup is saved two ways:

- A zip of the code in `D:\asset-manager-backups\`, with the date and time in its name.
- A marker with the same name in GitHub, under Tags.

To undo a release, tell Claude "go back to backup" followed by the name. Vercel also keeps every earlier live version, which can be restored from its Deployments page in a click.

These backups cover the app itself, not your financial data. Your data is covered by the app's own Automatic Backups screen. None of the changes below alter your saved records.

---

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
