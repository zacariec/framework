import pLimit from 'p-limit';

import { injectScripts } from '@core/inject.js';

import { LogError } from '@utils/logger.js';
import { compiler } from './compiler.js';
import { FileSource } from './vfs.js';

type FileMap = Map<string, string>;

export async function getFilesToUpload(): Promise<FileMap> {
  const { vfs } = globalThis.config;
  const fileMap = new Map<string, string>();
  
  try {
    // Get all files using VFS
    const files = await vfs.listFiles();
    
    // Filter files by patterns
    const matchingFiles = files.filter((file ) => (
        file.startsWith('config/') ||
        file.startsWith('locales/') ||
        file.startsWith('sections/') ||
        file.startsWith('snippets/') ||
        file.startsWith('templates/')
      ) && (
        file.endsWith('.json') ||
        file.endsWith('.liquid')
      ));

    // Read and store each file
    for await (const file of matchingFiles) {
      const content = await vfs.readFile(file, FileSource.LOCAL);
      fileMap.set(file, content);
    }

    return fileMap;
  } catch (error) {
    LogError(`Error getting files to upload: ${error}`);
    return new Map();
  }
}

export async function syncFiles(): Promise<void> {
  const { vfs } = globalThis.config;
  const files = await getFilesToUpload();
  const limit = pLimit(globalThis.config.frameworkConfig.environments[globalThis.config.environment].rateLimit ?? 2);

  const filePromises = Array.from(files.entries()).map(async ([file, content]) => limit(() => new Promise((resolve, reject) => {
      compiler
        .tokenize(content)
        .parse()
        .compile()
        .then((compiledContent) => {
          vfs
            .writeFile(file, compiledContent, FileSource.REMOTE)
            .then(() => resolve(true))
        })
        .catch((error) => {
          LogError(error as string);
          reject(error);
        });
    })));

  await Promise.all(filePromises);
}

export async function initialSetup(): Promise<void> {
  const { vfs } = globalThis.config;
  
  // Get layout files using VFS
  const layoutFiles = await vfs.listFiles('layout');
  
  const filePromises = layoutFiles.map(
    (file) =>
      new Promise((resolve, reject) => {
        vfs
          .readFile(file, FileSource.LOCAL)
          .then((content) => {
            compiler
              .tokenize(content)
              .parse()
              .compile()
              .then((compiledContent) => {
                injectScripts(compiledContent)
                  .then((injectedContent) => {
                    vfs
                      .writeFile(file, injectedContent, FileSource.REMOTE)
                      .then(() => resolve(true))
                      .catch((error) => {
                        LogError(`Error writing file ${file}: ${error}`);
                        reject(error);
                      });
                  })
                  .catch((error) => {
                    LogError(`Error injecting scripts into file ${file}: ${error}`);
                    reject(error);
                  });
              })
              .catch((error) => {
                LogError(`Error compiling file ${file}: ${error}`);
                reject(error);
              });
          })
          .catch((error) => {
            LogError(`Error reading file ${file}: ${error}`);
            reject(error);
          })
      }),
  );

  await Promise.allSettled(filePromises);
  await syncFiles();
}
