import { Command } from 'commander';

import {
  EnvironmentOption,
  ConfigOption,
  InputOption,
  OutputOption,
  ThemeOption,
  StoreOption,
  TokenOption,
  IgnoreOption,
} from '@constants/options.js';

import { DeployCommand } from './deploy.js';

const options = [
  EnvironmentOption,
  ConfigOption,
  InputOption,
  OutputOption,
  ThemeOption,
  StoreOption,
  TokenOption,
  IgnoreOption,
];

const deploy = new Command('deploy')
  .description(
  `
Deploys your built Framework project directly to Shopify. 
This command handles the upload of your processed assets and templates to your specified store, 
ensuring proper placement and configuration of all files.

By default, this command will deploy to the environment specified in your framework.config.ts. 
In interactive mode, you'll be prompted to select your target environment if multiple are configured.
  `,
  )
  .action(DeployCommand);

options.forEach((option) => deploy.addOption(option));

export default deploy;
