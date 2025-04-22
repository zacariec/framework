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
	const { vfs, shopifyClient } = globalThis.config;
	const limit = pLimit(environment.rateLimit ?? 2);
	const outputFiles = glob.sync(path.join(globalThis.config.outputPath, '**/*.*'), { ignore: []});
	const files = outputFiles.map((file): Promise<{ key: string, content: string }> => (
		new Promise((resolve) => {
			vfs.readFile(file)
				.then((content) => (
					resolve({
						key: sanitizeFilePath(file),
						content,
					})
				)
			)
		})
	));

	return new Promise((resolve, reject) => {(
		Promise
			.allSettled(files)
			.then((results) => (
				results.map((result) => (
					limit(() => (
						new Promise((limitResolve) => {
							if (result.status === 'rejected') {
								DeployEventEmitter.emit(DeployEventEmitterEvents.IncrementProgress, 100 / results.length);
								return limitResolve();
							}

							const { key, content } = result.value;

							DeployEventEmitter.emit(DeployEventEmitterEvents.UploadInfo, result.value.key);

							shopifyClient
								.uploadFile(key, content)
								.then(() => {
									DeployEventEmitter.emit(DeployEventEmitterEvents.IncrementProgress, 100 / results.length)
									return limitResolve();
								});
						})
					))
				))
			))
			.then((promises) => (
				Promise
					.allSettled(promises)
					.then(() => DeployEventEmitter.emit(DeployEventEmitterEvents.UploadFinished))
					.then(resolve)
			))
			.catch((error) => {
				console.error(error);
				reject();
			})
	)});
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
