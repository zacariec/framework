import fs from 'node:fs/promises';
import path from 'node:path';

import { pathToFileURL } from 'node:url';

import { nanoid } from 'nanoid';
import { WebSocketServer } from 'ws';

import { createShopifyAPI } from '@shopify/api.js';
import { CONFIG_FILE_NAMES } from '@constants/constants.js';
import { LogError } from '@utils/logger.js';

import type { CommandOptions, FrameworkConfig, GlobalConfig } from '../types/types.js';
import { WebsocketClient } from '@core/websocket.js';
import { WebsocketEventEmitter } from '@constants/events.js';

/**
 * Checks if a file exists at the given path.
 * @param {string} filePath - The path to the file to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Searches for a config file in the given directory.
 * @param {string} directory - The directory to search for the config file.
 * @returns {Promise<string | null>} A promise that resolves to the path of the found config file, or null if not found.
 */
async function findConfigFile(directory: string): Promise<string | null> {
  const filePathPromises = CONFIG_FILE_NAMES.map((fileName) => {
    const filePath = path.resolve(directory, fileName);
    return fileExists(filePath).then((exists) => (exists ? filePath : null));
  });

  const existingFilePaths = await Promise.all(filePathPromises);
  return existingFilePaths.find((filePath) => filePath !== null) || null;
}

export async function checkConfigOrOptions(
  options: Record<string, string | undefined>,
): Promise<void> {
  const configPath = await findConfigFile(process.cwd());

  if (!configPath) {
    const requiredOptions = ['storeUrl', 'accessToken', 'themeId'];
    const missingOptions = requiredOptions.filter((option) => !options[option]);

    if (missingOptions.length > 0) {
      throw new Error(
        `No config file found and missing required options: ${missingOptions.join(', ')}`,
      );
    }
  }
}

/**
 * Loads the framework configuration from a specified path or searches for it in the current directory.
 * @param {string} [configPath] - Optional path to the configuration file.
 * @returns {Promise<FrameworkConfig>} A promise that resolves to the loaded framework configuration.
 * @throws {Error} If no config file is found or if there's an error loading the configuration.
 */
// eslint-disable-next-line consistent-return
export async function loadFrameworkConfig(configPath?: string): Promise<FrameworkConfig> {
  let finalConfigPath: string;

  if (configPath) {
    finalConfigPath = path.resolve(process.cwd(), configPath);

    if (!(await fileExists(finalConfigPath))) {
      throw new Error(`No config file found in the current directory`);
    }
  } else {
    const foundConfigPath = await findConfigFile(process.cwd());
    if (!foundConfigPath) {
      throw new Error('No config file found in the current directory');
    }
    finalConfigPath = foundConfigPath;
  }

  try {
    let userConfig: { default: FrameworkConfig };

    switch (path.extname(finalConfigPath)) {
      case '.js':
      case '.cjs':
        userConfig = await import(pathToFileURL(finalConfigPath).href);
        break;
      case '.mjs':
        userConfig = await import(pathToFileURL(finalConfigPath).href);
        break;
      case '.ts':
      case '.cts':
      case '.mts':
        (await import('ts-node')).register({
          transpileOnly: true,
          compilerOptions: {
            module: 'commonjs',
          },
        });
        userConfig = await import(pathToFileURL(finalConfigPath).href);
        break;
      default:
        throw new Error(`Unsupported config file type: ${finalConfigPath}`);
    }

    if (typeof userConfig.default !== 'object') {
      throw new Error(`Config file must export a default object: ${finalConfigPath}`);
    }

    return userConfig.default;
  } catch (error) {
    LogError(`Error loading Framework configuration from ${finalConfigPath}`, error as Error);
    process.exit(1);
  }
}

export function setupGlobalConfig(options: CommandOptions, frameworkConfig: FrameworkConfig): void {
  const environment = options.environment || 'development';
  const envConfig = frameworkConfig.framework.environments[environment];
  const websocketServer = new WebSocketServer({
    port: 8080, // TODO: Generate a port number
  });

  if (!envConfig) {
    throw new Error(`Environment "${environment}" not found in configuration`);
  }

  const rootPath = process.cwd();
  const inputPath =
    options.input || envConfig.input
      ? path.resolve(rootPath, options.input || envConfig.input)
      : rootPath;
  const outputPath =
    options.output || envConfig.output
      ? path.resolve(rootPath, options.output || envConfig.output)
      : path.resolve(rootPath, 'dist');

  // Extract store name from Shopify URL
  const shopifyUrl =
    'https://' +
    (options.storeUrl || envConfig.shopifyUrl).replace('http://', '').replace('https://', '');
  const storeName = shopifyUrl.replace(/^https?:\/\//, '').split('.')[0];

  const vitePort = frameworkConfig.vite?.server?.port || 5173;
  const viteAssetDirectory = envConfig.viteAssetDirectory || 'src';

  globalThis.config = {
    // Framework configuration
    frameworkConfig,

    // Environment
    environment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    isWatching: true,

    // Paths
    rootPath,
    inputPath,
    outputPath,
    assetsPath: path.join(outputPath, 'assets'),
    srcPath: path.join(inputPath, 'src'),

    // Theme structure paths
    layoutsPath: path.join(inputPath, 'layout'),
    sectionsPath: path.join(inputPath, 'sections'),
    snippetsPath: path.join(inputPath, 'snippets'),
    templatesPath: path.join(inputPath, 'templates'),
    configPath: path.join(inputPath, 'config'),

    // Server configuration
    websocketServer,
    port: frameworkConfig.framework.port || 3000,
    vitePort,
    viteServerUrl: `http://localhost:${vitePort}`,

    // Shopify configuration
    shopify: {
      themeId: Number(options.themeId || envConfig.themeId),
      shopifyUrl,
      accessToken: options.accessToken || envConfig.accessToken,
      ignores: envConfig.ignores || [],
      apiVersion: '2024-01',
      storeName,
    },

    // Initialize Shopify client
    shopifyClient: createShopifyAPI({
      themeId: Number(options.themeId || envConfig.themeId),
      shopifyUrl,
      accessToken: options.accessToken || envConfig.accessToken,
    }),
    clients: [],
    // Build configuration
    timestamp: Date.now(),
    buildId: nanoid(),

    // Cache and temporary storage
    cache: {
      compiledTemplates: new Map(),
      processedAssets: new Set(),
    },
  } satisfies GlobalConfig;

  // open connection to client.
  // TODO: Handle multiple connection instances.
  // BUG: Do I need multiple eventEmitters - surely not.
  websocketServer.on('connection', (ws) => {
    globalThis.config.clients.push(new WebsocketClient(ws, WebsocketEventEmitter));
  });
}
