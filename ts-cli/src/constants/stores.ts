import { create } from 'zustand';

import type { FrameworkEnvironmentConfig } from '../types/types.js';

type State = {
  environment: FrameworkEnvironmentConfig;
  key: string;
};

type FrameworkStore = {
  environment: FrameworkEnvironmentConfig;
  key: string;
  setEnvironment: (arg0: State) => void;
};

export const useFrameworkStore = create<FrameworkStore>((set) => ({
  key: '',
  environment: {
    themeId: 0,
    shopifyUrl: '',
    accessToken: '',
  },
  setEnvironment: ({ environment, key }) => set(() => ({
    environment,
    key,
  })),
}));

