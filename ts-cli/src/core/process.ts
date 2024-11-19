import path from 'node:path';
import fs from 'node:fs/promises';

import { compile } from '@core/compiler.js';
import { injectScripts } from '@core/inject.js';
import { parse } from '@core/parser.js';
import { tokenize } from '@core/tokenizer.js';
import { LogError, LogSuccess } from '@utils/logger.js';
import { pathToFileURL } from 'node:url';

function sanitizeFilePath(filePath: string): string {
  const filepath = pathToFileURL(new URL(filePath).pathname);
  const parts = filepath.href.split('/');

  if (parts.includes('templates') && parts.includes('customers')) {
    return `${parts[parts.length - 3]}/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }

  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

/**
 * Processes a single file, compiling if necessary and uploading to Shopify.
 *
 * @param {string} filePath - The path of the file to process
 */
export async function processFile(filePath: string): Promise<void> {
  const {
    inputPath,
    isDevelopment,
    // shopify,
    // vitePort
  } = globalThis.config;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const sanitizedPath = sanitizeFilePath(filePath);
    let compiledContent: string;

    // Compile all Liquid files
    if (path.extname(filePath) === '.liquid') {
      const tokens = tokenize(content);
      const ast = parse(tokens);
      compiledContent = await compile(ast);
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

    // Upload the content
    await globalThis.config.shopifyClient.uploadFile(sanitizedPath, uploadContent);

    LogSuccess(`Processed, compiled, and uploaded: ${sanitizedPath}`);
  } catch (error) {
    // Add more detailed error information in development
    if (isDevelopment) {
      return LogError('Full error:', error as Error);
    }

    LogError(`Error processing ${filePath}: ${error}`);
  }
}
