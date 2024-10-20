/* type imports */
import type { CommandOptions, FrameworkConfig } from "../types";

/**
 * Creates a FrameworkConfig object from command line options.
 * @param {CommandOptions} options - The command line options.
 * @returns {FrameworkConfig} The FrameworkConfig object.
 */
export default function createConfigFromOptions(options: CommandOptions): FrameworkConfig {
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
      cli: {
        defaultEnvironment: options.environment || 'production',
      }
    }
  }
}