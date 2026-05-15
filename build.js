import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

rmSync('./dist', { recursive: true, force: true });

const [result, workerResult] = await Promise.all([
  Bun.build({
    entrypoints: ['./src/main.js'],
    outdir: './dist',
    minify: true,
    target: 'browser',
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

const html = readFileSync('./index.html', 'utf8')
  .replace('href="dist/bundle.css"', 'href="./bundle.css"')
  .replace('src="dist/bundle.js"', 'src="./bundle.js"');
writeFileSync('./dist/index.html', html);

console.log('Build complete → dist/');
