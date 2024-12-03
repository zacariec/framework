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
import { BuildCommand } from './build.js';

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

const build = new Command('build')
  .description(
    `
Builds your storefront for deployment to Shopify.
This command processes all Framework-specific features (imports, components, islands) and generates production-ready assets. 
The output includes optimized JavaScript bundles, compiled CSS, and processed Liquid templates.

If running without flags, launches an interactive interface for selecting build options. 
For CI/CD environments, you can specify options via command line flags.
  `,
  )
  .action(BuildCommand);

options.forEach((option) => build.addOption(option));

export default build;
