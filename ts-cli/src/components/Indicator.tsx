import React from 'react';

import { Text } from 'ink';

import * as emoji from 'node-emoji';


export const Indicator = ({ isSelected }: { isSelected?: boolean }) => {
  if (!isSelected) {
    return <></>;
  }

  return <Text>{emoji.get(':point_right:')} </Text>;
};
