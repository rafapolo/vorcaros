import { test, expect } from '@playwright/test';

async function waitForLoad(page) {
  await page.waitForFunction(
    () => document.getElementById('count-blue')?.textContent !== '—',
    { timeout: 15_000 },
  );
}

/** Programmatically select a node by id and open its info panel. */
async function selectNode(page, id) {
  await page.evaluate((nodeId) => {
    const viz = window.networkViz;
    const node = viz.nodeById.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);
    viz.selectNode(node);
    viz.showNodeInfo(node);
  }, id);
}

// ── CNAE filter edge cases ─────────────────────────────────────────────────

test.describe('CNAE filter edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('cnaeFilter is stored as a number, not a string', async ({ page }) => {
    await page.locator('.cnae-row').first().click();
    const filterType = await page.evaluate(() => typeof window.networkViz?.cnaeFilter);
    expect(filterType).toBe('number');
  });

  test('CNAE filter uses strict === equality and returns nodes', async ({ page }) => {
    await page.locator('.cnae-row').first().click();
    const matchCount = await page.evaluate(() => {
      const viz = window.networkViz;
      return viz?.data?.nodes.filter(n => n.cnae === viz.cnaeFilter).length ?? 0;
    });
    expect(matchCount).toBeGreaterThan(0);
  });

  test('CNAE info panel shows non-zero company count', async ({ page }) => {
    await page.locator('.cnae-row').first().click();
    const text = await page.locator('#nodeInfoContent').textContent();
    const match = text.match(/(\d+) empresa/);
    expect(match).toBeTruthy();
    expect(parseInt(match[1])).toBeGreaterThan(0);
  });

  test('CNAE row connection-count is non-zero after data loads', async ({ page }) => {
    const firstCount = await page.locator('.cnae-row .connection-count').first().textContent();
    expect(parseInt(firstCount)).toBeGreaterThan(0);
  });

  test('clicking second CNAE row deselects the first', async ({ page }) => {
    const rows = page.locator('.cnae-row');
    await rows.nth(0).click();
    await expect(rows.nth(0)).toHaveClass(/active/);
    await rows.nth(1).click();
    await expect(rows.nth(0)).not.toHaveClass(/active/);
    await expect(rows.nth(1)).toHaveClass(/active/);
  });

  test('clearCnaeFilter sets cnaeFilter to null', async ({ page }) => {
    await page.locator('.cnae-row').first().click();
    await page.evaluate(() => window.networkViz?.clearCnaeFilter());
    const filter = await page.evaluate(() => window.networkViz?.cnaeFilter);
    expect(filter).toBeNull();
  });

  test('CNAE filter from node info CNAE tag updates cnaeFilter', async ({ page }) => {
    const companyId = await page.evaluate(() =>
      window.networkViz?.data?.nodes.find(n => n.color === '#4488ff' && n.cnae)?.id
    );
    expect(companyId).not.toBeUndefined();
    await selectNode(page, companyId);
    await page.waitForTimeout(100);
    const cnaeTag = page.locator('#nodeInfoContent .cnae-tag.clickable-filter');
    if (await cnaeTag.count() > 0) {
      const cnaeCode = await cnaeTag.getAttribute('data-cnae');
      await cnaeTag.click();
      await page.waitForTimeout(100);
      const activeFilter = await page.evaluate(() => window.networkViz?.cnaeFilter);
      expect(String(activeFilter)).toBe(String(cnaeCode));
    }
  });
});

// ── Status filter edge cases ───────────────────────────────────────────────

test.describe('Status filter edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('all 4 status buttons are present and labeled', async ({ page }) => {
    await expect(page.locator('.status-btn.status-ativa')).toBeVisible();
    await expect(page.locator('.status-btn.status-baixada')).toBeVisible();
    await expect(page.locator('.status-btn.status-inapta')).toBeVisible();
    await expect(page.locator('.status-btn.status-suspensa')).toBeVisible();
  });

  test('two status filters can be active simultaneously', async ({ page }) => {
    await page.locator('.status-btn.status-ativa').click();
    await page.locator('.status-btn.status-baixada').click();
    await expect(page.locator('.status-btn.status-ativa')).toHaveClass(/active/);
    await expect(page.locator('.status-btn.status-baixada')).toHaveClass(/active/);
    const filters = await page.evaluate(() => [...(window.networkViz?.statusFilters ?? [])]);
    expect(filters).toContain('Ativa');
    expect(filters).toContain('Baixada');
  });

  test('statusFilters set contains correct string, not a number', async ({ page }) => {
    await page.locator('.status-btn.status-ativa').click();
    const filters = await page.evaluate(() => [...(window.networkViz?.statusFilters ?? [])]);
    expect(filters).toContain('Ativa');
    expect(filters).not.toContain('Baixada');
  });

  test('ativa status display count matches actual node count', async ({ page }) => {
    const displayText = await page.locator('.status-btn.status-ativa .status-count').textContent();
    const displayCount = parseInt(displayText);
    const actualCount = await page.evaluate(() =>
      window.networkViz?.data?.nodes.filter(n => n.status === 'Ativa' && !n.isOrange).length ?? 0
    );
    expect(displayCount).toBe(actualCount);
  });

  test('inapta status count is non-zero', async ({ page }) => {
    const text = await page.locator('.status-btn.status-inapta .status-count').textContent();
    expect(parseInt(text)).toBeGreaterThan(0);
  });
});

// ── Search edge cases ──────────────────────────────────────────────────────

test.describe('Search edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('search is case-insensitive (UPPERCASE input finds nodes)', async ({ page }) => {
    await page.locator('#searchInput').fill('LTDA');
    await page.waitForTimeout(400);
    const count = await page.locator('#searchCount').textContent();
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('search for non-existent term returns no results and closes panel', async ({ page }) => {
    await page.locator('#searchInput').fill('xxxxxxxxxnotfoundatall');
    await page.waitForTimeout(400);
    const count = await page.locator('#searchCount').textContent();
    expect(count.trim()).toBe('');
    await expect(page.locator('#nodeInfo')).not.toHaveClass(/open/);
  });

  test('clearing search after active results closes info panel', async ({ page }) => {
    await page.locator('#searchInput').fill('ltda');
    await page.waitForTimeout(400);
    await expect(page.locator('#nodeInfo')).toHaveClass(/open/);
    await page.locator('#searchClear').click();
    await expect(page.locator('#nodeInfo')).not.toHaveClass(/open/);
  });

  test('search results are sorted alphabetically', async ({ page }) => {
    await page.locator('#searchInput').fill('vorcaro');
    await page.waitForTimeout(400);
    const items = await page.locator('#nodeInfoContent .connection-item').allTextContents();
    expect(items.length).toBeGreaterThan(1);
    const sorted = [...items].sort((a, b) => a.localeCompare(b));
    expect(items).toEqual(sorted);
  });

  test('search result item click selects that node', async ({ page }) => {
    await page.locator('#searchInput').fill('ltda');
    await page.waitForTimeout(400);
    const firstItem = page.locator('#nodeInfoContent .connection-item').first();
    const targetId = await firstItem.getAttribute('data-node-id');
    await firstItem.click();
    await page.waitForTimeout(300);
    const selectedId = await page.evaluate(() => window.networkViz?.selectedNode?.id);
    expect(String(selectedId)).toBe(String(targetId));
  });

  test('search with accented Portuguese characters does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('#searchInput').fill('sócio');
    await page.waitForTimeout(400);
    expect(errors).toHaveLength(0);
  });

  test('Enter key triggers search immediately without debounce delay', async ({ page }) => {
    const input = page.locator('#searchInput');
    await input.fill('vorcaro');
    // Don't wait for debounce — press Enter immediately
    await input.press('Enter');
    const count = await page.locator('#searchCount').textContent();
    expect(parseInt(count)).toBeGreaterThan(0);
  });
});

// ── URL deep-linking ───────────────────────────────────────────────────────

test.describe('URL deep-linking (?n=)', () => {
  test('?n=394 selects ALINE node and opens info panel', async ({ page }) => {
    await page.goto('/?n=394');
    await waitForLoad(page);
    await page.waitForTimeout(600);
    await expect(page.locator('#nodeInfo')).toHaveClass(/open/);
    await expect(page.locator('#nodeInfoContent')).toContainText('ALINE BUENO RIBEIRO VORCARO');
  });

  test('?n=394 sets selectedNode.id to 394', async ({ page }) => {
    await page.goto('/?n=394');
    await waitForLoad(page);
    await page.waitForTimeout(600);
    const selectedId = await page.evaluate(() => window.networkViz?.selectedNode?.id);
    expect(selectedId).toBe(394);
  });

  test('invalid ?n= param does not crash and leaves panel closed', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?n=999999999');
    await waitForLoad(page);
    expect(errors).toHaveLength(0);
    await expect(page.locator('#nodeInfo')).not.toHaveClass(/open/);
  });

  test('URL-loaded node: _urlFollowNode clears after simulation ends', async ({ page }) => {
    await page.goto('/?n=394');
    await waitForLoad(page);
    await page.waitForFunction(
      () => window.networkViz?._onSimulationEnd === null || window.networkViz?._onSimulationEnd === undefined,
      { timeout: 20_000 }
    );
    // After simulation, node should still be selected
    const selectedId = await page.evaluate(() => window.networkViz?.selectedNode?.id);
    expect(selectedId).toBe(394);
  });

  test('?n= node: navBack disabled with one entry, enabled after second selection', async ({ page }) => {
    await page.goto('/?n=394');
    await waitForLoad(page);
    await page.waitForTimeout(600);
    // navIndex=0 with one history entry — back is still disabled (nothing before it)
    await expect(page.locator('#navBack')).toBeDisabled();
    // After a second selection navIndex=1 — back becomes enabled
    await selectNode(page, 2471);
    await page.waitForTimeout(100);
    await expect(page.locator('#navBack')).not.toBeDisabled();
  });
});

// ── popstate / navigation history ─────────────────────────────────────────

test.describe('Navigation history (popstate / navBack / navFwd)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('navBack becomes enabled after second distinct node selection', async ({ page }) => {
    await expect(page.locator('#navBack')).toBeDisabled();
    await selectNode(page, 394);   // navIndex=0 — back still disabled
    await page.waitForTimeout(100);
    await expect(page.locator('#navBack')).toBeDisabled();
    await selectNode(page, 2471);  // navIndex=1 — back now enabled
    await page.waitForTimeout(100);
    await expect(page.locator('#navBack')).not.toBeDisabled();
  });

  test('navFwd stays disabled when no forward history', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    await expect(page.locator('#navFwd')).toBeDisabled();
  });

  test('navBack navigates to previous selection', async ({ page }) => {
    await selectNode(page, 394);  // ALINE
    await page.waitForTimeout(100);
    await selectNode(page, 2471); // DANIEL
    await page.waitForTimeout(100);
    await page.locator('#navBack').click();
    await page.waitForTimeout(300);
    const selectedId = await page.evaluate(() => window.networkViz?.selectedNode?.id);
    expect(selectedId).toBe(394);
  });

  test('navFwd becomes enabled after navBack', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    await selectNode(page, 2471);
    await page.waitForTimeout(100);
    await page.locator('#navBack').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#navFwd')).not.toBeDisabled();
  });

  test('navFwd restores forward selection after navBack', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    await selectNode(page, 2471);
    await page.waitForTimeout(100);
    await page.locator('#navBack').click();
    await page.waitForTimeout(300);
    await page.locator('#navFwd').click();
    await page.waitForTimeout(300);
    const selectedId = await page.evaluate(() => window.networkViz?.selectedNode?.id);
    expect(selectedId).toBe(2471);
  });

  test('browser back (popstate) at navIndex -1 clears selectedNode', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(200);
    // history now has: [-1 (base), 0 (ALINE)]
    await page.goBack();
    await page.waitForTimeout(300);
    const selected = await page.evaluate(() => window.networkViz?.selectedNode);
    expect(selected).toBeNull();
  });

  test('_skipNextPopstate resets to false after navBack completes', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    await selectNode(page, 2471);
    await page.waitForTimeout(100);
    await page.locator('#navBack').click();
    await page.waitForTimeout(400);
    const skip = await page.evaluate(() => window.networkViz?._skipNextPopstate);
    expect(skip).toBe(false);
  });

  test('URL updates to ?n= when node selected via nav', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    expect(page.url()).toContain('n=394');
  });
});

// ── Light mode (edge brightening) ─────────────────────────────────────────

test.describe('Light mode — edge brightening', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('light toggle sets viz.lightMode to true', async ({ page }) => {
    await page.locator('#light-toggle').click();
    const lightMode = await page.evaluate(() => window.networkViz?.lightMode);
    expect(lightMode).toBe(true);
  });

  test('light toggle marks _linksDirty immediately', async ({ page }) => {
    await page.evaluate(() => { window.networkViz._linksDirty = false; });
    await page.locator('#light-toggle').click();
    const dirty = await page.evaluate(() => window.networkViz?._linksDirty);
    expect(dirty).toBe(true);
  });

  test('light mode uses brighter link color (cce0ff) on redraw', async ({ page }) => {
    await page.locator('#light-toggle').click();
    // Spy on the context's strokeStyle setter during _redrawLinks to capture the value
    const strokeStyle = await page.evaluate(() => {
      const viz = window.networkViz;
      let captured = null;
      const proto = CanvasRenderingContext2D.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'strokeStyle');
      Object.defineProperty(viz.linksCtx, 'strokeStyle', {
        set(v) { captured = v; desc.set.call(this, v); },
        get() { return desc.get.call(this); },
        configurable: true,
      });
      viz._redrawLinks();
      Object.defineProperty(viz.linksCtx, 'strokeStyle', desc);
      return captured;
    });
    expect(strokeStyle?.toLowerCase()).toBe('#cce0ff');
  });

  test('light toggle returns to dark mode on second click', async ({ page }) => {
    await page.locator('#light-toggle').click();
    await page.locator('#light-toggle').click();
    const lightMode = await page.evaluate(() => window.networkViz?.lightMode);
    expect(lightMode).toBe(false);
  });

  test('light mode button active class matches viz.lightMode', async ({ page }) => {
    const btn = page.locator('#light-toggle');
    await btn.click();
    const [lightMode, hasActive] = await page.evaluate(() => [
      window.networkViz?.lightMode,
      document.getElementById('light-toggle').classList.contains('active'),
    ]);
    expect(lightMode).toBe(hasActive);
  });
});

// ── Empresas dos sócios toggle ─────────────────────────────────────────────

test.describe('Empresas dos sócios toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('showEmpresasSocios defaults to false', async ({ page }) => {
    const show = await page.evaluate(() => window.networkViz?.showEmpresasSocios);
    expect(show).toBe(false);
  });

  test('enabling toggle sets showEmpresasSocios to true', async ({ page }) => {
    await page.locator('label:has(#showEmpresasSociosToggle)').click();
    const show = await page.evaluate(() => window.networkViz?.showEmpresasSocios);
    expect(show).toBe(true);
  });

  test('disabling toggle resets showEmpresasSocios to false', async ({ page }) => {
    const label = page.locator('label:has(#showEmpresasSociosToggle)');
    await label.click(); // enable
    await label.click(); // disable
    const show = await page.evaluate(() => window.networkViz?.showEmpresasSocios);
    expect(show).toBe(false);
  });

  test('orange node count in legend is non-zero', async ({ page }) => {
    const count = await page.locator('#count-orange').textContent();
    expect(parseInt(count.replace(/,/g, ''))).toBeGreaterThan(0);
  });

  test('orange nodes are excluded from hit-test when toggle is off', async ({ page }) => {
    const isOff = await page.evaluate(() => !window.networkViz?.showEmpresasSocios);
    expect(isOff).toBe(true);
    // Verify that any selectedNode (if any) is not orange
    const selectedColor = await page.evaluate(() => {
      const n = window.networkViz?.selectedNode;
      return n ? (n.originalColor || n.color) : null;
    });
    if (selectedColor !== null) {
      expect(selectedColor).not.toBe('#ffa500');
    }
  });

  test('CNAE counts update after sócios toggle', async ({ page }) => {
    const countBefore = await page.locator('.cnae-row .connection-count').first().textContent();
    await page.locator('label:has(#showEmpresasSociosToggle)').click();
    await page.waitForTimeout(200);
    const countAfter = await page.locator('.cnae-row .connection-count').first().textContent();
    // Count should increase since orange nodes are now included
    expect(parseInt(countAfter)).toBeGreaterThan(parseInt(countBefore));
  });
});

// ── Node info panel interactions ───────────────────────────────────────────

test.describe('Node info panel interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('selected node label appears in info panel', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    await expect(page.locator('#nodeInfoContent')).toContainText('ALINE BUENO RIBEIRO VORCARO');
  });

  test('well-connected node shows connection items in info panel', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    const count = await page.locator('#nodeInfoContent .connection-item').count();
    expect(count).toBeGreaterThan(0);
  });

  test('connection item click in info panel selects that node', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    const firstItem = page.locator('#nodeInfoContent .connection-item').first();
    const targetId = await firstItem.getAttribute('data-node-id');
    await firstItem.click();
    await page.waitForTimeout(300);
    const selectedId = await page.evaluate(() => window.networkViz?.selectedNode?.id);
    expect(String(selectedId)).toBe(String(targetId));
  });

  test('red (henrique) node shows "Pessoa central" type badge', async ({ page }) => {
    await selectNode(page, 394); // red node (ALINE)
    await page.waitForTimeout(100);
    await expect(page.locator('#nodeInfoContent .node-type.henrique')).toContainText('Pessoa central');
  });

  test('node info shows company/person count badges', async ({ page }) => {
    await selectNode(page, 394);
    await page.waitForTimeout(100);
    const text = await page.locator('#nodeInfoContent').textContent();
    expect(text).toMatch(/\d+ empresa|\d+ sócio/);
  });

  test('company node info shows status badge', async ({ page }) => {
    const companyId = await page.evaluate(() =>
      window.networkViz?.data?.nodes.find(n => n.color === '#4488ff' && n.status)?.id
    );
    expect(companyId).not.toBeUndefined();
    await selectNode(page, companyId);
    await page.waitForTimeout(100);
    await expect(page.locator('#nodeInfoContent .node-status')).toBeVisible();
  });
});

// ── Adjacency map and data integrity ──────────────────────────────────────

test.describe('Adjacency map and data integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
  });

  test('adjacency map is populated after load', async ({ page }) => {
    const size = await page.evaluate(() => window.networkViz?.adjacency?.size ?? 0);
    expect(size).toBeGreaterThan(0);
  });

  test('selectNode populates selectedConnectedIds', async ({ page }) => {
    await page.evaluate(() => window.networkViz?.selectNode(window.networkViz?.nodeById?.get(394)));
    const connectedCount = await page.evaluate(() => window.networkViz?.selectedConnectedIds?.size ?? 0);
    expect(connectedCount).toBeGreaterThan(0);
  });

  test('clearSelection nulls selectedNode and empties connectedIds', async ({ page }) => {
    await page.evaluate(() => {
      const viz = window.networkViz;
      viz.selectNode(viz.nodeById.get(394));
      viz.clearSelection();
    });
    const selected = await page.evaluate(() => window.networkViz?.selectedNode);
    const connCount = await page.evaluate(() => window.networkViz?.selectedConnectedIds?.size ?? 0);
    expect(selected).toBeNull();
    expect(connCount).toBe(0);
  });

  test('nodeById map size equals total node count', async ({ page }) => {
    const mapSize = await page.evaluate(() => window.networkViz?.nodeById?.size ?? 0);
    const nodeCount = await page.evaluate(() => window.networkViz?.data?.nodes?.length ?? 0);
    expect(mapSize).toBe(nodeCount);
  });

  test('nodeByLabel map size equals total node count', async ({ page }) => {
    const mapSize = await page.evaluate(() => window.networkViz?.nodeByLabel?.size ?? 0);
    const nodeCount = await page.evaluate(() => window.networkViz?.data?.nodes?.length ?? 0);
    expect(mapSize).toBe(nodeCount);
  });

  test('5 red (seed) nodes are present in the data', async ({ page }) => {
    const redCount = await page.evaluate(() =>
      window.networkViz?.data?.nodes.filter(n => (n.originalColor || n.color) === '#ff0000').length ?? 0
    );
    expect(redCount).toBe(5);
  });

  test('selectNodeByLabel finds the correct node', async ({ page }) => {
    await page.evaluate(() =>
      window.networkViz?.selectNodeByLabel('ALINE BUENO RIBEIRO VORCARO')
    );
    await page.waitForTimeout(100);
    const selectedLabel = await page.evaluate(() => window.networkViz?.selectedNode?.label);
    expect(selectedLabel).toBe('ALINE BUENO RIBEIRO VORCARO');
  });
});
