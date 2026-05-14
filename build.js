import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const result = await Bun.build({
  entrypoints: ['./src/main.js'],
  outdir: './dist',
  minify: true,
  target: 'browser',
  naming: 'bundle.js',
});

if (!result.success) {
  for (const msg of result.logs) console.error(msg);
  process.exit(1);
}

mkdirSync('./dist/output', { recursive: true });
cpSync('./output', './dist/output', { recursive: true });
cpSync('./favicon.svg', './dist/favicon.svg');

// dist/index.html references ./bundle.js (no dist/ prefix since it lives inside dist/)
const html = readFileSync('./index.html', 'utf8')
  .replace('<script src="dist/bundle.js"></script>', '<script src="./bundle.js"></script>');
writeFileSync('./dist/index.html', html);

console.log('Build complete → dist/');
