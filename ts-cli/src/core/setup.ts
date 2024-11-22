import path from 'node:path';
import fs from 'node:fs/promises';

import glob from 'fast-glob';
import pLimit from 'p-limit';

import { compile } from '@core/compiler.js';
import { injectScripts } from '@core/inject.js';
import { tokenize } from '@core/tokenizer.js';
import { parse } from '@core/parser.js';

import { LogError } from '@utils/logger.js';

type FileMap = Map<string, string>;

export async function getFilesToUpload(inputPath: string): Promise<FileMap> {
  const fileMap = new Map<string, string>();
  
  // Define patterns for Shopify theme files
  const patterns = [
    'config/**/*.json',
    'locales/**/*.json',
    'sections/**/*.liquid',
    'snippets/**/*.liquid',
    'templates/**/*.liquid',
    'templates/**/*.json',
  ];

  try {
    // Get all matching files
    const files = glob.sync(patterns, {
      cwd: inputPath,
      dot: true,
      ignore: ['node_modules/**', '.git/**'],
    });

    // Read and store each file
    for await (const file of files) {
      const fullPath = path.join(inputPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      // Store with normalized path as key (always use forward slashes)
      const normalizedPath = file.split(path.sep).join('/');
      fileMap.set(normalizedPath, content);
    }

    return fileMap;
  } catch (error) {
    console.error('Error getting files to upload:', error);
    return new Map();
  }
}

export async function syncFiles(): Promise<void> {
  const files = await getFilesToUpload(globalThis.config.inputPath);
  const limit = pLimit(globalThis.config.frameworkConfig.framework.environments[globalThis.config.environment].rateLimit ?? 2);

  const filePromises = Array.from(files.entries()).map(async ([file, content]) => {
    return limit(() => new Promise(async (resolve, reject) => {
      const tokens = tokenize(content);
      const ast = parse(tokens);
      const compiledContent = await compile(ast);


      try {
        await globalThis.config.shopifyClient.uploadFile(file, compiledContent);
      resolve(true);
      } catch (error) {
        LogError(error as string);
        reject(error);
      }
    
    }))
  });


  await Promise.all([filePromises]);
}

export async function initialSetup(): Promise<void> {
  const layoutDirectory = path.join(globalThis.config.inputPath, 'layout');
  const layoutFiles = await fs.readdir(layoutDirectory);
  const filePromises = layoutFiles.map(
    (file) =>
      // eslint-disable-next-line no-async-promise-executor
      new Promise(async (resolve) => {
        const filePath = path.join(layoutDirectory, file);
        const content = await fs.readFile(filePath, 'utf8');

        const tokens = tokenize(content);
        const ast = parse(tokens);
        const compiledContent = await compile(ast);
        const injectedContent = await injectScripts(compiledContent);

        await globalThis.config.shopifyClient.uploadFile(`layout/${file}`, injectedContent);

        resolve(true);
      }),
  );

  await Promise.allSettled(filePromises);

  await syncFiles();
  // eslint-disable-next-line no-useless-return
  return;
}

