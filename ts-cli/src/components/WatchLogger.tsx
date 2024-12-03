import React, { useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import open from 'open';

import { createServer } from 'vite';
import path from 'path';
import { initialSetup } from '@core/setup.js';
import watcher from '@parcel/watcher';
import { processFile } from '@core/process.js';
import { WatchEventEmitter, WatchEventEmitterEvents } from '@constants/events.js';
import * as emoji from 'node-emoji';

import type { LogState, LogType, WatchCommandOptions } from '../types/types.js';
import { useFrameworkStore } from '@constants/stores.js';
import { generateViteDevelopmentBuildConfig } from '@constants/vite.js';
import { handleLogType } from '@utils/utils.js';

const handleWatcherSubscribe = (err: Error | null, events: watcher.Event[]) =>
  Promise.all(
    events.map((event) => {
      switch (event.type) {
        case 'update':
          if (path.extname(event.path) !== '.liquid') {
            return;
          }
          processFile(event.path);

          break;
        case 'create':
          if (path.extname(event.path) !== '.liquid') {
            return;
          }
          processFile(event.path);

          break;
        case 'delete':
          if (path.extname(event.path) !== '.liquid') {
            return;
          }
          processFile(event.path);
          break;
        default:
          break;
      }
    }),
  );

type Props = {
  args: WatchCommandOptions;
};

export const WatchLogger = ({ args }: Props) => {
  const { key, environment } = useFrameworkStore((state) => state);

  const [viteServerUrl, setViteServerUrl] = useState<string | undefined>(undefined);
  const [frameworkWebhookUrl, setFrameworkWebhookUrl] = useState<string | undefined>(
    'http://localhost:8080',
  );
  const [shopifyPreviewUrl, setShopifyPreviewUrl] = useState<string | undefined>(undefined);
  const [frameworkLog, setFrameworkLog] = useState<LogState>({
    message: 'syncing changes',
    type: 'other',
  });
  const [viteLog, setViteLog] = useState<LogState>({
    message: 'watching for changes...',
    type: 'other',
  });


  useEffect(() => {
    WatchEventEmitter.on(WatchEventEmitterEvents.WatchInfo, (message) =>
      setFrameworkLog({ message, type: 'info' }),
    );
    WatchEventEmitter.on(WatchEventEmitterEvents.WatchSuccess, (message) =>
      setFrameworkLog({ message, type: 'success' }),
    );
    WatchEventEmitter.on(WatchEventEmitterEvents.WatchError, (message) =>
      setFrameworkLog({ message, type: 'error' }),
    );
    WatchEventEmitter.on(WatchEventEmitterEvents.WatchWarning, (message) =>
      setFrameworkLog({ message, type: 'warning' }),
    );

    WatchEventEmitter.on(WatchEventEmitterEvents.ViteInfo, (message) =>
      setViteLog({ message, type: 'info' }),
    );
    WatchEventEmitter.on(WatchEventEmitterEvents.ViteSuccess, (message) =>
      setViteLog({ message, type: 'success' }),
    );
    WatchEventEmitter.on(WatchEventEmitterEvents.ViteError, (message) =>
      setViteLog({ message, type: 'error' }),
    );
    WatchEventEmitter.on(WatchEventEmitterEvents.ViteWarning, (message) =>
      setViteLog({ message, type: 'warning' }),
    );


    createServer(
      generateViteDevelopmentBuildConfig(
        path.join(globalThis.config.inputPath, environment?.viteAssetDirectory ?? 'src'),
      ),
    )
      .then((server) => server.listen())
      .then((server) => {
        setViteServerUrl(server.resolvedUrls?.local[0]);
        initialSetup().then(() => {
          watcher
            .subscribe(globalThis.config.inputPath, handleWatcherSubscribe)
            .then((subscription) => {
              const storefrontUrl = new URL(globalThis.config.shopify.shopifyUrl);

              storefrontUrl.searchParams.append(
                'preview_theme_id',
                globalThis.config.shopify.themeId.toString(),
              );

              setShopifyPreviewUrl(storefrontUrl.toString());

              open(storefrontUrl.toString());

              process.on('SIGINT', () => {
                subscription.unsubscribe();
                server.close();
                process.exit(0);
              });
            });
        });
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <Box flexDirection="column">
      <Text color="magentaBright">Selected environment is {key}</Text>
      <Newline />
      <Box>
        <Text bold color="yellowBright">
          Preview URL:&nbsp;
        </Text>
        <Text color="blueBright">{shopifyPreviewUrl}</Text>
      </Box>
      <Box>
        <Text bold color="yellowBright">
          Vite URL:&nbsp;
        </Text>
        <Text color="blueBright">{viteServerUrl}</Text>
      </Box>
      <Box>
        <Text bold color="yellowBright">
          Framework URL:&nbsp;
        </Text>
        <Text color="blueBright">{frameworkWebhookUrl}</Text>
      </Box>

      <Newline />

      <Box>
        <Text>{emoji.get(':house:')}&nbsp;</Text>
        <Text color="magentaBright" bold>
          Framework:&nbsp;
        </Text>
        {!frameworkLog ? (
          <></>
        ) : (
          <Text color={handleLogType(frameworkLog.type)}>{frameworkLog.message}</Text>
        )}
      </Box>
      <Box>
        <Text>{emoji.get(':sparkles:')}&nbsp;</Text>
        <Text color="magentaBright" bold>
          Vite:&nbsp;
        </Text>
        {!viteLog ? <></> : <Text color={handleLogType(viteLog.type)}>{viteLog.message}</Text>}
      </Box>
      <Newline />

      <Text color="gray">esc or q to exit</Text>
    </Box>
  );
};
