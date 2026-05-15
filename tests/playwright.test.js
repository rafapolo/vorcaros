import { test, expect } from 'bun:test';

test('e2e tests (playwright)', async () => {
  const proc = Bun.spawn(['bunx', 'playwright', 'test'], {
    cwd: import.meta.dir + '/..',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  expect(await proc.exited).toBe(0);
}, 180_000);
