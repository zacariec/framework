import React from 'react';
import { Box, render, useApp, useInput } from 'ink';

import type { WatchCommandOptions } from '../../types/types.js';

import { EnvironmentSelector } from '@components/EnvironmentSelector.js';
import { WatchLogger } from '@components/WatchLogger.js';
import { useFrameworkStore } from '@constants/stores.js';

type Props = {
  args: WatchCommandOptions;
};

export const Watch = ({ args }: Props) => {
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
          <EnvironmentSelector environments={globalThis.config.frameworkConfig.environments} />
        ) : (
          <WatchLogger args={args} />
        )}
      </Box>
  );
};

export async function WatchCommand(args: any): Promise<void> {
  render(
    <Watch args={args} />,
  );
}
