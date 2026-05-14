import { execSync } from 'node:child_process';

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
