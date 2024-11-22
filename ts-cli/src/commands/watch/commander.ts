import { Command } from 'commander';

import { WatchCommand } from './watch.js';

let hasSelectedEnvironment = false;

const watch = new Command('watch')
  .description('Watch for changes and rebuild the project')
  .option('-e, --environment <env>', 'Specify the environment')
  .option('-c, --config <path>', 'Path to the Framework configuration file')
  .option('-i, --input <path>', 'Input directory')
  .option('-o, --output <path>', 'Output directory')
  .option('-t, --theme-id <id>', 'Shopify theme ID')
  .option('-s, --store-url <url>', 'Shopify store URL')
  .option('-a, --access-token <token>', 'Shopify access token')
  .option('--ignore <patterns>', 'Comma-separated list of ignore patterns')
  .action(WatchCommand);

export default watch;
