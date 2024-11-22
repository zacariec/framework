import React, { useContext } from 'react';
import { Box, Newline, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import * as emoji from 'node-emoji';

import type { Item } from 'node_modules/ink-select-input/build/SelectInput.js';
import type { FrameworkEnvironmentConfig } from '../types/types.js';
import { WatchContext } from '@commands/watch/watch.js';

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
  const { state, setState } = useContext(WatchContext);

  const handleSelect = (environment: Item<FrameworkEnvironmentConfig>) => {
    setState({
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
      <Text>Select Environment to Watch:</Text>
      <Newline />
      <SelectInput items={items} onSelect={handleSelect} indicatorComponent={Indicator} />
      <Newline />
      <Text color="gray">↑/↓ to navigate, enter to select, esc or q to exit</Text>
    </Box>
  );
};
