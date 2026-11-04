# Asset Manager Cloud — Vercel + Supabase

Deploy-ready online version of the asset management tool.

Production URL: `https://gupta.vercel.app`

## Includes

- Next.js app for Vercel
- Supabase Auth login/signup
- Supabase Postgres tables + Row Level Security
- Admin / Normal access
- 8-digit confirmation before destructive deletes
- Account deletion clears account name from all linked records
- XLS/XLSX/CSV/JSON Moneycontrol import
- Google Drive document repository for asset reference files
- Serverless stock quote API at `/api/quote` with Twelve Data, Alpha Vantage, Polygon.io and Yahoo fallback support
- Authenticated AI Portfolio Analyst at `/api/ai-advisor` with structured reviews and custom questions
- Modules: Stocks, Mutual Funds, ULIPs, Bullion, NSEL e-Series, Fixed Income, Property, Other Assets, Loans, Borrowings, Goals, Watchlist, Alerts, Insights

## 1. Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. The first signed-up user becomes `admin`. Later users become `normal`.

## 2. Local environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL=https://gupta.vercel.app
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
GOOGLE_DRIVE_ROOT_FOLDER_ID=YOUR_SHARED_DRIVE_FOLDER_ID
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=YOUR_GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_OAUTH_CLIENT_ID=YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_GOOGLE_OAUTH_WEB_CLIENT_SECRET
GOOGLE_OAUTH_COOKIE_SECRET=LONG_RANDOM_LOCAL_SECRET
TWELVE_DATA_API_KEY=YOUR_TWELVE_DATA_API_KEY
ALPHA_VANTAGE_API_KEY=YOUR_ALPHA_VANTAGE_API_KEY
POLYGON_API_KEY=YOUR_POLYGON_API_KEY
MARKET_DATA_PROVIDERS=twelvedata,alphavantage,polygon,yahoo
GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_AI_MODEL=openai/gpt-oss-20b
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_AI_MODEL=gpt-5.5
OPENAI_AI_REASONING_EFFORT=medium
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-only. It is required for the Admin Console because Supabase Auth admin actions cannot run with the public anon key.

Google Drive OAuth is used as the document repository for normal Gmail / personal Drive accounts. Create a Google Cloud OAuth Web client and add `https://gupta.vercel.app/api/google-drive/callback` as an authorized redirect URI, then set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_COOKIE_SECRET`. Service-account Drive variables are still supported for Workspace Shared Drives, but normal My Drive uploads require the OAuth connection popup in the app.

Stock quote keys are optional server-side settings. `/api/quote` attempts configured providers in `MARKET_DATA_PROVIDERS` order and uses Yahoo as a final fallback. Twelve Data supports NSE/BSE symbols but lists those exchanges as end-of-day coverage; it should not be treated as a true live Indian equity feed. Alpha Vantage supports BSE-formatted symbols such as `RELIANCE.BSE`, but documents real-time entitlement for U.S. market data only. Polygon.io is used for supported U.S. stock exchanges. For eligible U.S. Alpha Vantage quotes, entitlement can be passed with `ALPHA_VANTAGE_ENTITLEMENT`.

The AI Portfolio Analyst is optional. Set `GROQ_API_KEY` or `OPENAI_API_KEY` only on the server or in Vercel environment settings. Groq is preferred when both are configured and defaults to `openai/gpt-oss-20b` with strict structured output; set `GROQ_AI_MODEL` to override it. OpenAI remains an optional fallback using the Responses API. The app sends a reduced portfolio snapshot containing summarized amounts and holding labels, not profile details, account names, notes or documents.

## 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Predictive Planner

Open **Planning → Predictive Planner** for wealth/retirement scenarios, goal funding,
12-month cash-flow and loan-payoff estimates, and on-demand market trend ranges.
On phones, use the **Forecast** tab. Module-level forecast buttons open the relevant
planner tab using the active household's records; existing household permissions apply.
Assumptions are editable and remain in the current session; switching households
resets the planner. Export Plan downloads assumptions and computed results as JSON.
Core forecasts run locally without AI credentials. Market trends use the existing
history routes and require an available upstream data source.

For local UI verification, `/planner-preview` uses fictional records and is available
only in development. Production returns 404 for this route.

### Overdraft home loans, cash flow and monthly uploads

Set **Repayment Structure** to *Overdraft (OD)* on a Property or Loan to enter the savings
parked in the OD account. Interest, net worth and liabilities then use the balance not
covered by those savings. Do not record the same savings under Other Assets as well.

The Dashboard and planner show **Liquidity Now** (bank savings, cash at home and parked OD
funds) and **Available Cash Flow** (salary, rent and dividends less EMIs, premiums and
investments). Add these in Fixed Income using the *Savings in Bank*, *Cash at Home* and
*Dividend Income* types. Do not record money parked in an OD account as Savings in Bank too.

**Planning → Monthly Uploads** requires a salary slip for each account with a Salary record
and a portfolio ledger for each account with stock or mutual fund holdings, from
October 2026 onward. Documents are due by the 7th of the following month. After that the
household owner is locked out until each item is uploaded or marked not available with a
reason. Change the start month or due day in `lib/monthlyUploads.ts`.

### Month on Month

**Planning → Month on Month** has two views. *Monthly items* covers stocks, funds, gold,
savings, salary, rent, dividends and loan EMIs, with a column per month. *Yearly items* covers
property, loan balances, insurance, PPF, Sukanya, FDs and other long-term deposits, with a
column per financial year. Each period opens at the previous period's close.
The current month is saved when the app is open, at most every 30 minutes, so a month's close
is the last value seen in that month. Any figure can be edited, including past months;
clearing a figure undoes the edit. A one-month edit does not change the underlying record,
so a permanent rent change belongs on the Property as well.

### Transactions

Open a stock or mutual fund and choose **Record Sale**. The oldest lots are sold first, the
holding reduces, and **Investments → Transactions** shows purchase versus selling price, gains
by financial year split into short and long term (12-month listed equity rule), and XIRR.
Undo restores the holding. It is a record of gains, not tax advice. Add sale proceeds to
Savings in Bank yourself.

### Payments This Month

The Dashboard's **Payments This Month** tab lists loan EMIs, premiums falling due this month
and payments added by hand. Marking one paid deducts it from the chosen OD account, lowering
liquidity and raising the balance that bears interest. Undo puts the money back. Salary or
rent credited to the OD account is not added automatically; update the parked amount.

### Dividends and earnings

The Dashboard's **Dividends to Confirm** tab lists dividends declared since April on shares
held on each ex-date, and asks whether each was received once its payout date arrives. Yes adds
the amount to the cash flow of the month it was received and to Month on Month, and credits that
person's own HDFC savings row, creating it if needed. Available data sources do not publish payout dates, so the date is
estimated at 30 days after the ex-date until you enter the real one from the company's notice.

**Dividend Buy Radar**, a tab on the Stocks page next to Watchlist, lists announced dividends you can still qualify for, across
holdings, the watchlist and, on request, about 50 large companies, with a marker on stock rows.
It shows the last day to buy, not a recommendation. Dividends confirmed as received stay listed
in the Dividends Earned tab after the shares are sold.

**Planning → Earnings by Person** totals what each account received in a financial year:
recorded salary, rent, confirmed dividends, accrued interest and realised gains. It projects
nothing and is a starting point for tax planning, not a tax calculation.

### Daily expenses

On a phone, the **+** button logs an expense in seconds, tagged to a credit card, Google Pay or
cash. The Dashboard's **Expenses** tab shows where the month's money went. Cards come from the
regular payment list and can also be chosen under Paid From. Spending on a card builds an estimated
next statement rather than reducing cash flow straight away.

### Automatic backups

**Utility → Automatic Backups** saves a new restorable JSON file about 10 seconds after any
data change, while the app is open, to Google Drive (`Important Documents/Backups`) and to a
chosen PC folder (Chrome and Edge only). Price refreshes alone do not trigger one. Files are
not encrypted and older ones are never deleted automatically. Restore from Settings → Backup.
Google Drive connections now survive sign-out; disconnect them in Settings.

### Full backup and restore of the whole app

The in-app backup covers your data only. This covers everything needed to rebuild the app.
Run from the project folder on your PC:

```bash
npm run backup:full
```

It asks for a passphrase, then saves to `../asset-manager-backups/full-backup-<date>/`: the
code with full history, database structure and rows, logins, stored documents, and your
settings and keys (encrypted with the passphrase). It only reads from Supabase, and checks
itself when finished. Keep the folder private: apart from the settings it is not encrypted.

To rebuild on any PC with Node.js and Git, use the tools inside the backup folder:

```bash
# Rebuild the app into a new folder
node <backup folder>/restore-tools/full-restore.mjs <backup folder> --code <new folder>

# From inside that new folder: preview loading the data, changing nothing
node <backup folder>/restore-tools/full-restore.mjs <backup folder> --data --dry-run

# From inside that new folder: load the data. You type the project name to confirm
node <backup folder>/restore-tools/full-restore.mjs <backup folder> --data
```

For a new Supabase project, first run the four files in the backup's `database/schema` folder
in the SQL editor, and put the new project's URL and keys in `.env.local`. It refuses to load
into a project that already has records unless you add `--overwrite`.

Not included: login passwords (Supabase does not export them, so use Forgot password on a new
project), files held in Google Drive (they stay in Drive), and environment settings in Vercel
beyond your `.env.local`.

## 4. Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Add environment variables in Vercel Project Settings.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`
   - `TWELVE_DATA_API_KEY` (optional stock quote provider)
   - `ALPHA_VANTAGE_API_KEY` (optional stock quote provider)
   - `POLYGON_API_KEY` (optional U.S. stock quote provider)
   - `MARKET_DATA_PROVIDERS` (optional provider order)
   - `GROQ_API_KEY` (preferred AI Portfolio Analyst provider; server-only)
   - `GROQ_AI_MODEL` (optional Groq model override)
   - `OPENAI_API_KEY` (optional AI Portfolio Analyst; server-only)
   - `OPENAI_AI_MODEL` (optional model override)
   - `OPENAI_AI_REASONING_EFFORT` (optional analysis depth)
4. Deploy.

## 5. Use

1. Sign up with your email.
2. Add accounts with relation dropdown.
3. Add or import assets.
4. For Stocks, fill ticker/exchange and click Refresh Live Prices.
5. Open Recommendations or Insights and click Generate AI Review after configuring `GROQ_API_KEY` or `OPENAI_API_KEY`.
6. Use Settings → Backup to download a JSON backup.

## Security notes

- Do not expose Supabase service-role key in the frontend.
- Do not expose Google service account credentials in the frontend.
- Do not expose `GROQ_API_KEY` or `OPENAI_API_KEY` in the frontend or name either with the `NEXT_PUBLIC_` prefix.
- Public anon key is expected in browser apps, with Supabase RLS protecting rows.
- Admin/Normal destructive access is enforced in both UI and database delete policies.
# Household / Parent-Child Access

Run `supabase/household-workspaces.sql` once in the Supabase SQL editor to
enable shared household workspaces. The migration preserves existing data,
creates one primary household per current user, and adds:

- Primary owner, editor, viewer, and custom member roles
- Per-module visibility
- Independent edit, delete, member-management, and document permissions
- Multiple household memberships under the same personal login
- Shared household document storage
