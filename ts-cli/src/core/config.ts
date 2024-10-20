import type { FrameworkConfig } from "../types";

/**
 * Defines and returns a framework configuration object.
 * 
 * @param {FrameworkConfig} config - The configuration object to be defined.
 * @returns {FrameworkConfig} The same configuration object that was passed in.
 * 
 * @description
 * This function is primarily used for type checking and providing a standardized way
 * to define the framework configuration. It doesn't modify the input but ensures
 * that the provided configuration matches the expected FrameworkConfig type.
 * 
 * @example
 * const myConfig = defineConfig({
 *   // ... configuration properties
 * });
 */
export function defineConfig(config: FrameworkConfig): FrameworkConfig {
	return config;
}