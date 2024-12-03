import React, { useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import fs from 'node:fs/promises';
import { build } from 'vite';
import * as emoji from 'node-emoji';
import { generateViteProductionBuildConfig } from '@constants/vite.js';
import glob from 'fast-glob';
import path from 'node:path';
import { sanitizeFilePath } from '@core/process.js';
import { compiler } from '@core/compiler.js';
import { BuildEventEmitter, BuildEventEmitterEvents } from '@constants/events.js';
import { LogState } from '../types/types.js';
import { handleLogType } from '@utils/utils.js';
import { performance } from 'node:perf_hooks';

type Props = {};

export function buildAssets(): Promise<unknown> {
  return new Promise((resolve) => {
    build(
      generateViteProductionBuildConfig(
        globalThis.config.rootPath,
        glob.sync(path.join(globalThis.config.srcPath, '**/*.*')),
      ),
    )
      .then(resolve)
      .catch(console.error);
  });
}

export function transpileLiquid(): Promise<PromiseSettledResult<unknown>[]> {
  const fileContent = [
    globalThis.config.configPath,
    globalThis.config.layoutsPath,
    globalThis.config.sectionsPath,
    globalThis.config.snippetsPath,
    globalThis.config.templatesPath,
  ]
    .map((directory) => glob.sync(path.join(directory, '**/*.*')))
    .flat()
    .map((file): Promise<Record<'filepath' | 'content', string>> => {
      return new Promise(async (resolve, reject) => {
        const filepath = sanitizeFilePath(file);
        const fullpath = file;

        if (path.extname(file) === '.json') {
          const content = await fs.readFile(file, 'utf-8');
          resolve({
            filepath,
            content,
          });
        }

        try {
          BuildEventEmitter.emit(BuildEventEmitterEvents.FrameworkInfo, `Reading ${file}`);

          const content = await fs.readFile(file, 'utf-8');

          try {
            BuildEventEmitter.emit(BuildEventEmitterEvents.FrameworkInfo, `Compiling ${file}`);

            const compiled = await compiler.tokenize(content).parse().compile(fullpath);

            BuildEventEmitter.emit(
              BuildEventEmitterEvents.FrameworkSuccess,
              `Successfully compiled & built ${file}`,
            );

            resolve({
              filepath,
              content: compiled,
            });
          } catch (error) {
            BuildEventEmitter.emit(
              BuildEventEmitterEvents.FrameworkError,
              `Error compiling ${file}: ${error}`,
            );
          }
        } catch (error) {
          BuildEventEmitter.emit(
            BuildEventEmitterEvents.FrameworkError,
            `Error reading ${file}: ${error}`,
          );
        }
      });
    })
    .flat();

  return new Promise((resolve, reject) => {
    Promise.allSettled(fileContent)
      .then((files) => {
        return files.map((result): Promise<void> | void => {
          if (result.status === 'rejected') {
            // TODO: Fix with a better rejection.
            BuildEventEmitter.emit(
              BuildEventEmitterEvents.FrameworkError,
              `Error with Promise ${JSON.stringify(result)}`,
            );
            return reject();
          }

          return new Promise((resolve) => {
            const { filepath, content } = result.value;
            const absolutePath = path.join(globalThis.config.outputPath, filepath);

            BuildEventEmitter.emit(
              BuildEventEmitterEvents.FrameworkInfo,
              `Writing directory: ${absolutePath}`,
            );

            fs.mkdir(path.dirname(absolutePath), { recursive: true })
              .then(() => {
                fs.writeFile(absolutePath, content, 'utf8').then(() => {
                  BuildEventEmitter.emit(
                    BuildEventEmitterEvents.FrameworkSuccess,
                    `Wrote file: ${absolutePath}`,
                  );
                  resolve();
                });
              })
              .catch((error) =>
                BuildEventEmitter.emit(
                  BuildEventEmitterEvents.FrameworkError,
                  `Error writing files: ${error}`,
                ),
              );
          });
        });
      })
      .then((files) => {
        Promise.allSettled(files).then(resolve);
      })
      .catch((error) =>
        BuildEventEmitter.emit(
          BuildEventEmitterEvents.FrameworkError,
          `Some error occurred: ${error}`,
        ),
      );
  });
}

export const BuildLogger = ({}: Props) => {
  const [frameworkLog, setFrameworkLog] = useState<LogState>();
  const [viteLog, setViteLog] = useState<LogState>();

  useEffect(() => {
    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkInfo, (message) =>
      setFrameworkLog({ message, type: 'info' }),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkSuccess, (message) =>
      setFrameworkLog({ message, type: 'success' }),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkError, (message) =>
      setFrameworkLog({ message, type: 'error' }),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.FrameworkWarning, (message) =>
      setFrameworkLog({ message, type: 'warning' }),
    );

    BuildEventEmitter.on(BuildEventEmitterEvents.ViteInfo, (message) =>
      setViteLog({ message, type: 'info' }),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.ViteSuccess, (message) =>
      setViteLog({ message, type: 'success' }),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.ViteError, (message) =>
      setViteLog({ message, type: 'error' }),
    );
    BuildEventEmitter.on(BuildEventEmitterEvents.ViteWarning, (message) =>
      setViteLog({ message, type: 'warning' }),
    );

    const start = performance.now();

    Promise.allSettled([
      buildAssets(),
      transpileLiquid()
    ])
      .then(() => {
        const end = performance.now();

        BuildEventEmitter.emit(
          BuildEventEmitterEvents.FrameworkSuccess,
          `✓ Built in ${Math.round(end - start)}ms`,
        );
      })
      .catch((error) => {
        BuildEventEmitter.emit(
          BuildEventEmitterEvents.FrameworkError,
          `Error with build: ${error}`,
        );
        process.exit(0);
      });
  }, []);

  return (
    <Box flexDirection="column">
      <Text color="magentaBright">Building for {globalThis.config.environment}</Text>
      <Newline />
      <Box>
        <Text bold color="yellowBright">
          Input Directory:&nbsp;
        </Text>
        <Text color="blueBright">{globalThis.config.inputPath}</Text>
      </Box>
      <Box>
        <Text bold color="yellowBright">
          Output Directory:&nbsp;
        </Text>
        <Text color="blueBright">{globalThis.config.outputPath}</Text>
      </Box>
      {/* <Box> */}
      {/*   <Text bold color="yellowBright"> */}
      {/*     Framework URL:&nbsp; */}
      {/*   </Text> */}
      {/*   <Text color="blueBright">{frameworkWebhookUrl}</Text> */}
      {/* </Box> */}

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
        <Text>{emoji.get(':sparkles:')}</Text>
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
