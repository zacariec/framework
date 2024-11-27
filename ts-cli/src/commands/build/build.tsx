import { loadFrameworkConfig } from '@config/config.js';

import type { BuildCommandOptions } from '../../types/types.js';

export async function BuildCommand<T extends BuildCommandOptions>(args: T): Promise<void> {
  try {
    console.log(globalThis.config);
  } catch (error) {}
}
