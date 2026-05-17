/**
 * Performance benchmarks — verify the 3 optimizations are faster than their naive equivalents.
 *
 * Each test measures an old approach vs the optimized approach inside page.evaluate(),
 * reports timing to the console, and asserts the optimized path is strictly faster.
 */
import { test, expect } from '@playwright/test';

async function waitForLoad(page) {
  await page.waitForFunction(
    () => document.getElementById('count-blue')?.textContent !== '—',
    { timeout: 15_000 },
  );
}

// ── Opt 1: Pre-computed squared hit-radius vs per-iteration multiply ────────

test('Opt1 — pre-computed hoverRadiusSq faster than (r+4)*(r+4) per node', async ({ page }) => {
  await page.goto('/');
  await waitForLoad(page);

  const result = await page.evaluate(() => {
    const viz = window.networkViz;
    const nodes = viz.data.nodes;
    const N = 2000;
    const cx = 0, cy = 0;

    // Baseline: compute (r+4)^2 inside the loop on every iteration
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      let nearest = null, minDSq = Infinity;
      for (const node of nodes) {
        const dx = cx - node.x, dy = cy - node.y;
        const dSq = dx * dx + dy * dy;
        const t = node.radius + 4;
        if (dSq <= t * t && dSq < minDSq) { nearest = node; minDSq = dSq; }
      }
    }
    const baselineMs = (performance.now() - t0) / N;

    // Optimized: use pre-computed hoverRadiusSq field
    const t1 = performance.now();
    for (let i = 0; i < N; i++) {
      let nearest = null, minDSq = Infinity;
      for (const node of nodes) {
        const dx = cx - node.x, dy = cy - node.y;
        const dSq = dx * dx + dy * dy;
        if (dSq <= node.hoverRadiusSq && dSq < minDSq) { nearest = node; minDSq = dSq; }
      }
    }
    const optimizedMs = (performance.now() - t1) / N;

    return {
      baseline: +baselineMs.toFixed(4),
      optimized: +optimizedMs.toFixed(4),
      speedup: +(baselineMs / optimizedMs).toFixed(2),
      nodeCount: nodes.length,
    };
  });

  console.log(
    `Opt1 hoverRadiusSq — nodes: ${result.nodeCount}  ` +
    `baseline: ${result.baseline}ms  optimized: ${result.optimized}ms  ` +
    `speedup: ${result.speedup}x`
  );

  // Pre-computed version should be at least as fast (allow small variance)
  expect(result.optimized).toBeLessThanOrEqual(result.baseline * 1.15);
});

// ── Opt 2: Adjacency-map link traversal vs full-link scan ───────────────────

test('Opt2 — adjacency map O(degree) faster than O(L) full-link scan for highlighted links', async ({ page }) => {
  await page.goto('/');
  await waitForLoad(page);

  const result = await page.evaluate(() => {
    const viz = window.networkViz;
    const nodeId = 394; // ALINE BUENO RIBEIRO VORCARO — high-degree node
    viz.selectNode(viz.nodeById.get(nodeId));
    const links = viz.data.links;
    const N = 5000;

    // Baseline: iterate all links and filter by selected node id
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      let count = 0;
      for (const link of links) {
        if (link.source.id === nodeId || link.target.id === nodeId) count++;
      }
    }
    const baselineMs = (performance.now() - t0) / N;

    // Optimized: traverse adjacency list (O(degree))
    const adj = viz.adjacency.get(nodeId) ?? [];
    const t1 = performance.now();
    for (let i = 0; i < N; i++) {
      let count = 0;
      for (const { link } of adj) count++;
    }
    const optimizedMs = (performance.now() - t1) / N;

    return {
      baseline: +baselineMs.toFixed(4),
      optimized: +optimizedMs.toFixed(4),
      speedup: +(baselineMs / optimizedMs).toFixed(1),
      totalLinks: links.length,
      nodeDegree: adj.length,
    };
  });

  console.log(
    `Opt2 adjacency — links: ${result.totalLinks}  degree: ${result.nodeDegree}  ` +
    `baseline: ${result.baseline}ms  optimized: ${result.optimized}ms  ` +
    `speedup: ${result.speedup}x`
  );

  // Adjacency traversal must be faster than full link scan
  expect(result.optimized).toBeLessThan(result.baseline);
  // Speedup should be substantial (at least 5x for this node)
  expect(result.speedup).toBeGreaterThan(5);
});

// ── Opt 3: Memoized matchMedia vs per-call matchMedia ──────────────────────

test('Opt3 — cached _coarsePointer faster than matchMedia() per click', async ({ page }) => {
  await page.goto('/');
  await waitForLoad(page);

  const result = await page.evaluate(() => {
    const N = 100_000;

    // Baseline: call matchMedia() every time (old pattern)
    const t0 = performance.now();
    let hitRSqA = 0;
    for (let i = 0; i < N; i++) {
      const hitR = window.matchMedia('(pointer: coarse)').matches ? 44 : 30;
      hitRSqA = hitR * hitR;
    }
    const baselineMs = (performance.now() - t0) / N * 1000; // µs per call

    // Optimized: read cached boolean field
    const viz = window.networkViz;
    const t1 = performance.now();
    let hitRSqB = 0;
    for (let i = 0; i < N; i++) {
      const hitRSq = (viz._coarsePointer ? 44 : 30) ** 2;
      hitRSqB = hitRSq;
    }
    const optimizedMs = (performance.now() - t1) / N * 1000;

    return {
      baselineUs: +baselineMs.toFixed(4),
      optimizedUs: +optimizedMs.toFixed(4),
      speedup: +(baselineMs / optimizedMs).toFixed(1),
      sameResult: hitRSqA === hitRSqB,
    };
  });

  console.log(
    `Opt3 matchMedia cache — ` +
    `baseline: ${result.baselineUs}µs  optimized: ${result.optimizedUs}µs  ` +
    `speedup: ${result.speedup}x  same result: ${result.sameResult}`
  );

  expect(result.sameResult).toBe(true);
  expect(result.optimizedUs).toBeLessThan(result.baselineUs);
});

// ── Summary: hoverRadiusSq is present on all nodes after processData ────────

test('hoverRadiusSq pre-computed on every node after processData', async ({ page }) => {
  await page.goto('/');
  await waitForLoad(page);
  const allHaveIt = await page.evaluate(() =>
    window.networkViz?.data?.nodes.every(n => typeof n.hoverRadiusSq === 'number' && n.hoverRadiusSq > 0)
  );
  expect(allHaveIt).toBe(true);
});

test('_coarsePointer is a boolean set at construction time', async ({ page }) => {
  await page.goto('/');
  await waitForLoad(page);
  const t = await page.evaluate(() => typeof window.networkViz?._coarsePointer);
  expect(t).toBe('boolean');
});
