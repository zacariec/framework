import { Command } from 'commander';
import type { PluginOption, UserConfig as ViteUserConfig } from 'vite';
import type { WebSocketServer, WebSocket } from 'ws';
import { ShopifyAPI } from '../shopify/api.js';

export enum TokenType {
  TEXT = 'TEXT',
  COMMENT = 'COMMENT',
  LIQUID_TAG = 'LIQUID_TAG',
  LIQUID_VARIABLE = 'LIQUID_VARIABLE',
  IMPORT = 'IMPORT',
  IMPORT_NAMED = 'IMPORT_NAMED',
  PROPS = 'PROPS_START',
  PROPS_END = 'PROPS_END',
  PROPS_CONTENT = 'PROPS_CONTENT',
  USE = 'USE',
  HTML = 'HTML',
}

export interface Token {
  type: TokenType;
  value: string;
  attributes?: Record<string, string>;
  line?: number;
  column?: number;
  hasOpeningHyphen?: boolean;
  hasClosingHyphen?: boolean;
  filepath?: string;
}

export type NodeType =
  | 'IMPORT_NAMED'
  | 'IMPORT'
  | 'PROPS'
  | 'USE'
  | 'TEXT'
  | 'LIQUID_TAG'
  | 'LIQUID_VARIABLE'
  | 'HTML'
  | 'ROOT';

export interface BaseASTNode {
  type: NodeType;
  line?: number;
  column?: number;
  value?: string;
}

export interface ImportNamedNode extends BaseASTNode {
  name: string;
  path: string;
  isNamed: boolean;
  names?: string[];
  attributes?: {
    imports?: string[];
    filepath?: string;
  };
}

export interface ImportNode extends ImportNamedNode {}

export interface PropsNode extends BaseASTNode {
  name: string;
  content: string;
}

export interface UseNode extends BaseASTNode {
  component: string;
  props?: string;
  load?: 'client' | 'server';
  library?: string;
  name?: string;
  attributes: {
    filepath: string;
  };
}

export interface TextNode extends BaseASTNode {
  value: string;
}

export interface LiquidNode extends BaseASTNode {
  hasOpeningHyphen?: boolean;
  hasClosingHyphen?: boolean;
}

export interface HTMLNode extends BaseASTNode {}

export type ASTNode =
  | ImportNamedNode
  | ImportNode
  | PropsNode
  | UseNode
  | TextNode
  | LiquidNode
  | HTMLNode;

export interface RootNode {
  type: NodeType;
  children: ASTNode[];
}

// Utility types
export interface ViteServerConfig {
  root: string;
  base: string;
  server: {
    middlewareMode: boolean;
  };
}

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
}

export type BuildCommandOptions = CommandOptions;
export type WatchCommandOptions = CommandOptions;
export type DeployCommandOptions = CommandOptions;
export type DownloadCommandOptions = CommandOptions;

export interface ShopifyEnvironmentConfig {
  themeId: number;
  shopifyUrl: string;
  accessToken: string;
  ignores?: string[];
}

export interface FrameworkEnvironmentConfig extends ShopifyEnvironmentConfig {
  input?: string;
  output?: string;
  viteAssetDirectory?: string;
  rateLimit?: number;
  plugins?: PluginOption[];
  adapters?: unknown[]; // implement false SSR for frameworks.
}

export interface FrameworkConfig {
  port?: number;
  vitePort?: number;
  environments: Record<string, FrameworkEnvironmentConfig>;
}

export interface ShopifyConfig {
  themeId: number;
  shopifyUrl: string;
  accessToken: string;
}

export interface ThemeInfo {
  id: number;
  name: string;
}

export interface GlobalConfig {
  command: Command;
  // Framework configuration (from framework.config.*)
  frameworkConfig: FrameworkConfig;

  // Environment
  environment: string;
  isDevelopment: boolean;

  // Paths
  rootPath: string;
  inputPath: string;
  outputPath: string;
  assetsPath: string;
  srcPath: string;

  // Theme structure paths
  layoutsPath: string;
  sectionsPath: string;
  snippetsPath: string;
  templatesPath: string;
  configPath: string;

  // Server configuration
  websocketServer: WebSocketServer;
  ws: WebSocket;
  port: number;
  vitePort: number;
  viteServerUrl: string;

  // Shopify configuration
  shopify: {
    themeId: number;
    shopifyUrl: string;
    accessToken: string;
    ignores: string[];
    apiVersion: string;
    storeName: string;
  };
  shopifyClient: ShopifyAPI;
  // Build configuration
  timestamp: number;
  buildId: string;

  // Cache and temporary storage
  cache: {
    compiledTemplates: Map<string, string>;
    processedAssets: Set<string>;
  };
}

export type LogType = 'info' | 'warning' | 'success' | 'error' | 'other';
export type LogState = {
  message: string;
  type: LogType;
};

export type ThemeFileUtf8 = {
  filename: string;
  content: string;
};

export type ThemeFileBase64 = {
  filename: string;
  contentBase64: string;
};

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var config: GlobalConfig;
}
