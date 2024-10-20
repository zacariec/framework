import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

import { createServer } from 'vite';
import glob from 'fast-glob';
import { Command } from 'commander';
import chokidar from 'chokidar';

import { compile } from '../core/compiler';
import { loadFrameworkConfig } from '../config/config';
import { parse } from '../core/parser';
import { tokenize } from '../core/tokenizer';
import { LogError, LogInfo, LogSuccess } from '../utils/logger';
import { createShopifyAPI } from '../shopify/api';

import type { FSWatcher } from 'chokidar';
import type { WatchCommandOptions, ShopifyConfig } from '../types';
import { createProxyServer } from '@/core/server';

/**
 * Processes a single file, compiling if necessary and uploading to Shopify.
 * 
 * @param {string} filePath - The path of the file to process
 * @param {string} inputDirectory - The root input directory
 * @param {string} outputDirectory - The root output directory
 * @param {ShopifyConfig} shopifyConfig - Configuration for Shopify API
 */
async function processFile(
	filePath: string,
	inputDirectory: string,
	outputDirectory: string,
	shopifyConfig: ShopifyConfig
): Promise<void> {
	try {
		const fullPath = path.join(inputDirectory, filePath);
		const content = await readFile(fullPath, 'utf-8');
		let processedContent: string;
		
		if (path.extname(filePath) === '.liquid') {
			const tokens = tokenize(content);
			const ast = parse(tokens);
			processedContent = await compile(ast, { development: true });
		} else {
			processedContent = content;
		}

		const outputPath = path.join(outputDirectory, filePath);
		await mkdir(path.dirname(outputPath), { recursive: true });
		await writeFile(outputPath, processedContent);

		const shopifyAPI = createShopifyAPI(shopifyConfig);
		await shopifyAPI.uploadFile(filePath, processedContent);

		LogSuccess(`Processed and uploaded: ${filePath}`);
	} catch (error) {
		LogError(`Error processing ${filePath}:`, error as Error);
	}
}

/**
 * Sets up file watching for Liquid and JSON files.
 * 
 * @param {string} inputDirectory - The directory to watch for changes
 * @param {string} outputDirectory - The directory to output processed files
 * @param {ShopifyConfig} shopifyConfig - Configuration for Shopify API
 * @param {string[] | string} ignores - Patterns to ignore
 */
async function watchFiles(
	inputDirectory: string,
	outputDirectory: string,
	shopifyConfig: ShopifyConfig,
	ignores: string[] | string,
): Promise<FSWatcher> {
	const globs = [path.join(inputDirectory, '**/*.liquid'), path.join(inputDirectory, '**/*.json')];
	const filesToWatch = glob.sync(globs, { ignore: ignores as string[] });
	const watcher = chokidar.watch(filesToWatch, {
		cwd: inputDirectory,
		ignored: ignores,
		persistent: true,
		ignoreInitial: false,
		awaitWriteFinish: {
			stabilityThreshold: 2000,
			pollInterval: 100
		},
	});

	watcher
		.on('add', filePath => {
			LogInfo(`File added: ${filePath}`);
			processFile(filePath, inputDirectory, outputDirectory, shopifyConfig);
		})
		.on('change', filePath => {
			LogInfo(`File changed: ${filePath}`);
			processFile(filePath, inputDirectory, outputDirectory, shopifyConfig);
		})
		.on('unlink', filePath => LogInfo(`File removed: ${filePath}`))
		.on('addDir', dirPath => LogInfo(`Directory added: ${dirPath}`))
		.on('unlinkDir', dirPath => LogInfo(`Directory removed: ${dirPath}`))
		.on('error', error => LogError(`Watcher error: ${error}`))
		.on('ready', () => {
			LogInfo('Initial scan complete. Ready for changes');
			const watchedPaths = watcher.getWatched();
			LogInfo('Watched paths:');
			Object.keys(watchedPaths).forEach(dir => {
				watchedPaths[dir].forEach(file => {
					LogInfo(`  ${path.join(dir, file)}`);
				});
			});
		});
	return watcher;
}

/**
 * Creates and returns the watch command.
 * 
 * @returns {Command} The configured watch command
 */
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
	.action(async (options: WatchCommandOptions) => {
		try {
			const frameworkConfig = await loadFrameworkConfig(options.config);
			const environment = options.environment || frameworkConfig.framework.cli?.defaultEnvironment || 'development';
			const envConfig = frameworkConfig.framework.environments[environment];

			if (!envConfig) {
				throw new Error(`Environment "${environment}" not found in configuration`);
			}

			const currentWorkingDirectory = process.cwd();
			const inputDirectory = envConfig.input
				? path.resolve(currentWorkingDirectory, envConfig.input)
				: currentWorkingDirectory;
			const outputDirectory = envConfig.output
				? path.resolve(currentWorkingDirectory, envConfig.output)
				: path.resolve(currentWorkingDirectory, 'dist');

			const shopifyConfig: ShopifyConfig = {
				storeUrl: options.storeUrl || envConfig.shopifyUrl,
				themeId: Number(options.themeId || envConfig.themeId),
				accessToken: options.accessToken || envConfig.accessToken,
			};

			const viteAssetDirectory = envConfig.viteAssetDirectory || 'src';

			const proxyPort = parseInt(options.port || frameworkConfig.framework.port || 3111, 10);
			const proxyServer = await createProxyServer(shopifyConfig, proxyPort);

			// Start Vite dev server
			const viteServer = await createServer({
				...frameworkConfig.vite,
				root: path.join(inputDirectory, viteAssetDirectory),
				publicDir: false,
				build: {
					...frameworkConfig.vite?.build,
					outDir: outputDirectory,
					emptyOutDir: false,
					rollupOptions: {
						input: glob.sync([path.join(inputDirectory, viteAssetDirectory, '**/*')], {
							ignore: ['**/node_modules/**'],
						}),
					},
				},
				server: {
					host: frameworkConfig.vite?.server?.host ?? 'localhost',
					https: frameworkConfig.vite?.server?.https,
					port: frameworkConfig.vite?.server?.port ?? 1337,
					origin: frameworkConfig.vite?.server?.origin ?? '__placeholder__',
					hmr: frameworkConfig.vite?.server?.hmr === false
						? false
						: {
							host: (typeof frameworkConfig.vite?.server?.host ?? 'localhost') === 'string'
								? frameworkConfig.vite?.server?.host
								: undefined,
							port: frameworkConfig.vite?.server?.port ?? 1137,
							protocol: !frameworkConfig.vite?.server?.https ? 'ws' : 'wss',
							...(frameworkConfig?.vite?.server?.hmr === true ? {} : frameworkConfig.vite?.server?.hmr),
						}
				}
			});
			await viteServer.listen();

			LogInfo(`Vite dev server running at ${viteServer.resolvedUrls.local[0]}`);

			// Watch Liquid and JSON files

			const watcher = await watchFiles(inputDirectory, outputDirectory, shopifyConfig, envConfig.ignores || options.ignore);


			LogSuccess('Watch mode started successfully');

			// Keep the process alive
			process.stdin.resume();

			// Proper cleanup on SIGINT (Ctrl+C)
			process.on('SIGINT', () => {
				LogInfo('Received SIGINT. Closing watchers and servers...');
				watcher.close();
				viteServer.close();
				proxyServer.close(() => {
					LogInfo('Proxy server closed');
				});
				process.exit(0);
			});

		} catch (error) {
			LogError('An error occurred during watch mode', error as Error);
			process.exit(1);
		}
	});

export default watch;
