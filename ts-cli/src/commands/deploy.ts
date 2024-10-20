/* vendor imports */
import fs from 'fs/promises';
import path from 'path';
/* npm imports */
import { Command } from 'commander';
/* user imports */
import { loadFrameworkConfig } from '../config/config';
import { createShopifyAPI } from '../shopify/api';
/* type imports */
import type { DeployCommandOptions, FrameworkConfig, ShopifyConfig } from '../types';
/* utils imports */
import createConfigFromOptions from '../utils/config';
import { LogError, LogInfo, LogSuccess } from '../utils/logger';

/**
 * Uploads files from the specified output directory to Shopify, respecting ignore patterns.
 * @param {string} outputDirectory - The path to the directory containing files to upload.
 * @param {ShopifyConfig} shopifyConfig - Configuration for Shopify API connection.
 * @param {string[] | string} ignores - Patterns to ignore when uploading files.
 * @returns {Promise<void>}
 */
async function uploadToShopify(outputDirectory: string, shopifyConfig: ShopifyConfig, ignores: string[] | string) {
  const shopifyAPI = createShopifyAPI(shopifyConfig);
  const ignorePatterns = Array.isArray(ignores) ? ignores : [ignores];
  
  const uploadFile = async (filePath: string): Promise<void> => {
    const relativePath = path.relative(outputDirectory, filePath);
    if (ignorePatterns.some((pattern) => relativePath.includes(pattern))) {
      return;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    await shopifyAPI.uploadFile(relativePath, content);
    LogInfo(`Uploaded: ${relativePath}`);
  };

  const processDirectory = async (directory: string): Promise<void> => {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    const uploadPromises = entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else {
        await uploadFile(fullPath);
      }
    });

    await Promise.all(uploadPromises);
  };

  await processDirectory(outputDirectory);
}


const deploy = new Command('deploy')
  .description('Deploy the build project to Shopify')
  .option('-e, --environment <env>', 'Specify the environment', 'production')
  .option('-c, --config <path>', 'Path to the Framework configuration file')
  .option('-o, --output <path>', 'Output directory of the built project')
  .option('-t, --theme-id <id>', 'Shopify theme ID')
  .option('-s, --store-url <url>', 'Shopify store URL')
  .option('-a, --access-token <token>', 'Shopify access token')
  .option('--ignore <patterns>', 'Comma-separated list of ignore patterns')
  .action(async (options: DeployCommandOptions) => {
    try {
      let frameworkConfig: FrameworkConfig;

      if (options.config) {
        frameworkConfig = await loadFrameworkConfig(options.config);  
      } else {
        frameworkConfig = createConfigFromOptions(options);
      }
      const environment = options.environment || frameworkConfig.framework.cli?.defaultEnvironment || 'production';
      const envConfig = frameworkConfig.framework.environments[environment];

      if (!envConfig) {
        throw new Error(`Environment "${environment}" not found in configuration`);
      }

      const cwd = process.cwd();
      const outputDir = options.output || frameworkConfig.framework.output
        ? path.resolve(cwd, options.output || frameworkConfig.framework.output || cwd)
        : path.resolve(cwd, 'dist');

      LogInfo(`Deploying project to Shopify for ${environment} environment...`);

      const shopifyConfig: ShopifyConfig = {
        storeUrl: envConfig.shopifyUrl,
        themeId: envConfig.themeId,
        accessToken: envConfig.accessToken,
      };

      await uploadToShopify(outputDir, shopifyConfig, envConfig.ignores);

      LogSuccess('Deployment completed successfully');
    } catch (error) {
      LogError('An error occurred during deployment', error as Error);
    }
  });

export default deploy;