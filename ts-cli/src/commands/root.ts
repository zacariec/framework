/* vendor imports */
import { Command } from 'commander';
/* util imports */
import { version } from '../../package.json';
import { LogError, LogInfo } from '../utils/logger';
/* user imports */
import buildCommand from './build';
import deployCommand from './deploy';
import watchCommand from './watch';
/* type imports */

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