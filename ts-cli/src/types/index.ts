import type { UserConfig as ViteConfig } from 'vite';

import { createShopifyAPI } from '../shopify/api';

export interface ShopifyConfig {
  storeUrl: string;
  themeId: number;
  accessToken: string;
}

export interface CompilerConfig {
  development: boolean;
  viteServerURL?: string;
  basePath?: string;
}

export enum TokenType {
  TEXT = 'TEXT',
  LIQUID_TAG = 'LIQUID_TAG',
  LIQUID_VARIABLE = 'LIQUID_VARIABLE',
  IMPORT = 'IMPORT',
  PROPS = 'PROPS',
  COMPONENT_RENDER = 'COMPONENT_RENDER',
  ROOT = 'ROOT',
}

export type Token =
  | {
      type:
        | TokenType.TEXT
        | TokenType.LIQUID_TAG
        | TokenType.LIQUID_VARIABLE
        | TokenType.COMPONENT_RENDER
        | TokenType.PROPS;
      value: string;
    }
  | { type: TokenType.IMPORT; value: string; attributes: string[] };

export interface BaseASTNode {
  type: string;
  value?: string;
  // eslint-disable-next-line no-use-before-define
  children?: ASTNode[];
}

export interface TextNode extends BaseASTNode {
  type: 'TEXT';
  value: string;
}

export interface LiquidTagNode extends BaseASTNode {
  type: 'LIQUID_TAG';
  value: string;
}

export interface LiquidVariableNode extends BaseASTNode {
  type: 'LIQUID_VARIABLE';
  value: string;
}

export interface ComponentRenderNode extends BaseASTNode {
  type: 'COMPONENT_RENDER';
  value: string;
}

export interface PropsNode extends BaseASTNode {
  type: 'PROPS';
  value: string;
}

export interface ImportNode extends BaseASTNode {
  type: 'IMPORT';
  value: string;
  attributes: string[];
}

export type ASTNode =
  | TextNode
  | LiquidTagNode
  | LiquidVariableNode
  | ComponentRenderNode
  | PropsNode
  | ImportNode;

export interface RootNode extends BaseASTNode {
  type: 'ROOT';
  children: ASTNode[];
}

export interface ThemeInfo {
  name: string;
  id: string;
}

export type FileChangeType = 'add' | 'change';

export type ShopifyAPI = ReturnType<typeof createShopifyAPI>;

export interface EnvironmentConfig {
  themeId: number;
  accessToken: string;
  shopifyUrl: string;
  storefrontToken?: string;
  input?: string;
  output?: string;
  ignores?: string[] | string;
  viteAssetDirectory?: string; // default: 'src'
}

export interface Config {
  [key: string]: EnvironmentConfig;
}

export interface CommandOptions {
  environment?: string;
  config?: string;
  input?: string;
  output?: string;
  themeId?: string;
  storeUrl?: string;
  accessToken?: string;
  ignore?: string;
  port?: number;
}

export type BuildCommandOptions = CommandOptions;
export type WatchCommandOptions = CommandOptions;
export type DeployCommandOptions = CommandOptions;

export interface FrameworkConfig {
  vite?: ViteConfig;
  framework: {
  port?: number; // default 3111
    cli?: {
      defaultEnvironment?: string;
    };
    environments: Record<string, EnvironmentConfig>;
  };
}
