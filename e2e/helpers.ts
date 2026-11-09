import { expect, type Page } from '@playwright/test';

export const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const SUPABASE = 'https://e2e-test.supabase.co';

// The day the tests run as. Every date in the data below is set relative to this day.
export const TODAY = new Date('2026-11-05T12:00:00+05:30');
const user = { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test.user@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const access = { member_role: 'owner', status: 'active', all_modules: true, modules: [], can_edit: true, can_delete: true, can_manage_members: true, can_view_documents: true, can_upload_documents: true };
const row = (id: string, module_key: string, data: Record<string, any>) => ({ id, module_key, data, user_id: USER_ID, workspace_id: WORKSPACE_ID, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });
const uuid = (n: number) => `33333333-3333-4333-8333-${String(n).padStart(12, '0')}`;

/** Fictional household covering each screen: an OD loan, rent, salary, savings, a sale, a dividend and payments. */
export function fixtureRecords() {
  return [
    row(uuid(1), 'stocks', { account_name: 'Asha', security_name: 'Example Paints', ticker_symbol: 'EXPAINT', exchange: 'NSE', asset_type: 'Stock', quantity: 10, inv_price: 100, live_price: 150, purchase_date: '2024-01-15' }),
    row(uuid(2), 'stocks', { account_name: 'Ravi', security_name: 'Sold Example', ticker_symbol: 'SOLDEX', exchange: 'NSE', asset_type: 'Stock', quantity: 0, inv_price: 50, purchase_date: '2023-01-15', sold_out: true, sold_out_on: '2026-09-01' }),
    row(uuid(3), 'watchlist', { security_name: 'Watched Example', ticker_symbol: 'WATCHEX', exchange: 'NSE', asset_type: 'Stock', current_price: 200 }),
    row(uuid(4), 'mutualFunds', { account_name: 'Asha', security_name: 'Example Fund', quantity: 100, nav: 10, live_nav: 12, purchase_date: '2024-02-01' }),
    row(uuid(5), 'property', { account_name: 'Asha', security_name: 'Residential', location: 'Testville', broker: 'Example Heights', purchase_price: 5000000, latest_value: 7000000, loan_structure: 'Overdraft (OD)', loan_institution: 'Example Bank', loan_amount: 3000000, loan_balance: 2500000, od_parked_balance: 1000000, loan_interest_rate: 8, emis_left: 120, construction_status: 'Ready', occupancy: 'Rented', monthly_rent: 40000, rentee_name: 'Test Tenant', rent_agreement_end_date: '2027-06-30' }),
    row(uuid(6), 'property', { account_name: 'Ravi', security_name: 'Residential', location: 'Testville', broker: 'Build Site', purchase_price: 4000000, latest_value: 4000000, construction_status: 'Under Construction' }),
    row(uuid(7), 'loans', { account_name: 'Ravi', security_name: 'Home', broker: 'Lender Bank', loan_amount: 1000000, loan_balance: 800000, interest_rate: 9, emi_amount: 15000, purchase_date: '2022-03-05' }),
    row(uuid(8), 'fixedIncome', { account_name: 'Asha', category: 'Salary', employee_contribution: 200000, broker: 'HDFC Bank', purchase_date: '2020-01-01' }),
    row(uuid(9), 'fixedIncome', { account_name: 'Asha', category: 'Savings in Bank', broker: 'HDFC Bank', current_value_today: 500000 }),
    row(uuid(10), 'fixedIncome', { account_name: 'Ravi', category: 'PPF', interest_rate: 7.1, yearly_investment: 150000, investment_due_month: 'April', current_value_today: 900000, purchase_date: '2015-04-10' }),
    row(uuid(11), 'insurance', { account_name: 'Asha', security_name: 'Example Term', category: 'Term Plan', broker: 'Example Insurer', status: 'Active', premium_amount: 24000, premium_frequency: 'Yearly', sum_assured: 10000000, policy_start_date: '2020-01-01', policy_end_date: '2050-01-01', premium_due_date: '2027-01-15' }),
    row(uuid(12), 'goals', { account_name: 'Asha', security_name: 'Example Goal', target_amount: 1000000, current_value: 100000, target_date: '2032-01-01' }),
    row(uuid(13), 'transactions', { status: 'posted', module_key: 'stocks', security_name: 'Sold Example', ticker_symbol: 'SOLDEX', account_name: 'Ravi', sale_date: '2026-09-01', quantity: 5, price: 80, charges: 10, proceeds: 390, cost: 250, gain: 140, short_term_gain: 0, long_term_gain: 140, unknown_term_gain: 0, lines: [{ lotId: uuid(2), quantity: 5, share: 1, cost: 250, proceeds: 390, gain: 140, term: 'long', purchaseDate: '2023-01-15', removed: { quantity: 5, investment_amount: 250, latest_value: 400 } }] }),
    row(uuid(14), 'dividendReceipt', { key: 'ravi|SOLDEX|2026-06-01', status: 'received', account_name: 'Ravi', security_name: 'Sold Example', ticker_symbol: 'SOLDEX', ex_date: '2026-06-01', payout_date: '2026-07-01', received_on: '2026-07-02', per_share: 2, quantity: 5, amount: 10, currency: 'INR', credit_name: '' }),
    row(uuid(15), 'monthlyPayment', { period: 'recurring', items: [{ id: 'r1', label: 'Example Maintenance', amount: 2500, due_day: null, via: 'Example OD', kind: 'regular' }, { id: 'r2', label: 'Example Card', amount: 0, due_day: 21, via: '', kind: 'card' }, { id: 'r3', label: 'Example Mobile', amount: 2000, due_day: 4, via: 'Card', kind: 'on_card' }, { id: 'r4', label: 'Example Transfer', amount: 250000, due_day: 4, via: 'Example OD', to: 'HDFC', kind: 'transfer' }] }),
  ];
}

export type MockedApp = { errors: string[]; writes: { method: string; table: string; body: any }[]; unexpected: string[] };

/** Signs in as a fictional user and answers every Supabase and API call inside the test. */
export async function openApp(page: Page, records = fixtureRecords()): Promise<MockedApp> {
  const app: MockedApp = { errors: [], writes: [], unexpected: [] };
  const rows = [...records];
  // A fixed day keeps date rules, such as monthly documents falling overdue after the 7th, from
  // changing what the tests see as the calendar moves on. Timers still run normally.
  await page.clock.setFixedTime(TODAY);
  // Set E2E_FONT=Verdana to approximate the wider font Linux CI falls back to.
  if (process.env.E2E_FONT) await page.addInitScript((font) => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = `*{font-family:${font} !important}`; document.head.append(s); }), process.env.E2E_FONT);
  page.on('pageerror', error => app.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /ReferenceError|TypeError|before initialization|is not a function|Minified React error/.test(message.text())) app.errors.push(message.text()); });
  // Anything reaching beyond this machine is refused and recorded, which keeps the tests self-contained.
  await page.route(/^https?:\/\/(?!localhost)/, route => { app.unexpected.push(route.request().url()); return route.abort(); });
  await page.route(`${SUPABASE}/**`, async route => {
    const request = route.request(), url = new URL(request.url()), json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (url.pathname.startsWith('/auth/v1/user')) return json(user);
    if (url.pathname.startsWith('/auth/v1/')) return json({});
    if (!url.pathname.startsWith('/rest/v1/')) return json([]);
    const table = url.pathname.replace('/rest/v1/', ''), single = (request.headers().accept || '').includes('vnd.pgrst.object');
    if (request.method() !== 'GET') {
      const body = request.postDataJSON?.() ?? null;
      app.writes.push({ method: request.method(), table, body });
      if (table === 'records') {
        const id = url.searchParams.get('id')?.replace('eq.', '');
        const existing = rows.find(item => item.id === id);
        const saved = existing ? Object.assign(existing, body) : { ...row(`44444444-4444-4444-8444-${String(rows.length).padStart(12, '0')}`, body?.module_key, body?.data), ...body };
        if (!existing) rows.push(saved);
        return json(single ? saved : [saved], existing ? 200 : 201);
      }
      return json(single ? {} : [], 200);
    }
    if (table === 'records') return json(rows);
    if (table === 'accounts') return json(['Asha', 'Ravi'].map((name, index) => ({ id: uuid(100 + index), name, relation: 'Self', type: 'Family', user_id: USER_ID, workspace_id: WORKSPACE_ID })));
    if (table === 'profiles') return json(single ? { id: USER_ID, email: user.email, full_name: 'Test User' } : []);
    if (table === 'user_roles') return json(single ? { user_id: USER_ID, access_role: 'admin' } : []);
    return json(single ? null : []);
  });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()), json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/household') {
      const workspace = { id: WORKSPACE_ID, name: 'Test Household', owner_user_id: USER_ID, access };
      return json({ workspaces: [workspace], active: workspace, members: [] });
    }
    if (url.pathname === '/api/dividends') return json({ dividends: url.searchParams.get('symbol') === 'EXPAINT' ? [{ date: '2026-05-01', amount: 6, currency: 'INR' }] : [] });
    if (url.pathname === '/api/dividend-calendar') return json(url.searchParams.get('symbol') === 'WATCHEX' ? { found: true, symbol: 'WATCHEX', price: 200, dividends: [{ exDate: '2099-11-12', announced: '2099-10-01', type: 'Interim', amount: 4 }] } : { found: false, dividends: [] });
    if (url.pathname === '/api/google-drive/status') return json({ connected: false });
    return json({});
  });
  await page.addInitScript(([id, sessionUser]) => {
    const session = { access_token: 'e2e-test-token', refresh_token: 'e2e-test-refresh', token_type: 'bearer', expires_in: 360000, expires_at: Math.floor(Date.now() / 1000) + 360000, user: sessionUser };
    localStorage.setItem('sb-e2e-test-auth-token', JSON.stringify(session));
    // Stops the first-run backup question from covering the screens under test.
    localStorage.setItem(`asset-manager-backup-prompted:${id}`, '1');
    localStorage.setItem('asset-manager-view', 'dashboard');
  }, [USER_ID, user] as const);
  await page.goto('/');
  return app;
}

/** Fails if the page crashed, showed the framework's error screen, or tried to leave this machine for real data. */
export async function expectHealthy(page: Page, app: MockedApp, where: string) {
  expect(app.errors, `Errors on ${where}`).toEqual([]);
  await expect(page.getByText(/Runtime (Reference|Type)?Error|Application error/i), `Error screen on ${where}`).toHaveCount(0);
  expect(app.unexpected.filter(url => url.includes('supabase')), `Real Supabase request on ${where}`).toEqual([]);
}
