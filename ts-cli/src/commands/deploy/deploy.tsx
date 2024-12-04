import React from 'react';
import { Box, render } from 'ink';

import { EnvironmentSelector } from '@components/EnvironmentSelector.js';
import { deployFiles, DeployLogger } from '@components/DeployLogger.js';
import { useFrameworkStore } from '@constants/stores.js';

import type { DeployCommandOptions } from '../../types/types.js';
import { DeployEventEmitter, DeployEventEmitterEvents } from '@constants/events.js';

type Props = {
  args: DeployCommandOptions;
};

export const Deploy = ({ args }: Props) => {
  const { environment } = useFrameworkStore((state) => state);

  return (
    <Box flexDirection="column" borderStyle="bold" padding={2} margin={2} borderColor="green">
      {environment.accessToken === '' || (!args?.environment && environment.accessToken === '') ? (
        <EnvironmentSelector environments={globalThis.config.frameworkConfig.environments} />
      ) : (
        <DeployLogger />
      )}
    </Box>
  );
};

export function DeployCommand(args: DeployCommandOptions): void {
  if (!args.environment) {
    render(<Deploy args={args} />);
    return;
  }

  const environment = globalThis.config.frameworkConfig.environments[args.environment];

  if (!environment) {
    render(<Deploy args={args} />);
    return;
  }

  // TODO: Better logging of deployment, lazy rn.
  // DeployEventEmitter.on(DeployEventEmitterEvents.IncrementProgress, (message) => {
  //   console.info(message);
  // });

  DeployEventEmitter.on(DeployEventEmitterEvents.UploadInfo, (message) => {
    console.info(message);
  });

  DeployEventEmitter.on(DeployEventEmitterEvents.UploadFinished, (message) => {
    console.log(message);
  });

  deployFiles(environment);
}
