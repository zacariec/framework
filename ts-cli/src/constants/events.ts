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
