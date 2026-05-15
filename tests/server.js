Bun.serve({
  port: 5174,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = Bun.file('.' + pathname);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    return new Response(file);
  },
});
console.log('Test server → http://localhost:5174');
