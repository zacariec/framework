import type { InlineConfig } from 'vite';
import { BuildEventEmitter, BuildEventEmitterEvents, WatchEventEmitter, WatchEventEmitterEvents } from './events.js';

export const generateViteDevelopmentBuildConfig = (root: string, input?: string | string[]): InlineConfig => ({
  root,
  plugins: globalThis.config.frameworkConfig.environments[globalThis.config.environment]?.plugins,
  publicDir: false,
  customLogger: {
    info(message, options) {
      WatchEventEmitter.emit(WatchEventEmitterEvents.ViteInfo, message);
    },
    warn(message, options) {
      WatchEventEmitter.emit(WatchEventEmitterEvents.ViteWarning, message);
    },
    warnOnce(message, options) {
      WatchEventEmitter.emit(WatchEventEmitterEvents.ViteWarning, message);
    },
    error(message, options) {
      WatchEventEmitter.emit(WatchEventEmitterEvents.ViteError, message);
    },
    clearScreen() {},
    hasErrorLogged(error) {
      return false;
    },
    hasWarned: false,
  },
});

export const generateViteProductionBuildConfig = (root: string, input: string | string[]): InlineConfig => ({
  root,
  plugins: globalThis.config.frameworkConfig.environments[globalThis.config.environment]?.plugins,
  build: {
    write: true,
    minify: true,
    cssMinify: true,
    outDir: globalThis.config.assetsPath,
    rollupOptions: {
      input,
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        assetFileNames: '[name].css',
      },
    },
  },
  logLevel: 'error',
  customLogger: {
    info(message, options) {
      BuildEventEmitter.emit(BuildEventEmitterEvents.ViteInfo, message);
    },
    warn(message, options) {
      BuildEventEmitter.emit(BuildEventEmitterEvents.ViteWarning, message);
    },
    warnOnce(message, options) {
      BuildEventEmitter.emit(BuildEventEmitterEvents.ViteWarning, message);
    },
    error(message, options) {
      BuildEventEmitter.emit(BuildEventEmitterEvents.ViteError, message);
    },
    clearScreen() {},
    hasErrorLogged(error) {
      return false;
    },
    hasWarned: false,
  },
});

export const ViteProductionBuild: InlineConfig = {
};
