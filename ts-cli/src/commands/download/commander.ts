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
import { DownloadCommand } from './download.js';

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

const download = new Command('download')
  .description(
    `
Downloads a theme from your Shopify store for local development. 
This command fetches all theme files, including templates, sections, snippets, and assets, 
organizing them into your local Framework project structure.

If multiple themes exist, you'll be prompted to select one unless specified via command line options. 
By default, downloads to your current working directory.
  `,
  )
  .action(DownloadCommand);

options.forEach((option) => download.addOption(option));

export default download;
