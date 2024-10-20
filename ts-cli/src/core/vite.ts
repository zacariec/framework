import { createServer, ViteDevServer } from 'vite';
import { LogInfo, LogError } from '../utils/logger';

let viteServer: ViteDevServer | null = null;

/**
 * Starts a Vite development server.
 * 
 * @param {string} root - The root directory for the Vite server.
 * @returns {Promise<ViteDevServer>} A promise that resolves with the Vite server instance.
 * @throws {Error} If the server fails to start.
 * 
 * @description
 * This function creates and starts a Vite server in middleware mode with custom watch options.
 * If a server is already running, it returns the existing instance.
 * 
 * @example
 * try {
 *   const server = await startViteServer('./src');
 *   console.log('Vite server started');
 * } catch (error) {
 *   console.error('Failed to start Vite server:', error);
 * }
 */
export async function startViteServer(root: string): Promise<ViteDevServer> {
  if (viteServer) {
    return viteServer;
  }

  try {
    viteServer = await createServer({
      root,
      server: {
        middlewareMode: true,
        watch: {
          usePolling: true,
          interval: 100,
        },
      },
      appType: 'custom',
    });

    LogInfo('Vite server started successfully');
    return viteServer;
  } catch (error) {
    LogError('Failed to start Vite server', error as Error);
    throw error;
  }
}

/**
 * Retrieves the current Vite server instance.
 * 
 * @returns {ViteDevServer | null} The current Vite server instance or null if no server is running.
 * 
 * @example
 * const server = getViteServer();
 * if (server) {
 *   console.log('Vite server is running');
 * } else {
 *   console.log('No Vite server is currently running');
 * }
 */
export function getViteServer(): ViteDevServer | null {
  return viteServer;
}

/**
 * Stops the currently running Vite server.
 * 
 * @returns {Promise<void>} A promise that resolves when the server has been stopped.
 * 
 * @description
 * This function closes the Vite server if one is running and sets the server reference to null.
 * If no server is running, this function does nothing.
 * 
 * @example
 * await stopViteServer();
 * console.log('Vite server stopped');
 */
export async function stopViteServer(): Promise<void> {
  if (viteServer) {
    await viteServer.close();
    viteServer = null;
    LogInfo('Vite server stopped');
  }
}
