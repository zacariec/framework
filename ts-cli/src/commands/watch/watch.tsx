import React, { useContext, useState } from 'react';
import { Box, render, useApp, useInput } from 'ink';

import type { FrameworkEnvironmentConfig, WatchCommandOptions } from '../../types/types.js';

import { EnvironmentSelector } from '@components/EnvironmentSelector.js';
import { WatchLogger } from '@components/WatchLogger.js';
import { useFrameworkStore } from '@constants/stores.js';

type Props = {
  args: WatchCommandOptions;
  environments: Record<string, FrameworkEnvironmentConfig>;
};

export const Watch = ({ args, environments }: Props) => {
  const app = useApp();
  const {environment} = useFrameworkStore((state) => state);


  useInput((input, key) => {
    if (key.escape || input === 'q') {
      app.exit();
      process.exit(0);
    }
  });

  return (
      <Box flexDirection="column" borderStyle="bold" padding={2} margin={2} borderColor="green">
        {environment.accessToken === '' ||
        (!args?.environment && environment.accessToken === '') ? (
          <EnvironmentSelector environments={environments} />
        ) : (
          <WatchLogger args={args} />
        )}
      </Box>
  );
};

export async function WatchCommand(args: any): Promise<void> {
  render(
    <Watch args={args} environments={globalThis.config.frameworkConfig.framework.environments} />,
  );
}
