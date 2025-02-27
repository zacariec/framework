import React, { useEffect, useState } from 'react';

import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'crypto';
import pLimit from 'p-limit';

import { Box, Newline, Spacer, Text, useApp, useInput } from 'ink';
import { ProgressBar, Spinner } from '@inkjs/ui';
import SelectInput from 'ink-select-input';

import { Indicator } from './Indicator.js';

import type { Item } from 'node_modules/ink-select-input/build/SelectInput.js';
import { DownloadEventEmitter, DownloadEventEmitterEvents } from '@constants/events.js';

type PaginationProps = {
	pages: number;
	active: number;
};

const Pagination = ({ pages, active }: PaginationProps) => (
	<Box flexDirection="row">
		{Array.from(Array(pages)).map((_value, index) => (
			<Box key={index + 1}>
				<Text color={index + 1 === active ? 'blueBright' : 'grey'}>{index + 1}&nbsp;</Text>
			</Box>
		))}
	</Box>
);

export function downloadFiles(theme: Item<any>) {
	globalThis.config.shopifyClient.getThemeFiles(theme.value).then((files) => {
		const directoryName = `${theme.label.split('\n')[0]}-${path.basename(theme.value)}-${crypto.randomUUID()}`;
		const outputDirectory = path.join(process.cwd(), directoryName);

		fs.mkdir(outputDirectory)
			.then(() => {
				const limit = pLimit(2); // Add rate limiting
				const progressIncrement = 100 / files.length;
				
				const filePromises = files.map((file) => limit(() => new Promise<void>((resolve) => {
						const filename = path.join(outputDirectory, file.filename.replace('assets/', 'src/'));
						let contentType: BufferEncoding = 'utf8';
						let content: string;

						if ('content' in file) {
							content = file.content;
						}

						if ('contentBase64' in file) {
							contentType = 'base64';
							content = file.contentBase64;
						}
						console.log(filename);

						fs.mkdir(path.dirname(filename), { recursive: true })
							.then(() => {
								DownloadEventEmitter.emit(DownloadEventEmitterEvents.DownloadInfo, file.filename);

								fs.writeFile(filename, content, contentType)
									.then(() => {
										DownloadEventEmitter.emit(
											DownloadEventEmitterEvents.DownloadSuccess,
											progressIncrement
										);
										resolve();
									})
							})
							.catch((error) => {
								DownloadEventEmitter.emit(
									DownloadEventEmitterEvents.DownloadFail,
									`Error @ ${filename}: ${error}`
								);
								resolve();
							});
					}))
				);

				Promise.all(filePromises).then(() => {
					DownloadEventEmitter.emit(DownloadEventEmitterEvents.DownloadFinished);
				});
			})
			.catch((error) =>
				DownloadEventEmitter.emit(DownloadEventEmitterEvents.DownloadFail, `Error: ${error}`)
			);
	});
}

export const DownloadLogger = () => {
	const app = useApp();

	const [hasRun, setHasRun] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<number>(1);
	const [pages, setPages] = useState<Map<number, any>>(new Map());
	const [pageCount, setPageCount] = useState<number>(0);
	const [downloading, setDownloading] = useState<'stopped' | 'downloading' | 'finished'>('stopped');
	const [progress, setProgress] = useState<number>(0);
	const [current, setCurrent] = useState<string>();
	const [errorStack, setErrorStack] = useState<Array<any>>([]);

	const handleSelect = (theme: Item<any>) => {
		setDownloading('downloading');
		downloadFiles(theme);
	};

	useEffect(() => {
		if (hasRun === true) {
			return;
		}

		// Subscribe to events.
		DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadSuccess, (progress) =>
			setProgress((current) => current + progress),
		);
		DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadInfo, (file) => setCurrent(file));
		DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadFinished, () =>
			setDownloading('finished'),
		);
		DownloadEventEmitter.on(DownloadEventEmitterEvents.DownloadFail, (file) =>
			setErrorStack((current) => {
				current.push(file);
				return current;
			}),
		);

		Promise.allSettled([globalThis.config.shopifyClient.getShopThemes(10)]).then(([result]) => {
			// TODO: Better Error handling.
			if (result.status === 'rejected') {
				return;
			}

			const chunks = [];

			for (let i = 0; i < result.value.length; i += 5) {
				const chunk = result.value.slice(i, i + 5).map((theme) => ({
					label: `${theme.name}\n└─ (Theme ID: ${path.basename(theme.id)} - ${theme.role})`,
					value: theme.id,
				}));

				chunks.push(chunk);
			}

			const map = new Map();

			chunks.forEach((chunk, index) => {
				map.set(index + 1, chunk);
			});

			Promise.resolve(setHasRun(true)).then(() => {
				setPages(map);
				setPageCount(map.size);
			});
		});
	}, [pages, hasRun, downloading]);

	useInput((input, key) => {
		if (key.escape || input === 'q') {
			app.exit();
			process.exit(0);
		}

		// navigate left with arrow key.
		if (key.leftArrow || key.pageDown || input === 'h') {
			setActiveTab((current) => {
				if (current - 1 === 0) {
					return pages.size;
				}

				return current - 1;
			});
		}

		if (key.tab || key.rightArrow || key.pageUp || input === 'l') {
			setActiveTab((current) => {
				if (current + 1 > pages.size) {
					return 1;
				}

				return current + 1;
			});
		}
	});

	// Initial render before we get themes from useEffect.
	if (hasRun === false) {
		return (
			<Box flexDirection="column">
				<Text color="yellowBright">Please wait while we fetch your themes:</Text>

				<Newline />

				<Spinner label="Fetching themes" />

				<Newline />

				<Text color="gray">(esc or q) exit</Text>
			</Box>
		);
	}

	const title = (function () {
		switch (downloading) {
			case 'stopped':
				return 'Select Theme to Download';
			case 'downloading':
				return 'Downloading...';
			case 'finished':
				return 'Finished downloading Theme';
			default:
				return 'Select Theme to Download';
		}
	})();

	const pagination = (function () {
		switch (downloading) {
			case 'stopped':
				return <Pagination pages={pageCount} active={activeTab} />;
			case 'downloading':
				return <></>;
			case 'finished':
				return <Pagination pages={pageCount} active={activeTab} />;
			default:
				return <Pagination pages={pageCount} active={activeTab} />;
		}
	})();

	const select = (function () {
		console.log(progress);
		switch (downloading) {
			case 'stopped':
				return (
					<SelectInput
						items={pages.get(activeTab)}
						indicatorComponent={Indicator}
						onSelect={handleSelect}
					/>
				);
			case 'downloading':
				return (
					<Box flexDirection="column">
						<Text>{current}</Text>
						<Newline />
						<ProgressBar value={progress} />
					</Box>
				);
			case 'finished':
				return (
					<SelectInput
						items={pages.get(activeTab)}
						indicatorComponent={Indicator}
						onSelect={handleSelect}
					/>
				);
			default:
				return (
					<SelectInput
						items={pages.get(activeTab)}
						indicatorComponent={Indicator}
						onSelect={handleSelect}
					/>
				);
		}
	})();

	return (
		<Box flexDirection="column">
			<Box flexDirection="row">
				<Text color="yellowBright">{title}</Text>
				<Spacer />
				{pagination}
			</Box>

			<Newline />

			{select}

			<Newline />

			<Text color="gray">(esc or q) exit • (↑/↓/←/→) navigate • (tab) page • (enter) select</Text>
		</Box>
	);
};
