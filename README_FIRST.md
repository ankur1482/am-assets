# Asset Manager Cloud — Vercel + Supabase

Deploy-ready online version of the asset management tool.

Production URL: `https://am-assets.vercel.app`

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
NEXT_PUBLIC_APP_URL=https://am-assets.vercel.app
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
UPSTOX_REDIRECT_URI=https://am-assets.vercel.app/api/upstox/callback
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-only. It is required for the Admin Console because Supabase Auth admin actions cannot run with the public anon key.

Google Drive OAuth is used as the document repository for normal Gmail / personal Drive accounts. Create a Google Cloud OAuth Web client and add `https://am-assets.vercel.app/api/google-drive/callback` as an authorized redirect URI, then set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_COOKIE_SECRET`. Service-account Drive variables are still supported for Workspace Shared Drives, but normal My Drive uploads require the OAuth connection popup in the app.

Stock quote keys are optional server-side settings. `/api/quote` attempts configured providers in `MARKET_DATA_PROVIDERS` order and uses Yahoo as a final fallback. Twelve Data supports NSE/BSE symbols but lists those exchanges as end-of-day coverage; it should not be treated as a true live Indian equity feed. Alpha Vantage supports BSE-formatted symbols such as `RELIANCE.BSE`, but documents real-time entitlement for U.S. market data only. Polygon.io is used for supported U.S. stock exchanges. For eligible U.S. Alpha Vantage quotes, entitlement can be passed with `ALPHA_VANTAGE_ENTITLEMENT`.

The AI Portfolio Analyst is optional. Set `GROQ_API_KEY` or `OPENAI_API_KEY` only on the server or in Vercel environment settings. Groq is preferred when both are configured and defaults to `openai/gpt-oss-20b` with strict structured output; set `GROQ_AI_MODEL` to override it. OpenAI remains an optional fallback using the Responses API. The app sends a reduced portfolio snapshot containing summarized amounts and holding labels, not profile details, account names, notes or documents.

## 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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
