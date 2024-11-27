import React, { createContext, useContext, useState } from 'react';
import { Box, render, useApp, useInput } from 'ink';

import type { FrameworkEnvironmentConfig } from '../../types/types.js';

import { loadFrameworkConfig, setupGlobalConfig } from '@config/config.js';
import { EnvironmentSelector } from '@components/EnvironmentSelector.js';
import { WatchLogger } from '@components/WatchLogger.js';

type Props = {
  args: any;
  environments: Record<string, FrameworkEnvironmentConfig>;
};

type State = {
  environment: FrameworkEnvironmentConfig;
  key: string;
};

type WatchContextType = {
  state: State;
  setState: (arg0: State) => void;
};

export const WatchContext = createContext<WatchContextType>({
  state: {
    key: '',
    environment: {
      themeId: 0,
      shopifyUrl: '',
      accessToken: '',
    },
  },
  setState: (state: State) => {},
});

export const Watch = ({ args, environments }: Props) => {
  const context = useContext(WatchContext);
  const [state, setState] = useState(context.state);
  const app = useApp();

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      app.exit();
      process.exit(0);
    }
  });

  return (
    <WatchContext.Provider value={{ state, setState }}>
      <Box flexDirection="column" borderStyle="bold" padding={2} margin={2} borderColor="green">
        {state.environment.accessToken === '' ||
        (!args?.environment && state.environment.accessToken === '') ? (
          <EnvironmentSelector environments={environments} />
        ) : (
          <WatchLogger {...args} />
        )}
      </Box>
    </WatchContext.Provider>
  );
};

export async function WatchCommand(args: any): Promise<void> {
  render(
    <Watch {...args} environments={globalThis.config.frameworkConfig.framework.environments} />,
  );
}
