import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { expectHealthy, openApp, type MockedApp } from './helpers';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 1024;

async function signedIn(page: Page) {
  const app = await openApp(page);
  await expect(page.getByText(/Overall Dashboard|Summary/i).locator('visible=true').first()).toBeVisible();
  return app;
}
// Taps a tab in a phone row, opening that row's More list if the tab is in there.
// The row can re-sort while a screen is still loading, as tab counts fill in, so a tab may move into
// More between looking and tapping. Keep trying until the tap lands.
async function tapTab(scope: Page | Locator, name: string | RegExp) {
  const tab = scope.getByRole('button', { name, exact: typeof name === 'string' }).first();
  const more = scope.getByRole('button', { name: 'More ▾' }).first();
  await expect(async () => {
    if (!(await tab.isVisible()) && (await more.getAttribute('aria-expanded', { timeout: 1000 })) !== 'true') await more.click({ timeout: 2000 });
    await tab.click({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
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
    const app = await signedIn(page);
    await page.getByRole('button', { name: /Payments This Month/ }).click();
    await expect(page.getByRole('region', { name: 'Payments due' }).getByText('Example Maintenance')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Paid from' })).toBeVisible();
    // The phone layout keeps a hidden copy of the desktop panels in the page, so look only at what is on show.
    await expect(page.getByText('Automatic, no action needed').locator('visible=true')).toBeVisible();
    await expect(page.getByText('Included in the card bill').locator('visible=true')).toBeVisible();
    await page.getByRole('button', { name: /Dividends to Confirm/ }).click();
    await expect(page.getByText(/Example Paints/).locator('visible=true').first()).toBeVisible();
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
    test.skip(isPhone(page), 'Phone has its own tab row, tested below');
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
    await page.getByRole('button', { name: 'Expenses', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Expenses this month' }).getByText('Groceries')).toBeVisible();
    await expectHealthy(page, app, 'quick expense');
  });

  test('phone screens open without crashing', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    const tap = (name: string) => tapTab(page.getByRole('navigation', { name: 'Mobile section navigation' }), new RegExp(name));
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
    await tapTab(page.getByRole('group', { name: 'Accounts' }), /^Dividends Earned \(/);
    await expect(page.getByRole('region', { name: 'Dividends earned table' }).getByText('Sold Example')).toBeVisible();
    await expectHealthy(page, app, 'phone dividends earned');
  });

  test('the phone dashboard has the same tabs as desktop, all in view', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    for (const name of [/^Overall Dashboard$/, /^Payments This Month/, /^Dividends to Confirm/, /^Expenses$/]) {
      const tab = page.getByRole('button', { name });
      await expect(tab).toBeInViewport({ ratio: 1 });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(tab).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await expectHealthy(page, app, 'phone dashboard tabs');
  });

  test('the phone overall dashboard has the desktop sections, none cut off', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    for (const text of ['Month Start Value', 'Monthly Portfolio Analysis']) {
      const section = page.getByText(text, { exact: true }).locator('visible=true');
      // The screen is rebuilt once as the app starts, so retry until it has settled.
      await expect(async () => {
        await section.scrollIntoViewIfNeeded({ timeout: 3000 });
        await expect(section).toBeInViewport({ timeout: 2000 });
      }).toPass({ timeout: 20000 });
    }
    // .phone-content clips sideways, so anything wider must scroll inside its own box.
    const cutOff = await page.evaluate(() => [...document.querySelectorAll('.phone-content *')].filter((el) => {
      const box = el.getBoundingClientRect();
      if (!box.width || box.right <= innerWidth + 1) return false;
      for (let p = el.parentElement; p && !p.classList.contains('phone-content'); p = p.parentElement)
        if (['auto', 'scroll'].includes(getComputedStyle(p).overflowX)) return false;
      return true;
    }).map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`));
    expect(cutOff).toEqual([]);
    const problems = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.phone-overall-sections *')];
      const named = (el: Element) => (el.textContent || '').trim().slice(0, 30);
      return {
        // Near-white text left over from the dark card styling, unreadable on these white panels.
        faint: all.filter((el) => el.children.length === 0 && el.textContent?.trim() && getComputedStyle(el).color === 'rgb(244, 247, 242)').map(named),
        // A money figure cut short by an ellipsis.
        clipped: all.filter((el) => getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1).map(named),
        // Amounts must keep their column headings.
        headless: [...document.querySelectorAll('.phone-overall-sections table')].filter((t) => { const head = t.querySelector('thead'); return head && !head.getBoundingClientRect().height; }).map(named),
      };
    });
    expect(problems).toEqual({ faint: [], clipped: [], headless: [] });
    await expectHealthy(page, app, 'phone overall sections');
  });

  test('stocks shows its dividend tabs on a phone, however the screen was reached', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('.mobile-menu-panel').getByRole('button', { name: 'Stocks' }).click();
    const accounts = page.getByRole('group', { name: 'Accounts' });
    await tapTab(accounts, /^Dividend Buy Radar \(/);
    await expect(page.getByText('This shows a date, not a recommendation.')).toBeVisible();
    // The chosen tab moves into the row, so it stays on show.
    await expect(accounts.getByRole('button', { name: /^Dividend Buy Radar \(/ })).toHaveClass(/active/);
    await expect(accounts.getByRole('button', { name: /^Dividend Buy Radar \(/ })).toBeInViewport({ ratio: 1 });
    await tapTab(accounts, /^Dividends Earned \(/);
    await expect(page.getByRole('region', { name: 'Dividends earned table' }).getByText('Sold Example')).toBeVisible();

    // A dividend tab belongs to Stocks, so it must not empty another screen.
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('.mobile-menu-panel').getByRole('button', { name: 'Property' }).click();
    await expect(page.getByText('Consolidated Holdings')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveClass(/active/);
    await expectHealthy(page, app, 'phone dividend tabs');
  });

  // Real touch gestures: a swipe or pinch has to work wherever the finger happens to land.
  const touchTargets = ['.phone-hero', '.phone-market-strip', '.phone-row-main', '.mobile-top-nav', '.phone-overall-sections table'];
  async function touchPoint(page: Page, selector: string) {
    // The screen is rebuilt once as the app starts, so keep looking until the target is there.
    const find = () => page.evaluate((css) => {
      const el = [...document.querySelectorAll(css)].find((x) => x.getBoundingClientRect().height > 0);
      if (!el) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const box = el.getBoundingClientRect();
      return { x: Math.round(box.x + Math.min(box.width / 2, 150)), y: Math.round(box.y + box.height / 2) };
    }, selector);
    await expect.poll(find, { message: `${selector} is on screen` }).not.toBeNull();
    // The screen is rebuilt as the app starts, so wait for a second without anything being replaced.
    await page.evaluate(() => new Promise<void>((resolve) => {
      let timer = setTimeout(resolve, 1000);
      new MutationObserver((records) => {
        if (records.some((r) => [...r.removedNodes].some((n) => n.nodeType === 1))) { clearTimeout(timer); timer = setTimeout(resolve, 1000); }
      }).observe(document.body, { childList: true, subtree: true });
    }));
    await expect.poll(find).not.toBeNull();
    return (await find())!;
  }

  // Raw touch events, because Chromium's synthesized scroll and pinch commands do nothing here, even on a blank page.
  async function swipeUp(cdp: CDPSession, page: Page, { x, y }: { x: number; y: number }) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 20 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
  }
  async function pinch(cdp: CDPSession, page: Page, { x, y }: { x: number; y: number }, from: number, to: number) {
    const fingers = (gap: number) => [{ x: x - gap, y, id: 0 }, { x: x + gap, y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(from) });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(from + ((to - from) * i) / 12) });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
  }

  test('a phone swipe scrolls the page wherever the finger lands', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page), cdp = await page.context().newCDPSession(page), stuck: string[] = [];
    for (const selector of touchTargets) {
      const point = await touchPoint(page, selector), before = await page.evaluate(() => scrollY);
      await swipeUp(cdp, page, point);
      if ((await page.evaluate(() => scrollY)) <= before + 50) stuck.push(selector);
    }
    expect(stuck).toEqual([]);
    await expectHealthy(page, app, 'phone swipe');
  });

  test('market prices and wide tables still swipe sideways on a phone', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page), cdp = await page.context().newCDPSession(page), stuck: string[] = [];
    for (const selector of ['.phone-market-strip', '.phone-overall-sections .overflow-auto:has(table)']) {
      const { y } = await touchPoint(page, selector);
      const scrolled = () => page.evaluate((css) => Math.max(...[...document.querySelectorAll(css)].map((el) => el.scrollLeft)), selector);
      const before = await scrolled();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 350, y }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 350 - i * 22, y }] });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(300);
      if ((await scrolled()) < before + 50) stuck.push(selector);
    }
    expect(stuck).toEqual([]);
    await expectHealthy(page, app, 'phone sideways swipe');
  });

  test('the phone screen can be pinched to zoom in and back out', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page), cdp = await page.context().newCDPSession(page), stuck: string[] = [];
    const scale = () => page.evaluate(() => visualViewport!.scale);
    for (const selector of touchTargets) {
      const point = await touchPoint(page, selector);
      await pinch(cdp, page, point, 30, 120);
      if ((await scale()) < 1.5) stuck.push(selector + ' in');
      await pinch(cdp, page, { x: 180, y: 400 }, 150, 20);
      await pinch(cdp, page, { x: 180, y: 400 }, 150, 20);
      if ((await scale()) > 1.05) stuck.push(selector + ' out');
    }
    expect(stuck).toEqual([]);
    await expectHealthy(page, app, 'phone pinch');
  });

  test('the phone main menu sits on one line, even on a small phone', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page), strip = page.getByRole('navigation', { name: 'Mobile section navigation' });
    for (const width of [320, 360, 412, 480]) {
      await page.setViewportSize({ width, height: 800 });
      const tops = new Set<number>();
      for (const name of ['Summary', 'Investments', 'Goals', 'Forecast', 'Settings']) {
        const button = strip.getByRole('button', { name });
        await expect(button).toBeInViewport({ ratio: 1 });
        tops.add(Math.round((await button.boundingBox())!.y));
        expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth), `${name} fits at ${width}px`).toBe(true);
      }
      expect(tops.size, `one line at ${width}px`).toBe(1);
    }
    await expectHealthy(page, app, 'phone menu line');
  });

  test('every row of phone tabs is a single line, at any phone width', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page), strip = page.getByRole('navigation', { name: 'Mobile section navigation' });
    const onOneLine = async (row: Locator, where: string) => {
      const tops = await row.evaluate((el) => [...el.querySelectorAll(':scope > button, :scope > .one-row-more > button')].map((b) => Math.round(b.getBoundingClientRect().top)));
      // A second line would be a whole button lower; allow for sub-pixel rounding.
      expect(Math.max(...tops) - Math.min(...tops), `${where}: ${tops}`).toBeLessThanOrEqual(2);
      const box = (await row.boundingBox())!;
      expect(box.x + box.width, `${where} fits the screen`).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${where} has nothing hidden sideways`).toBe(true);
    };
    for (const width of [320, 360, 412, 480]) {
      await page.setViewportSize({ width, height: 800 });
      await onOneLine(strip, `main menu at ${width}`);
      await onOneLine(page.getByRole('group', { name: 'Dashboard sections' }), `dashboard tabs at ${width}`);
      await strip.getByRole('button', { name: 'Investments' }).click();
      await onOneLine(strip, `investments menu at ${width}`);
      await tapTab(strip, 'Stocks');
      await onOneLine(page.getByRole('group', { name: 'Accounts' }), `stock accounts at ${width}`);
      await strip.getByRole('button', { name: 'Back to summary navigation' }).click();
      await strip.getByRole('button', { name: 'Summary' }).click();
    }
    await expectHealthy(page, app, 'phone single rows');
  });

  test('forecast, month on month and dividend radar use the same single row', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page), strip = page.getByRole('navigation', { name: 'Mobile section navigation' });
    const check = async (name: string, width: number) => {
      const row = page.getByRole('group', { name });
      await expect(row, `${name} uses the shared row`).toHaveClass(/mobile-main-nav/);
      const tops = await row.evaluate((el) => [...el.querySelectorAll(':scope > button, :scope > .one-row-more > button')].map((b) => Math.round(b.getBoundingClientRect().top)));
      expect(Math.max(...tops) - Math.min(...tops), `${name} on one line at ${width}: ${tops}`).toBeLessThanOrEqual(2);
      const box = (await row.boundingBox())!;
      expect(box.x + box.width, `${name} fits at ${width}`).toBeLessThanOrEqual(width + 1);
    };
    for (const width of [320, 412]) {
      await page.setViewportSize({ width, height: 800 });
      await strip.getByRole('button', { name: 'Forecast' }).click();
      await check('Forecast type', width);
      const goals = page.getByRole('group', { name: 'Forecast type' }).getByRole('button', { name: 'Goal readiness' });
      await tapTab(page.getByRole('group', { name: 'Forecast type' }), 'Goal readiness');
      await expect(goals).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: 'Month on Month' }).click();
      await check('Monthly or yearly items', width);
      await check('What to show', width);
      await strip.getByRole('button', { name: 'Investments' }).click().catch(() => undefined);
      await tapTab(strip, 'Stocks');
      await tapTab(page.getByRole('group', { name: 'Accounts' }), /^Dividend Buy Radar \(/);
      await check('Which stocks', width);
      await strip.getByRole('button', { name: 'Back to summary navigation' }).click();
    }
    await expectHealthy(page, app, 'phone screen rows');
  });

  test('desktop keeps its own forecast tabs', async ({ page }) => {
    test.skip(isPhone(page), 'Desktop layout only');
    const app = await signedIn(page);
    await open(page, app, /^Predictive Planner/);
    await expect(page.getByRole('tablist', { name: 'Forecast type' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Wealth & retirement' })).toBeVisible();
  });

  test('every panel quotes the same share for the largest asset class', async ({ page }) => {
    const app = await signedIn(page);
    const alert = page.getByText(/concentration is high at/).locator('visible=true');
    await expect(alert).toBeVisible();
    const [, title, share] = (await alert.textContent())!.match(/^(.+) concentration is high at ([\d.]+%)/)!;
    const tile = page.getByText('Largest allocation', { exact: true }).locator('visible=true').locator('..');
    await expect(tile).toContainText(share);
    await expect(tile).toContainText(title);
    const allocation = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Asset Allocation' }) }).locator('visible=true');
    await expect(allocation.getByRole('button', { name: new RegExp(title) })).toContainText(share);
    await expectHealthy(page, app, 'matching shares');
  });

  test('payments, dividends and expenses read clearly on a phone', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    await expect(page.getByRole('group', { name: 'Dashboard sections' })).toBeVisible();
    for (const name of [/^Payments This Month/, /^Dividends to Confirm/, /^Expenses$/]) {
      await page.getByRole('group', { name: 'Dashboard sections' }).getByRole('button', { name }).click();
      await expect(page.locator('.phone-overall-sections')).toBeVisible();
      const problems = await page.evaluate(() => {
        const all = [...document.querySelectorAll('.phone-overall-sections *')];
        const named = (el: Element) => (el.textContent || '').trim().slice(0, 30);
        return {
          faint: all.filter((el) => el.children.length === 0 && el.textContent?.trim() && getComputedStyle(el).color === 'rgb(244, 247, 242)').map(named),
          headless: [...document.querySelectorAll('.phone-overall-sections table')].filter((t) => { const head = t.querySelector('thead'); return head && !head.getBoundingClientRect().height; }).map(named),
          cutOff: all.filter((el) => {
            const box = el.getBoundingClientRect();
            if (!box.width || box.right <= innerWidth + 1) return false;
            for (let p = el.parentElement; p && !p.classList.contains('phone-overall-sections'); p = p.parentElement)
              if (['auto', 'scroll'].includes(getComputedStyle(p).overflowX)) return false;
            return true;
          }).map(named),
        };
      });
      expect(problems, String(name)).toEqual({ faint: [], headless: [], cutOff: [] });
    }
    await expectHealthy(page, app, 'phone dashboard panels');
  });

  test('the phone header and menu stay on screen while scrolling', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page), strip = page.getByRole('navigation', { name: 'Mobile section navigation' });
    await expect(page.getByRole('group', { name: 'Dashboard sections' })).toBeVisible();
    // The page grows as the app finishes loading, so keep trying until there is room to scroll.
    await expect.poll(() => page.evaluate(() => { scrollTo({ top: 2500, behavior: 'instant' }); return scrollY; })).toBeGreaterThan(2000);
    await expect(page.locator('.mobile-appbar')).toBeInViewport({ ratio: 1 });
    await expect(strip).toBeInViewport({ ratio: 1 });
    await strip.getByRole('button', { name: 'Goals' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expectHealthy(page, app, 'phone sticky menu');
  });

  test('account tabs come first on an investment screen, and Add stays on one line', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    await signedIn(page);
    const strip = page.getByRole('navigation', { name: 'Mobile section navigation' });
    await page.setViewportSize({ width: 320, height: 700 });
    await strip.getByRole('button', { name: 'Investments' }).click();
    await tapTab(strip, 'Stocks');
    const accounts = page.getByRole('group', { name: 'Accounts' });
    await expect(accounts).toBeVisible();
    const order = await page.evaluate(() => {
      const row = document.querySelector('.phone-screen .one-row-inline')!, market = document.querySelector('.phone-market-strip')!;
      return row.getBoundingClientRect().top < market.getBoundingClientRect().top;
    });
    expect(order).toBe(true);
    const add = page.locator('.phone-add-btn');
    const lines = await add.evaluate((el) => el.getBoundingClientRect().height);
    expect(lines).toBeLessThan(50);
    expect(await add.evaluate((el) => el.getBoundingClientRect().right)).toBeLessThanOrEqual(320);
  });

  test('the performance chart is readable on a phone', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    await signedIn(page);
    const chart = page.getByRole('img', { name: /performance graph/ }).locator('visible=true');
    await expect(chart).toBeVisible();
    const scale = () => chart.evaluate((el) => (el as unknown as SVGSVGElement).getBoundingClientRect().width / (el as unknown as SVGSVGElement).viewBox.baseVal.width);
    // Its 11-unit labels should show at no less than about 9 pixels.
    await expect.poll(scale).toBeGreaterThan(0.8);
    await expect(page.getByText(/^\d{2}-[A-Z][a-z]{2}-\d{4}$/).locator('visible=true').first()).toBeVisible();
  });

  test('the More list closes when you tap away', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    await signedIn(page);
    const strip = page.getByRole('navigation', { name: 'Mobile section navigation' }), accounts = page.getByRole('group', { name: 'Accounts' });
    await strip.getByRole('button', { name: 'Investments' }).click();
    await strip.getByRole('button', { name: 'Stocks' }).click();
    await accounts.getByRole('button', { name: 'More ▾' }).click();
    const menu = accounts.locator('.one-row-more-menu');
    await expect(menu).toBeVisible();
    await page.locator('.mobile-appbar').click({ position: { x: 20, y: 20 } });
    await expect(menu).toHaveCount(0);
  });

  test('the phone add button sits on the left', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    await signedIn(page);
    const right = () => page.getByRole('button', { name: 'Add an expense' }).evaluate((el) => el.getBoundingClientRect().right);
    await expect.poll(right).toBeLessThan(page.viewportSize()!.width / 2);
  });

  test('every phone menu option can be seen without sideways scrolling', async ({ page }) => {
    test.skip(!isPhone(page), 'Phone layout only');
    const app = await signedIn(page);
    const strip = page.getByRole('navigation', { name: 'Mobile section navigation' });
    for (const name of ['Summary', 'Investments', 'Goals', 'Forecast', 'Settings']) await expect(strip.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
    await strip.getByRole('button', { name: 'Investments' }).click();
    // Types with holdings sit in the row. Empty ones leave it, but the menu still reaches them.
    for (const name of ['Stocks', 'Property', 'Fixed', 'Insurance', 'MF']) await expect(strip.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
    for (const name of ['Gold/Silver', 'ULIP', 'NSEL']) await expect(strip.getByRole('button', { name })).toHaveCount(0);
    await expect(strip.getByRole('button', { name: 'More ▾' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('.mobile-menu-panel').getByRole('button', { name: 'Gold/Silver' }).click();
    await expect(strip.getByRole('button', { name: 'Gold/Silver' })).toHaveClass(/active/);

    // The menu sits clear of the header, and its last option can be scrolled to.
    await page.getByRole('button', { name: 'Open menu' }).click();
    const panel = page.locator('.mobile-menu-panel'), header = await page.locator('.mobile-appbar').boundingBox();
    expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    const signOut = panel.getByRole('button', { name: 'Sign out' });
    await signOut.scrollIntoViewIfNeeded();
    await expect(signOut).toBeInViewport({ ratio: 1 });
    await expectHealthy(page, app, 'phone menu options');
  });
});
