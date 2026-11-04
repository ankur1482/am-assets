import { expect, test, type Page } from '@playwright/test';
import { expectHealthy, openApp, type MockedApp } from './helpers';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 1024;

async function signedIn(page: Page) {
  const app = await openApp(page);
  await expect(page.getByText(/Overall Dashboard|Summary/i).locator('visible=true').first()).toBeVisible();
  return app;
}
const nav = (page: Page, name: string | RegExp) => page.locator('.desktop-sidebar, aside, nav').getByRole('button', { name }).first();
async function open(page: Page, app: MockedApp, name: string | RegExp) {
  await nav(page, name).click();
  await expectHealthy(page, app, String(name));
}

test.describe('logged-in app', () => {
  test('opens the dashboard without crashing', async ({ page }) => {
    const app = await signedIn(page);
    await expectHealthy(page, app, 'dashboard');
  });

  test('never contacts real services', async ({ page }) => {
    const app = await signedIn(page);
    expect(app.unexpected.filter(url => url.includes('zkjjdvkykhwkrpkyxkfj'))).toEqual([]);
  });

  test('every sidebar screen opens', async ({ page }) => {
    test.skip(isPhone(page), 'The phone layout has no sidebar');
    const app = await signedIn(page);
    for (const name of ['All Investments', 'Transactions', 'Stocks', 'Property', 'Gold/Silver', 'Fixed Income', 'Insurance', 'Mutual Funds', 'ULIPs', 'Other Assets', 'NSEL e-Series', 'Loans', 'Borrowings', 'Goals', 'Predictive Planner', 'Month on Month', 'Earnings by Person', 'Monthly Uploads', 'Watchlist', 'Purchase Calculator', 'Alerts', 'Automatic Backups', 'Household Access', 'Settings', 'Dashboard'])
      await open(page, app, new RegExp(`^(${name})`));
  });

  test('dashboard tabs show payments and dividends', async ({ page }) => {
    test.skip(isPhone(page), 'Phone reaches these through banners');
    const app = await signedIn(page);
    await page.getByRole('button', { name: /Payments This Month/ }).click();
    await expect(page.getByRole('region', { name: 'Payments due' }).getByText('Example Maintenance')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Paid from' })).toBeVisible();
    await expect(page.getByText('Automatic, no action needed')).toBeVisible();
    await expect(page.getByText('Included in the card bill')).toBeVisible();
    await page.getByRole('button', { name: /Dividends to Confirm/ }).click();
    await expect(page.getByText(/Example Paints/).first()).toBeVisible();
    await expectHealthy(page, app, 'dashboard tabs');
  });

  test('a payment can be added with the plus button, against a named purpose', async ({ page }) => {
    test.skip(isPhone(page), 'Covered on desktop');
    const app = await signedIn(page);
    await page.getByRole('button', { name: /Payments This Month/ }).click();
    await page.getByRole('button', { name: 'Add a payment' }).click();
    const form = page.locator('.pay-add-row');
    await form.getByLabel('Payment against').fill('School fees');
    await form.getByLabel('Amount (₹)').fill('12000');
    await form.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Payments due' }).getByText('School fees')).toBeVisible();
    await expect(page.getByLabel('Payment against')).toHaveCount(0);
    expect(app.writes.some(write => write.table === 'records' && JSON.stringify(write.body).includes('School fees'))).toBe(true);
    await expectHealthy(page, app, 'adding a payment');
  });

  test('stocks has dividend tabs next to watchlist, with earned dividends in a table after a sale', async ({ page }) => {
    test.skip(isPhone(page), 'Phone reaches these through banners');
    const app = await signedIn(page);
    await open(page, app, /^Stocks/);
    const tabs = page.getByRole('button', { name: /^(Watchlist|Dividends Earned|Dividend Buy Radar) \(/ });
    await expect(tabs).toHaveCount(3);
    await page.getByRole('button', { name: /^Dividends Earned \(/ }).click();
    const earned = page.getByRole('region', { name: 'Dividends earned table' });
    await expect(earned.getByRole('columnheader', { name: 'Received on' })).toBeVisible();
    await expect(earned.getByText('Sold Example')).toBeVisible();
    await expect(earned.getByRole('cell', { name: 'Sold', exact: true })).toBeVisible();
    await expect(earned.getByRole('cell', { name: '02-Jul-2026' })).toBeVisible();
    await page.getByRole('button', { name: /^Dividend Buy Radar \(/ }).click();
    await expect(page.getByText('This shows a date, not a recommendation.')).toBeVisible();
    await expect(page.getByRole('cell', { name: '11-Nov-2099' })).toBeVisible();
    await expectHealthy(page, app, 'stock tabs');
  });

  test('property form shows rent fields only when rented and built', async ({ page }) => {
    test.skip(isPhone(page), 'Covered on desktop');
    const app = await signedIn(page);
    await open(page, app, /^Property/);
    await page.getByRole('button', { name: /^Add/ }).last().click();
    const occupancy = page.locator('select[name="occupancy"]'), rent = page.locator('input[name="monthly_rent"]');
    await expect(occupancy).toBeVisible();
    await expect(rent).toHaveCount(0);
    await occupancy.selectOption('Rented');
    await expect(rent).toBeVisible();
    await page.locator('select[name="construction_status"]').selectOption('Under Construction');
    await expect(occupancy).toHaveCount(0);
    await expect(rent).toHaveCount(0);
    await expectHealthy(page, app, 'property form');
  });

  test('month on month switches between monthly and yearly items', async ({ page }) => {
    test.skip(isPhone(page), 'Covered on desktop');
    const app = await signedIn(page);
    await open(page, app, /^Month on Month/);
    await page.getByRole('button', { name: 'Yearly items' }).click();
    await expectHealthy(page, app, 'yearly items');
  });

  test('dates use dd-MMM-yyyy in tables', async ({ page }) => {
    test.skip(isPhone(page), 'Covered on desktop');
    const app = await signedIn(page);
    await open(page, app, /^Transactions/);
    await expect(page.getByRole('cell', { name: '01-Sep-2026' })).toBeVisible();
    await expect(page.getByText('2026-09-01')).toHaveCount(0);
    await expectHealthy(page, app, 'date format');
  });

  test('a card can pay a payment, and the Expenses tab opens', async ({ page }) => {
    test.skip(isPhone(page), 'Covered on desktop');
    const app = await signedIn(page);
    await page.getByRole('button', { name: /Payments This Month/ }).click();
    await page.getByRole('combobox', { name: 'Paid from for Example Maintenance' }).selectOption({ label: 'Example Card' });
    await page.getByRole('row', { name: /Example Maintenance/ }).getByRole('button', { name: 'Mark paid' }).click();
    await expect(page.getByRole('row', { name: /Example Maintenance/ }).getByText('Example Card')).toBeVisible();
    await expect(page.getByText('Estimated next card statement')).toBeVisible();
    await page.getByRole('button', { name: 'Expenses', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Estimated card statements' }).getByRole('rowheader', { name: 'Example Card' })).toBeVisible();
    await expectHealthy(page, app, 'card payment and expenses');
  });

  test('an expense can be logged in seconds on a phone, tagged to Google Pay', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    await page.getByRole('button', { name: 'Add an expense' }).click();
    const sheet = page.getByRole('dialog', { name: 'Add an expense' });
    await sheet.getByLabel('Amount (₹)').fill('450');
    await sheet.getByLabel('Spent on (optional)').fill('Groceries');
    await sheet.getByRole('button', { name: 'Google Pay' }).click();
    await sheet.getByRole('button', { name: 'Save expense' }).click();
    await expect(sheet).toHaveCount(0);
    const saved = app.writes.find(write => write.table === 'records' && write.body?.module_key === 'expense');
    expect(saved?.body?.data).toMatchObject({ amount: 450, label: 'Groceries', tag_id: 'google-pay', tag_label: 'Google Pay' });
    await page.locator('nav').getByRole('button', { name: 'Summary' }).locator('visible=true').first().click();
    await page.getByRole('button', { name: /This month's expenses/ }).click();
    await expect(page.getByRole('region', { name: 'Expenses this month' }).getByText('Groceries')).toBeVisible();
    await expectHealthy(page, app, 'quick expense');
  });

  test('phone screens open without crashing', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    const tap = (name: string) => page.locator('nav').getByRole('button', { name }).locator('visible=true').first().click();
    // Opening a section swaps the menu for that section's own, with a Back button to the main one.
    const back = page.getByRole('button', { name: 'Back to summary navigation' });
    for (const name of ['Goals', 'Forecast', 'Settings', 'Summary']) {
      await tap(name);
      await expectHealthy(page, app, `phone ${name}`);
      if (await back.isVisible()) await back.click();
    }
    await tap('Investments');
    for (const name of ['Property', 'Fixed', 'Insurance', 'Stocks']) {
      await tap(name);
      await expectHealthy(page, app, `phone ${name}`);
    }
    await page.getByRole('button', { name: /Dividends earned/ }).click();
    await expect(page.getByRole('region', { name: 'Dividends earned table' }).getByText('Sold Example')).toBeVisible();
    await expectHealthy(page, app, 'phone dividends earned');
  });
});
