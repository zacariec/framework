// import http from 'node:http';
// import httpProxy from 'http-proxy';
// import { parse as parseHtml } from 'node-html-parser';

// import type { ShopifyConfig } from '../types/types.js';

// function injectScripts(html: string, port: number, storeUrl: string): string {
//   const root = parseHtml(html);
//   const head = root.querySelector('head');

//   if (head) {
//     const scriptTags = `
//       <script src="http://localhost:1337/@vite/client"></script>
//       <script type="module" src="http://localhost:1337/src/main.ts"></script>
//     `;
//     head.insertAdjacentHTML('beforeend', scriptTags);
//   }

//   // Replace all absolute URLs with proxied URLs
//   root.querySelectorAll('a[href], img[src], script[src], link[href]').forEach(el => {
//     const attrName = el.tagName === 'LINK' || el.tagName === 'A' ? 'href' : 'src';
//     const originalUrl = el.getAttribute(attrName);
//     if (originalUrl) {
//       if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
//         const url = new URL(originalUrl);
//         if (url.hostname === storeUrl) {
//           el.setAttribute(attrName, `http://localhost:${port}${url.pathname}${url.search}`);
//         }
//       } else if (originalUrl.startsWith('/')) {
//         el.setAttribute(attrName, `http://localhost:${port}${originalUrl}`);
//       }
//     }
//   });

//   // Replace any remaining references to the store URL
//   const modifiedHtml = root.toString().replace(new RegExp(storeUrl, 'g'), `localhost:${port}`);

//   return modifiedHtml;
// }

// export function createProxyServer(shopifyConfig: ShopifyConfig, port: number = 3111): Promise<http.Server> {
//   return new Promise((resolve, reject) => {
//     const proxy = httpProxy.createProxyServer({
//       target: `https://${shopifyConfig.storeUrl}`,
//       changeOrigin: true,
//       secure: false,
//       autoRewrite: true,
//       protocolRewrite: 'http',
//     });

//     proxy.on('proxyRes', (proxyRes, req, res) => {
//       let body = '';
//       proxyRes.on('data', (chunk) => {
//         body += chunk;
//       });

//       proxyRes.on('end', () => {
//         if (proxyRes.headers['content-type']?.includes('text/html')) {
//           const modifiedBody = injectScripts(body, port, shopifyConfig.storeUrl);
//           res.setHeader('Content-Type', 'text/html');
//           res.setHeader('Content-Length', Buffer.byteLength(modifiedBody));
//           res.end(modifiedBody);
//         } else {
//           res.end(body);
//         }
//       });
//     });

//     const server = http.createServer((req, res) => {
//       proxy.web(req, res, {}, (err) => {
//         console.error('Proxy error:', err);
//         res.writeHead(500, { 'Content-Type': 'text/plain' });
//         res.end('Proxy error');
//       });
//     });

//     server.on('error', (error) => {
//       console.error(`Server error: ${error.message}`);
//       reject(error);
//     });

//     server.listen(port, () => {
//       console.log(`Proxy server is running on http://localhost:${port}`);
//       resolve(server);
//     });
//   });
// }
