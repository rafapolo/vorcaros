import { execSync, exec } from 'node:child_process';
import { watch } from 'node:fs';

execSync('bun run build.js', { stdio: 'inherit' });

Bun.serve({
  port: 5173,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    return new Response(Bun.file('.' + pathname));
  },
});
console.log('Dev server → http://localhost:5173');

let debounce;
let building = false;
function rebuild() {
  if (building) return;
  building = true;
  exec('bun run build.js', (err, _, stderr) => {
    building = false;
    if (err) console.error('Build error:\n' + stderr.trim());
    else process.stdout.write(`Rebuilt → ${new Date().toLocaleTimeString()}\n`);
  });
}

watch('./src', { recursive: true }, () => { clearTimeout(debounce); debounce = setTimeout(rebuild, 80); });
watch('./index.html', () => { clearTimeout(debounce); debounce = setTimeout(rebuild, 80); });
