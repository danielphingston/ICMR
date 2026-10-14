import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const publicFiles = new Set([
  'index.html', 'styles.css', 'app.js', 'nutrition.js', 'protocol.js', 'storage.js', 'sw.js',
  'manifest.webmanifest', 'ui.js', 'protocol-app.js', 'icons/icon.svg', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/icon-maskable-512.png',
]);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon'],
]);

function safeFile(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
  const relative = decoded === '/' ? 'index.html' : decoded.slice(1);
  if (!publicFiles.has(relative)) return null;
  const target = resolve(root, relative);
  if (target !== root && !target.startsWith(root.endsWith(sep) ? root : root + sep)) return null;
  return target;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method not allowed');
    return;
  }
  const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  const file = safeFile(url.pathname);
  if (!file) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Bad path');
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    const body = await readFile(file);
    const headers = {
      'Content-Type': types.get(extname(file).toLowerCase()) || 'application/octet-stream',
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': file.endsWith(`${sep}sw.js`) ? 'no-cache, no-store, must-revalidate' : 'no-cache',
    };
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Not found');
  }
});

server.listen(port, host, () => console.log(`Nourish is available at http://${host}:${port}`));
