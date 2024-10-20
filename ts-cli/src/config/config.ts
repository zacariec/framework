import * as fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

import { CONFIG_FILE_NAMES } from '../constants/constants';
import type { FrameworkConfig } from '../types';
import { LogError } from '../utils/logger';

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

export async function checkConfigOrOptions(options: any): Promise<void> {
  const configPath = await findConfigFile(process.cwd());

  if (!configPath) {
    const requiredOptions = ['storeUrl', 'accessToken', 'themeId'];
    const missingOptions = requiredOptions.filter((option) => !options[option]);

    if (missingOptions.length > 0) {
      throw new Error(`No config file found and missing required options: ${missingOptions.join(', ')}`);
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
        userConfig = await import(finalConfigPath);
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
