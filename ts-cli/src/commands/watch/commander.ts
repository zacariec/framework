import { Command } from 'commander';

import { WatchCommand } from './watch.js';
import { EnvironmentOption, ConfigOption, InputOption, ThemeOption, StoreOption, TokenOption, IgnoreOption } from "@constants/options.js";

const options = [
  EnvironmentOption,
  ConfigOption,
  InputOption,
  ThemeOption,
  StoreOption,
  TokenOption,
  IgnoreOption,
];

const watch = new Command('watch')
  .description('Watch for changes and rebuild the project')
  .action(WatchCommand);

options.forEach((option) => watch.addOption(option));

export default watch;
