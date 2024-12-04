import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import React, { useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import { ProgressBar, Spinner } from '@inkjs/ui';

import pLimit from 'p-limit';
import glob from 'fast-glob';

import { sanitizeFilePath } from '@core/process.js';
import { DeployEventEmitter, DeployEventEmitterEvents } from '@constants/events.js';

import type { FrameworkEnvironmentConfig } from '../types/types.js';

export function deployFiles(environment: FrameworkEnvironmentConfig) {
  const limit = pLimit(environment.rateLimit ?? 2);
  // TODO: Add ignores pattern to deployment & test.
  const files = glob.sync(path.join(globalThis.config.outputPath, '**/*.*')).map(
    (file): Promise<{ key: string; content: string }> =>
      new Promise((resolve) => {
        fs.readFile(file, 'utf-8').then((content) =>
          resolve({
            key: sanitizeFilePath(file),
            content,
          }),
        );
      }),
  );

  // TODO: Add Error Handling
  return new Promise((resolve) => {
    Promise
      .allSettled(files)
      .then((results): Promise<unknown>[] => {
        return results.map((result): Promise<void> => {
          return limit(() => (
            new Promise((resolve) => {
              if (result.status === 'rejected') {
                DeployEventEmitter.emit(DeployEventEmitterEvents.IncrementProgress, 100 / results.length);
                return;
              }

              const { key, content } = result.value;

              DeployEventEmitter.emit(DeployEventEmitterEvents.UploadInfo, result.value.key);

              globalThis.config.shopifyClient
                .uploadFile(key, content)
                .then(() => {
                  DeployEventEmitter.emit(DeployEventEmitterEvents.IncrementProgress, 100 / results.length)
                  resolve();
                });
            })
          ));
        });
      })
      .then((promises) => {
        Promise
          .allSettled(promises)
          .then(() => DeployEventEmitter.emit(DeployEventEmitterEvents.UploadFinished))
          .then(resolve);
      });
  });
}

export const DeployLogger = () => {
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [isFinished, setFinished] = useState(false);
  const [perfStart, setPerfStart] = useState(0);
  const [perfEnd, setPerfEnd] = useState(0);
  const environment = globalThis.config.frameworkConfig.environments[globalThis.config.environment];

  useEffect(() => {
    if (isFinished === true) {
      setPerfEnd(performance.now());
      return;
    }

    setPerfStart(performance.now());

    DeployEventEmitter.on(DeployEventEmitterEvents.IncrementProgress, (message) => {
      setProgress((value) => value + message);
    });

    DeployEventEmitter.on(DeployEventEmitterEvents.UploadInfo, setCurrentFile);
    DeployEventEmitter.on(DeployEventEmitterEvents.UploadFinished, () => setFinished(true));

    deployFiles(environment);
  }, [isFinished]);

  const fieldsToRender = ['themeId', 'accessToken', 'shopifyUrl', 'rateLimit'];
  const titles: Map<string, string> = new Map([
    ['themeId', 'Theme ID'],
    ['accessToken', 'Access Token'],
    ['shopifyUrl', 'Storefront URL'],
    ['output', 'Output'],
    ['rateLimit', 'Rate Limit'],
  ]);

  return (
    <Box flexDirection="column">
      <Text color="magentaBright">Deploying to {globalThis.config.environment}</Text>
      <Newline />
      {
        Object.entries(environment).map(([key, value]) => {
          if (!fieldsToRender.includes(key)) {
            return;
          }

          return (

          <Box key={key}>
            <Text bold color="yellowBright">
              {titles.get(key)}:&nbsp;
            </Text>
            <Text color="blueBright">
              {(key === 'accessToken') ? value.replace(/(?<=.{6}).(?=.{6})/g, '*') : value}
            </Text>
          </Box>
          );
        })
      }

      <Newline />

      {
        (isFinished !== true) 
          ? <Spinner label={`Processing ${currentFile}`} /> 
          : <Text color="greenBright">✓ Deployed in {Math.round(perfEnd - perfStart)}ms</Text>

      }

      <Newline />

      <ProgressBar value={progress} />

      <Newline />

      <Text color="gray">esc or q to exit</Text>
    </Box>
  );
};
