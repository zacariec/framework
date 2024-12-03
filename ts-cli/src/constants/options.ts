import { Option } from "commander";

export const EnvironmentOption = new Option('-e --environment <env>', 'Specify the environment to use');
export const ConfigOption = new Option('-c --config <path>', 'Specify the config file to use');
export const InputOption = new Option('-i --input <path>', 'Specify the theme directory/input directory');
export const OutputOption = new Option('-o --output <path>', 'Specify the build output directory');
export const ThemeOption = new Option('-t --theme-id <id>', 'Specify the Shopify Theme ID');
export const StoreOption = new Option('-s --store-url <url>', 'Specify the .myshopify URL');
export const TokenOption = new Option('-a --access-token <token>', 'Specify the Shopify Access Token');
export const IgnoreOption = new Option('--ignore <patterns>', 'Specify a comma-seperated list of ignore patterns');
