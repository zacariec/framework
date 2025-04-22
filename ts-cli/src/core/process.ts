import path from 'node:path';

import { compiler } from '@core/compiler.js'
import { injectScripts } from '@core/inject.js';
import { LogError, LogSuccess } from '@utils/logger.js';
import { pathToFileURL } from 'node:url';
import { FileSource } from '@core/vfs.js';

export function sanitizeFilePath(filePath: string): string {
  const requiresHttp = process.platform !== 'win32' ? 'http:/' : '';
  const filepath = pathToFileURL(new URL(requiresHttp + filePath).pathname);
  const parts = filepath.href.split('/');

  if (parts.includes('templates') && parts.includes('customers')) {
    return `${parts[parts.length - 3]}/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }

  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

/**
 * Processes a single file, compiling if necessary and uploading to Shopify.
 *
 * @param {string} filepath - The path of the file to process
 */
export async function processFile(filepath: string): Promise<void> {
  const {
    inputPath,
    isDevelopment,
    vfs
  } = globalThis.config;

  try {
    const sanitizedPath = sanitizeFilePath(filepath);
    // Use VFS instead of direct fs access
    const content = await vfs.readFile(filepath, FileSource.LOCAL);
    let compiledContent: string;

    // Compile all Liquid files
    if (path.extname(filepath) === '.liquid') {
      compiledContent = await compiler
        .tokenize(content)
        .parse()
        .compile();
    } else {
      compiledContent = content;
    }

    // For layout files, inject scripts after compilation
    let uploadContent: string;
    if (sanitizedPath.startsWith('layout/') && path.extname(sanitizedPath) === '.liquid') {
      uploadContent = await injectScripts(compiledContent);
    } else {
      uploadContent = compiledContent;
    }

    // Use VFS to write the file remotely
    await vfs.writeFile(sanitizedPath, uploadContent, FileSource.REMOTE);
    
    globalThis.config.ws.send('reload');

    LogSuccess(`Processed, compiled, and uploaded: ${sanitizedPath}`);
  } catch (error) {
    // Add more detailed error information in development
    if (isDevelopment) {
      LogError('Full error:', error as Error);
    }

    LogError(`Error processing ${filepath}: ${error}`);
  }
}
