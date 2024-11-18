import path from 'node:path';

import glob from 'fast-glob';
// import chokidar from 'chokidar';
import open from 'open';
import watcher from '@parcel/watcher';

import { createServer } from 'vite';
import { Command } from 'commander';

import { processFile } from '@core/process.js';
import { initialSetup } from '@core/setup.js';
import { loadFrameworkConfig, setupGlobalConfig } from '@config/config.js';

const watch = new Command('watch')
  .description('Watch for changes and rebuild the project')
  .option('-e, --environment <env>', 'Specify the environment', 'development')
  .option('-c, --config <path>', 'Path to the Framework configuration file')
  .option('-i, --input <path>', 'Input directory')
  .option('-o, --output <path>', 'Output directory')
  .option('-t, --theme-id <id>', 'Shopify theme ID')
  .option('-s, --store-url <url>', 'Shopify store URL')
  .option('-a, --access-token <token>', 'Shopify access token')
  .option('--ignore <patterns>', 'Comma-separated list of ignore patterns')
  .hook('preAction', async (thisCommand) => {
    const options = thisCommand.opts();
    const frameworkConfig = await loadFrameworkConfig(options.config);
    setupGlobalConfig(options, frameworkConfig);
  })
  .action(async () => {
    try {
      // Start Vite dev server
      const viteServer = await createServer({
        ...globalThis.config.frameworkConfig.vite,
        root: path.join(globalThis.config.inputPath, 'src'),
        publicDir: false,
        logLevel: 'info',
        server: {
          ...globalThis.config.frameworkConfig.vite?.server,
          port: globalThis.config.vitePort,
        },
      });
      await viteServer.listen();

      // Perform initial setup
      await initialSetup();

      const subscription = await watcher.subscribe(
        globalThis.config.inputPath,
        async (err, events) => {
          await Promise.all(
            events.map((event) => {
              switch (event.type) {
                case 'update':
                  if (path.extname(event.path) !== '.liquid') {
                    return;
                  }
                  processFile(event.path);
                  break;
                case 'create':
                  if (path.extname(event.path) !== '.liquid') {
                    return;
                  }
                  processFile(event.path);
                case 'delete':
                  if (path.extname(event.path) !== '.liquid') {
                    return;
                  }
                  processFile(event.path);
                default:
                  break;
              }
            }),
          );
        },
      );

      const storefrontUrl = new URL(globalThis.config.shopify.shopifyUrl);
      storefrontUrl.searchParams.append(
        'preview_theme_id',
        globalThis.config.shopify.themeId.toString(),
      );
      await open(storefrontUrl.toString());

      // Proper cleanup on SIGINT (Ctrl+C)
      process.on('SIGINT', () => {
        subscription.unsubscribe();
        viteServer.close();
        process.exit(0);
      });
    } catch (error) {
      console.error(`An error occurred during watch mode: ${error}`);
      process.exit(1);
    }
  });

export default watch;
