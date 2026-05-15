import { test, expect } from '@playwright/test';

/** Wait until the network data has been processed and legend counts are populated. */
async function waitForLoad(page) {
  await page.waitForFunction(
    () => document.getElementById('count-blue')?.textContent !== '—',
    { timeout: 15_000 },
  );
}

test.describe('Vorcano network app', () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await waitForLoad(page);
  });

  // ── Load integrity ────────────────────────────────────────────────────────

  test('loads without console errors', async () => {
    expect(errors).toEqual([]);
  });

  test('renders both canvas layers', async ({ page }) => {
    await expect(page.locator('#network-canvas')).toBeVisible();
    await expect(page.locator('#links-canvas')).toBeVisible();
  });

  test('shows app title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Vorcaros Negócios Ltda');
  });

  test('legend counts update after data loads', async ({ page }) => {
    const blue   = await page.locator('#count-blue').textContent();
    const purple = await page.locator('#count-purple').textContent();
    expect(parseInt(blue)).toBeGreaterThan(0);
    expect(parseInt(purple)).toBeGreaterThan(0);
  });

  // ── CNAE panel ────────────────────────────────────────────────────────────

  test('CNAE panel renders activity rows with labels', async ({ page }) => {
    const firstRow = page.locator('.cnae-row').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.locator('.cnae-desc')).not.toBeEmpty();
  });

  test('clicking a CNAE row marks it active and opens node info', async ({ page }) => {
    const firstRow = page.locator('.cnae-row').first();
    await firstRow.click();
    await expect(firstRow).toHaveClass(/active/);
    await expect(page.locator('#nodeInfo')).toHaveClass(/open/);
  });

  test('clicking the active CNAE row again deselects it', async ({ page }) => {
    const firstRow = page.locator('.cnae-row').first();
    await firstRow.click();
    await expect(firstRow).toHaveClass(/active/);
    await firstRow.click();
    await expect(firstRow).not.toHaveClass(/active/);
    await expect(page.locator('#nodeInfo')).not.toHaveClass(/open/);
  });

  // ── Status filters ────────────────────────────────────────────────────────

  test('status filter buttons render with live counts', async ({ page }) => {
    await expect(page.locator('.status-btn')).toHaveCount(4);
    const ativaCount = await page.locator('.status-btn.status-ativa .status-count').textContent();
    expect(parseInt(ativaCount)).toBeGreaterThan(0);
  });

  test('status filter toggles active class on click', async ({ page }) => {
    const btn = page.locator('.status-btn.status-ativa');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  // ── Search ────────────────────────────────────────────────────────────────

  test('search input shows match count after debounce', async ({ page }) => {
    await page.locator('#searchInput').fill('ltda');
    await page.waitForTimeout(400);
    const count = await page.locator('#searchCount').textContent();
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('search opens node info panel with results list', async ({ page }) => {
    await page.locator('#searchInput').fill('ltda');
    await page.waitForTimeout(400);
    await expect(page.locator('#nodeInfo')).toHaveClass(/open/);
    await expect(page.locator('#nodeInfoContent .connection-item').first()).toBeVisible();
  });

  test('pressing Enter triggers search without waiting for debounce', async ({ page }) => {
    const input = page.locator('#searchInput');
    await input.fill('ltda');
    await input.press('Enter');
    const count = await page.locator('#searchCount').textContent();
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('clear button resets search and hides itself', async ({ page }) => {
    const input  = page.locator('#searchInput');
    const clear  = page.locator('#searchClear');
    await input.fill('ltda');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(input).toHaveValue('');
    await expect(clear).not.toBeVisible();
  });

  // ── Node info panel ───────────────────────────────────────────────────────

  test('close button hides node info panel', async ({ page }) => {
    await page.locator('.cnae-row').first().click();
    await expect(page.locator('#nodeInfo')).toHaveClass(/open/);
    await page.locator('#closeNodeInfo').click();
    await expect(page.locator('#nodeInfo')).not.toHaveClass(/open/);
  });

  test('nav back and forward buttons start disabled', async ({ page }) => {
    await expect(page.locator('#navBack')).toBeDisabled();
    await expect(page.locator('#navFwd')).toBeDisabled();
  });

  // ── Toggles ───────────────────────────────────────────────────────────────

  test('light mode button toggles active class', async ({ page }) => {
    const btn = page.locator('#light-toggle');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('show-labels toggle flips its checked state', async ({ page }) => {
    const checkbox = page.locator('#showLabelsToggle');
    const label    = page.locator('label:has(#showLabelsToggle)');
    await expect(checkbox).toBeChecked();
    await label.click();
    await expect(checkbox).not.toBeChecked();
    await label.click();
    await expect(checkbox).toBeChecked();
  });

  test('empresas-dos-sócios toggle flips its checked state', async ({ page }) => {
    const checkbox = page.locator('#showEmpresasSociosToggle');
    const label    = page.locator('label:has(#showEmpresasSociosToggle)');
    await expect(checkbox).not.toBeChecked();
    await label.click();
    await expect(checkbox).toBeChecked();
  });

  // ── No regressions during interaction ────────────────────────────────────

  test('no console errors during typical UI workflow', async ({ page }) => {
    await page.locator('.cnae-row').first().click();
    await page.locator('#closeNodeInfo').click();

    await page.locator('#searchInput').fill('ltda');
    await page.waitForTimeout(400);
    await page.locator('#searchClear').click();

    await page.locator('.status-btn.status-ativa').click();
    await page.locator('.status-btn.status-ativa').click();

    await page.locator('#light-toggle').click();
    await page.locator('#light-toggle').click();

    await page.locator('label:has(#showLabelsToggle)').click();
    await page.locator('label:has(#showEmpresasSociosToggle)').click();

    expect(errors).toEqual([]);
  });
});
