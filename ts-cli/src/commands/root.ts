import { Command } from 'commander';

import buildCommand from '@commands/build.js';
import deployCommand from '@commands/deploy.js';
import watchCommand from '@commands/watch.js';
import { LogError, LogInfo } from '@utils/logger.js';
import { version } from '../../package.json';

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
	.addCommand(watchCommand)
	.addCommand(deployCommand);


program
	.option('c, --config <path>', 'Path to the Framework configuration file')
	.hook('preAction', async (thisCommand) => {
		const options = thisCommand.opts();
		if (options.config) {
			LogInfo(`Loading config from ${options.config}`);
		}
	})

const run = async (argv: string[] = process.argv): Promise<void> => {
	try {
		await program.parseAsync(argv);
	} catch (error) {
		LogError(`An error occurred: ${error as Error}`);
		process.exit(1);
	}
}

export { run };