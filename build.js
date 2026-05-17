import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('./dist', { recursive: true, force: true });

const [result, workerResult] = await Promise.all([
  Bun.build({
    entrypoints: ['./src/main.js'],
    outdir: './dist',
    minify: true,
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    naming: {
      entry: 'bundle.[ext]',
      chunk: '[name]-[hash].[ext]',
      asset: '[name]-[hash].[ext]',
    },
  }),
  Bun.build({
    entrypoints: ['./src/simulation-worker.js'],
    outdir: './dist',
    minify: true,
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    naming: { entry: '[name].[ext]' },
  }),
]);

if (!result.success) {
  for (const msg of result.logs) console.error(msg);
  process.exit(1);
}
if (!workerResult.success) {
  for (const msg of workerResult.logs) console.error(msg);
  process.exit(1);
}

mkdirSync('./dist/output', { recursive: true });
cpSync('./output', './dist/output', { recursive: true });
cpSync('./favicon.svg', './dist/favicon.svg');

const html = await Bun.file('./index.html').text();
await Bun.write('./dist/index.html', html
  .replace('href="dist/bundle.css"', 'href="./bundle.css"')
  .replace('src="dist/bundle.js"', 'src="./bundle.js"'));

const kb = n => (n / 1024).toFixed(1);
const [bSize, wSize] = await Promise.all([
  Bun.file('./dist/bundle.js').size,
  Bun.file('./dist/simulation-worker.js').size,
]);
console.log(`Build complete → dist/  bundle: ${kb(bSize)} KB · worker: ${kb(wSize)} KB`);
