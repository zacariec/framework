import { Command } from 'commander';

import buildCommand from '@commands/build/commander.js';
import deployCommand from '@commands/deploy/commander.js';
import downloadCommand from '@commands/download/commander.js';
import watchCommand from '@commands/watch/commander.js';

import { LogError, LogInfo } from '@utils/logger.js';
import { version } from '../../package.json';
import { loadFrameworkConfig, setupGlobalConfig } from '@config/config.js';

const program = new Command();

program
  .name('framework')
  .description(
    `Framework is a developer first web framework for building Shopify Liquid Storefronts.
Framework is known for providing a world-class developer experience for Shopify Storefronts,
providing a "framework" layer over the stock Liquid experience. Framework was designed to be
build to server first, fast by default, easy to use, developer-focused and a seamless integration for
existing Shopify Liquid Storefronts.`,
  )
  .version(version)
  .addCommand(buildCommand)
  .addCommand(deployCommand)
  .addCommand(downloadCommand)
  .addCommand(watchCommand);

program.hook('preAction', async (_thisCommand, actionCommand): Promise<void> => {
  // we should unwrap the config file here unless it's like a setup command etc.
  try {
    const config = await loadFrameworkConfig();
    setupGlobalConfig(actionCommand, config);
  } catch (error) {
    LogError(`${error}`);
    process.exit(1);
  }
});

const run = async (argv: string[] = process.argv): Promise<void> => {
  try {
    await program.parseAsync(argv);
  } catch (error) {
    LogError(`An error occurred: ${error as Error}`);
    process.exit(1);
  }
};

export { run };
