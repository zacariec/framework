/* vendor imports */
import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';
import { build as viteBuild, type UserConfig as ViteUserConfig } from 'vite';
/* user imports */
import { compile } from '@core/compiler.js';
import { parse } from '@core/parser.js';
import { tokenize } from '@core/tokenizer.js';
import { loadFrameworkConfig } from '@config/config.js';
import { LogInfo, LogError, LogSuccess } from '@utils/logger.js';
/* type imports */
import type { BuildCommandOptions, FrameworkConfig } from '../types/types.js';

/**
 * Creates a config object from command line options.
 * @param {BuildCommandOptions} options - The command line options.
 * @returns {FrameworkConfig} The framework config object.
 */
function createConfigFromOptions(options: BuildCommandOptions): FrameworkConfig {
  return {
    framework: {
      environments: {
        [options.environment || 'production']: {
          themeId: parseInt(options.themeId || '0', 10),
          accessToken: options.accessToken || '',
          shopifyUrl: options.storeUrl || '',
          ignores: options.ignore ? options.ignore.split(',') : [],
        },
      },
      input: options.input,
      output: options.output,
    },
  };
}

/**
 * Builds the Vite assets.
 * @param {string} inputDirectory - The input directory.
 * @param {string} outputDirectory - The output directory.
 * @param {ViteConfig} viteConfig - The Vite config.
 */
async function buildViteAssets(inputDirectory: string, outputDirectory: string, viteConfig?: ViteUserConfig): Promise<void> {
  LogInfo(`Building Vite assets...`);
  const srcDirectory = path.join(inputDirectory, 'src');

  await viteBuild({
    ...viteConfig,
    root: srcDirectory,
    build: {
      ...viteConfig?.build,
      outDir: outputDirectory,
      emptyOutDir: false,
    },
  });
}

/**
 * Recursively gets all Liquid files in a directory.
 * @param {string} directory - The directory to search.
 * @param {string[] | string} ignores - Patterns to ignore.
 * @returns {Promise<string[]>} An array of file paths.
 */
async function getAllLiquidFiles(directory: string, ignores: string[] | string): Promise<string[]> {
  const files = await fs.readdir(directory);
  const liquidFiles: string[] = [];
  const ignorePatterns = Array.isArray(ignores) ? ignores : [ignores];

  const processFile = async (file: string): Promise<void> => {
    const filePath = path.join(directory, file);
    const stat = await fs.stat(filePath);

    if (ignorePatterns.some((pattern) => filePath.includes(pattern))) {
      return;
    }

    if (stat.isDirectory()) {
      liquidFiles.push(...await getAllLiquidFiles(filePath, ignores));
    } else if (path.extname(file) === '.liquid') {
      liquidFiles.push(filePath);
    }
  };

  await Promise.all(files.map(processFile));

  return liquidFiles;
}

/**
 * Builds the Liquid files.
 * @param {string} inputDirectory - The input directory.
 * @param {string} outputDirectory - The output directory.
 * @param {string[] | string } ignores - The ignore patterns.
 */
async function buildLiquidFiles(inputDirectory: string, outputDirectory: string, ignores: string[] | string): Promise<void> {
  LogInfo(`Building Liquid files...`);
  const liquidFiles = await getAllLiquidFiles(inputDirectory, ignores);

  const processFile = async (file: string): Promise<void> => {
    const relativePath = path.relative(inputDirectory, file);
    const outputPath = path.join(outputDirectory, relativePath);

    const content = await fs.readFile(file, 'utf-8');
    const tokens = tokenize(content);
    const ast = parse(tokens);
    const compiledContent = await compile(ast, { development: false });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, compiledContent);
  };

  await Promise.all(liquidFiles.map(processFile));
}

const build = new Command('build')
  .description('Build the project ready for deployment/production')
  .option('-e --environment <env>', 'Specify the environment', 'production')
  .option('-c, --config <path>', 'Path to the Framework configuration file')
  .option('-i --input <path>', 'Input directory')
  .option('-o --output <path>', 'Output directory')
  .option('-t --theme-id <id>', 'Shopify Theme ID')
  .option('-s --store-url <url>', 'Shopify Store URL')
  .option('-a --access-token <token>', 'Shopify Access Token')
  .option('--ignore <patterns>', 'Comma-seperated list of ignore patterns')
  .action(async (options: BuildCommandOptions) => {
    try {
      let frameworkConfig: FrameworkConfig;

      if (options.config) {
        frameworkConfig = await loadFrameworkConfig(options.config);
      } else {
        frameworkConfig = createConfigFromOptions(options);
      }

      const environment =
        options.environment ||
        frameworkConfig.framework.cli?.defaultEnvironment ||
        'production';
      const environmentConfig = frameworkConfig.framework.environments[environment];

      if (!environmentConfig) {
        throw new Error(`Environment "${environment}" not found in framework config.`);
      }

      const cwd = process.cwd();
      const inputDirectory = path.resolve(cwd, options.input || frameworkConfig.framework.input || cwd);
      const outputDirectory = path.resolve(cwd, options.output || frameworkConfig.framework.output || 'dist');

      LogInfo(`Building project for ${environment} environment...`);

      await buildViteAssets(inputDirectory, outputDirectory, frameworkConfig.vite);
      await buildLiquidFiles(inputDirectory, outputDirectory, environmentConfig.ignores);

      LogSuccess('Project built successfully!');
    } catch (error) {
      LogError(`An error occurred during the build process`, error as Error);
    }
  });

export default build;