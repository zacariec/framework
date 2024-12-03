import { performance } from 'node:perf_hooks';

import React from 'react';
import { Box, render } from 'ink';

import { buildAssets, BuildLogger, transpileLiquid } from '@components/BuildLogger.js';
import { EnvironmentSelector } from '@components/EnvironmentSelector.js';
import { BuildEventEmitter, BuildEventEmitterEvents } from '@constants/events.js';
import { useFrameworkStore } from '@constants/stores.js';

import type { BuildCommandOptions } from '../../types/types.js';

type Props = {
  args: BuildCommandOptions;
};


export const Build = ({ args }: Props) => {
  const { environment } = useFrameworkStore((state) => state);

  return (
    <Box flexDirection="column" borderStyle="bold" padding={2} margin={2} borderColor="green">
      {environment.accessToken === '' || (!args?.environment && environment.accessToken === '') ? (
        <EnvironmentSelector environments={globalThis.config.frameworkConfig.environments} />
      ) : (
        <BuildLogger />
      )}
    </Box>
  );
};

export async function BuildCommand(args: BuildCommandOptions): Promise<void> {
  try {
    if (!args.environment) {
      render(<Build args={args} />);
      return;
    }

    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkInfo, (message) =>
      console.info(message),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkSuccess, (message) =>
      console.log(message),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkError, (message) =>
      console.error(message),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkWarning, (message) =>
      console.warn(message),
    );

    BuildEventEmitter.on(BuildEventEmitterEvents.ViteInfo, (message) =>
      console.info(message),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.ViteSuccess, (message) =>
      console.log(message),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.ViteError, (message) =>
      console.error(message),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.ViteWarning, (message) =>
      console.warn(message),
    );


    const start = performance.now();

    await Promise.allSettled([
      buildAssets(),
      transpileLiquid(),
    ]);

    const end = performance.now();

    BuildEventEmitter.emit(
      BuildEventEmitterEvents.FrameworkSuccess,
      `✓ Built in ${Math.round(end - start)}ms`,
    );
  } catch (error) {
    BuildEventEmitter.emit(
      BuildEventEmitterEvents.FrameworkError,
      `Error with build: ${error}`,
    );

    process.exit(0);
  }
}
