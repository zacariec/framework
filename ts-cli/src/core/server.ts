import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

import { LogError, LogInfo } from '../utils/logger';

import type { ShopifyConfig } from '../types';

export function createProxyServer(shopifyConfig: ShopifyConfig, port: number = 3000): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const targetUrl = new URL(`https://${shopifyConfig.storeUrl}${request.url}`);

      const options: https.RequestOptions = {
        hostname: targetUrl.hostname,
        port: 443,
        path: targetUrl.pathname + targetUrl.search,
        method: request.method,
        headers: {
          ...request.headers,
          host: targetUrl.hostname,
        },
      };

      const proxyRequest = https.request(options, (proxyResponse) => {
        response.writeHead(proxyResponse.statusCode || 500, proxyResponse.headers);
        proxyResponse.pipe(response, { end: true });
      });

      request.pipe(proxyRequest, { end: true });

      proxyRequest.on('error', (error) => {
        LogError(`Error proxying request: ${error.message}`);
        response.writeHead(500, { 'Content-Type': 'text/plain' });
        response.end('Error proxying request');
      });
    });

    server.on('error', (error) => {
      LogError(`Server error: ${error.message}`);
      reject(error);
    });

    server.listen(port, () => {
      LogInfo(`Server is running on port ${port}`);
      resolve(server);
    })
  });
}