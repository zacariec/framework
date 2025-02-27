import EventEmitter from 'node:events';

export enum WatchEventEmitterEvents {
  SelectedEnvironment = 'selectedEnvironment',
  WatchInfo = 'watchInfo',
  WatchSuccess = 'watchSuccess',
  WatchError = 'watchError',
  WatchWarning = 'watchWarning',
  ViteInfo = 'viteInfo',
  ViteSuccess = 'viteSuccess',
  ViteError = 'viteError',
  ViteWarning = 'viteWarning',
}

export const WatchEventEmitter = new EventEmitter();

export enum BuildEventEmitterEvents {
  FrameworkSuccess = 'frameworkSuccess',
  FrameworkInfo = 'frameworkInfo',
  FrameworkWarning = 'frameworkWarning',
  FrameworkError = 'frameworkError',
  ViteInfo = 'viteInfo',
  ViteSuccess = 'viteSuccess',
  ViteError = 'viteError',
  ViteWarning = 'viteWarning',
}

export const BuildEventEmitter = new EventEmitter().setMaxListeners(1);

export enum DeployEventEmitterEvents {
  UploadInfo = 'uploadInfo',
  UploadSuccess = 'uploadSuccess',
  UploadFail = 'uploadFail',
  UploadFinished = 'uploadFinished',
  IncrementProgress = 'incrementProgress',
}

export const DeployEventEmitter = new EventEmitter().setMaxListeners(1);

export enum DownloadEventEmitterEvents {
  DownloadSuccess = 'downloadSuccess',
  DownloadInfo = 'downloadInfo',
  DownloadFail = 'downloadFail',
  DownloadFinished = 'downloadFinished',
}

export const DownloadEventEmitter = new EventEmitter().setMaxListeners(1);
