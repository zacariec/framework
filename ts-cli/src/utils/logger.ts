/* eslint-disable no-console */
import { WatchEventEmitter, WatchEventEmitterEvents } from '@constants/events.js';
import chalk from 'chalk';

/**
 * Logs an error message to the console in red color.
 * If an Error object is provided, it also logs the error stack or message.
 *
 * @param {string} message - The error message to log.
 * @param {Error} [err] - Optional Error object with additional details.
 */
export function LogError(message: string, err?: Error): void {
  WatchEventEmitter.emit(WatchEventEmitterEvents.WatchError, message);
  // console.error(chalk.bold.red(`ERROR: ${message}`));
  //
  // if (err) {
  //   console.error(chalk.red(err.stack || err.message));
  // }
}

/**
 * Logs a warning message to the console in yellow color.
 *
 * @param {string} message - The warning message to log.
 */
export function LogWarning(message: string): void {
  WatchEventEmitter.emit(WatchEventEmitterEvents.WatchWarning, message);
  // console.warn(chalk.yellow(`WARNING: ${message}`));
}

/**
 * Logs an informational message to the console in blue color.
 *
 * @param {string} message - The informational message to log.
 */
export function LogInfo(message: string): void {
  WatchEventEmitter.emit(WatchEventEmitterEvents.WatchInfo, message);
  // console.log(chalk.blue(`INFO: ${message}`));
}

/**
 * Logs a success message to the console in bold green color.
 *
 * @param {string} message - The success message to log.
 */
export function LogSuccess(message: string): void {
  WatchEventEmitter.emit(WatchEventEmitterEvents.WatchSuccess, message);
  // console.log(chalk.bold.green(`SUCCESS: ${message}`));
}
