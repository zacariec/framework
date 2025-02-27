import React from 'react';
import { Box, render } from 'ink';

import type { DownloadCommandOptions } from '../../types/types.js';
import { EnvironmentSelector } from '@components/EnvironmentSelector.js';
import { useFrameworkStore } from '@constants/stores.js';
import { DownloadLogger } from '@components/DownloadLogger.js';
import { DownloadEventEmitter, DownloadEventEmitterEvents } from '@constants/events.js';
import { downloadFiles } from '@components/DownloadLogger.js';

type Props = {
  args: DownloadCommandOptions;
};

export const Download = ({ args }: Props) => {
  const { environment } = useFrameworkStore((state) => state);

  return (
    <Box flexDirection="column" borderStyle="bold" padding={2} margin={2} borderColor="green">
      {environment.accessToken === '' || (!args?.environment && environment.accessToken === '') ? (
        <EnvironmentSelector environments={globalThis.config.frameworkConfig.environments} />
      ) : (
        <DownloadLogger />
      )}
    </Box>
  );
};

export async function DownloadCommand(args: DownloadCommandOptions): Promise<void> {
  if (!args.environment) {
    render(<Download args={args} />);
    return;
  }

  // CLI Mode
  const environment = globalThis.config.frameworkConfig.environments[args.environment];
  
  if (!environment) {
    console.error(`Environment "${args.environment}" not found in configuration`);
    process.exit(1);
  }

  // Setup CLI event handlers
  DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadInfo, (message) => {
    console.info(`Downloading: ${message}`);
  });

  DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadSuccess, () => {
    // We don't show progress in CLI mode
  });

  DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadFail, (error) => {
    console.error(`Error: ${error}`);
  });

  DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadFinished, () => {
    console.log('Download completed successfully');
    process.exit(0);
  });

  // Get theme ID from args or environment config
  const themeId = args.themeId || environment.themeId;
  
  if (!themeId) {
    console.error('No theme ID specified');
    process.exit(1);
  }

  // Create fake theme item for CLI mode
  const themeItem = {
    label: `Theme-${themeId}`,
    value: themeId
  };

  downloadFiles(themeItem);
}
