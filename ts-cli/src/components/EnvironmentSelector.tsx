import React from 'react';
import { Box, Newline, Text } from 'ink';
import SelectInput from 'ink-select-input';
import * as emoji from 'node-emoji';

import type { Item } from 'node_modules/ink-select-input/build/SelectInput.js';
import type { FrameworkEnvironmentConfig } from '../types/types.js';
import { useFrameworkStore } from '@constants/stores.js';

type Props = {
  environments: Record<string, FrameworkEnvironmentConfig>;
};

const Indicator = ({ isSelected }: { isSelected?: boolean }) => {
  if (!isSelected) {
    return <></>;
  }

  return <Text>{emoji.get(':point_right:')} </Text>;
};

export const EnvironmentSelector = ({ environments }: Props) => {
  const setEnvironment = useFrameworkStore(({ setEnvironment }) => setEnvironment);

  const handleSelect = (environment: Item<FrameworkEnvironmentConfig>) => {
    setEnvironment({
      key: environment.key as string,
      environment: environment.value,
    });
  };

  const items = Object.keys(environments).map((key) => {
    const environment = environments[key];
    return {
      key: key,
      label: `${key.toUpperCase()}\n└─ ${environment?.shopifyUrl} (Theme ID: ${environment?.themeId})`,
      value: environment,
    };
  });

  return (
    <Box flexDirection="column">
      <Text color="yellowBright">Select Environment to {globalThis.config.command.name()}:</Text>
      <Newline />
      <SelectInput items={items} onSelect={handleSelect} indicatorComponent={Indicator} />
      <Newline />
      <Text color="gray">↑/↓ to navigate, enter to select, esc or q to exit</Text>
    </Box>
  );
};
