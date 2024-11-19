import path from 'node:path';
import fs from 'node:fs/promises';

import { compile } from '@core/compiler.js';
import { injectScripts } from '@core/inject.js';
import { tokenize } from '@core/tokenizer.js';
import { parse } from '@core/parser.js';

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

  // eslint-disable-next-line no-useless-return
  return;
}

