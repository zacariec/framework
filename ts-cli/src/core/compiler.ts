import path, { extname } from 'node:path';
import { build } from 'vite';

import { Tokenizer } from './tokenizer.js';
import { ASTRootNode, Parser } from './parser.js';
import { generateViteProductionBuildConfig } from '@constants/vite.js';

import type { ASTNode, ImportNamedNode, ImportNode, LiquidNode, PropsNode, RootNode, TextNode, Token, UseNode } from '../types/types.js';

// TODO: Make sure we're not creating a script for a default/named import.

export class Compiler {
  private tokens: Token[];
  private ast: RootNode;
  private currentFile: string | undefined;
  public tokenizer: Tokenizer;
  public parser: Parser;

  constructor() {
    this.tokenizer = new Tokenizer();
    this.tokens = [];
    this.parser = new Parser();
    this.ast = new ASTRootNode([]);
    this.currentFile;
  }

  private async compileWithVite(filePath: string, isCSS: boolean = false) {
    const { rootPath } = globalThis.config;

    let absolutePath = filePath;

    if (this.currentFile) {
      absolutePath = path.resolve(path.dirname(this.currentFile), filePath);
    }

    try {
      const result = await build(
        generateViteProductionBuildConfig(
          rootPath, 
          absolutePath,
        ),
      );

      if (Array.isArray(result)) {
        const { output } = result[0];
        const chunk = output.find((chunk) =>
          isCSS
            ? chunk.type === 'asset' && chunk.fileName.endsWith('.css')
            : chunk.type === 'chunk' && chunk.type === 'chunk',
        );

        if (chunk) {
          return chunk.type === 'asset' ? chunk.source : chunk.code;
        }

        return;
      }

      if (result.output.length > 0) {
        const chunk = result.output.find((chunk) =>
          isCSS
            ? chunk.type === 'asset' && chunk.fileName.endsWith('.css')
            : chunk.type === 'chunk' && chunk.type === 'chunk',
        );

        if (chunk) {
          return chunk.type === 'asset' ? chunk.source : chunk.code;
        }

        return;

      }

      throw new Error(`No ${isCSS ? 'CSS' : 'JS'} output found`);
    } catch (error) {
      console.error(`Error compiling ${filePath}:`, error);
      return null;
    }
  }

  private normalizePathForVite(path: string): string {
    const currentEnvironment = globalThis.config.environment;
    const { viteAssetDirectory } =
      globalThis.config.frameworkConfig.environments[currentEnvironment];
    const normalizedPath = path.replace(`/${viteAssetDirectory}`, '');

    return globalThis.config.viteServerUrl + normalizedPath;
  }

  private async compileNode(node: ASTNode): Promise<string> {
    switch (node.type) {
      case 'IMPORT_NAMED':
        return this.compileImportNamed(node as ImportNamedNode);
      case 'IMPORT':
        return this.compileImport(node as ImportNode);
      case 'PROPS':
        return this.compileProps(node as PropsNode);
      case 'USE':
        return this.compileUse(node as UseNode);
      case 'LIQUID_TAG':
        return this.compileLiquidTag(node as LiquidNode);
      case 'LIQUID_VARIABLE':
        return this.compileLiquidVariable(node as LiquidNode);
      case 'HTML':
      case 'TEXT':
        return Promise.resolve((node as TextNode).value);
      default:
        throw new Error(`Unknown node type: ${(node as ASTNode).type}`);
    }
  }

  private compileImportNamed(node: ImportNamedNode): Promise<string> {
    return Promise.resolve('');
  }

  private async compileImport(node: ImportNode): Promise<string> {
    const { isDevelopment, viteServerUrl } = globalThis.config;
    const ext = extname(node.path);
    const filepath = this.normalizePathForVite(new URL(node.path, viteServerUrl).pathname);
    const scriptFileExtensions = ['.ts', '.cts', '.mts', '.js', '.mjs', '.cjs'];
    const cssFileExtensions = ['.css', '.scss', '.sass', '.less'];

    if (cssFileExtensions.includes(ext)) {
      return isDevelopment
        ? Promise.resolve(`<link rel="stylesheet" href="${filepath}">`)
        : this.compileCSSProduction(node);
    }

    if (scriptFileExtensions.includes(ext)) {
      return isDevelopment
        ? this.compileScriptDevelopment(node, filepath)
        : this.compileScriptProduction(node);
    }

    return Promise.resolve('');
  }

  private async compileCSSProduction(node: ImportNode): Promise<string> {
    const css = await this.compileWithVite(node.path, true);
    if (!css) {
      // TODO: Add Websocket Logger here as well.
      return Promise.resolve(`<!-- Error processing CSS file -->`);
    }
    return Promise.resolve(`<style>${css}</style>`);
  }

  private compileScriptDevelopment(node: ImportNode, filepath: string): Promise<string> {
    const attributes = node.attributes || {};
    const attributeString = Object.entries(attributes).map(([key, value]) => `${key}="${value}"`);
    return Promise.resolve(`<script ${attributeString} src="${filepath}"></script>`);
  }

  private async compileScriptProduction(node: ImportNode): Promise<string> {
    const attributes = node.attributes || {};
    const attributeString = Object.entries(attributes).map(([key, value]) => `${key}="${value}"`);
    const script = await this.compileWithVite(node.path);
    if (!script) {
      //TODO: Add websocket logger here as well.
      return Promise.resolve('<!-- Error processing Script file -->');
    }
    return Promise.resolve(`<script ${attributeString}>${script}</script>`);
  }

  private compileProps(node: PropsNode): Promise<string> {
    return Promise.resolve('');
  }

  private compileUse(node: UseNode): Promise<string> {
    const { isDevelopment, viteServerUrl } = globalThis.config;
    const componentName = node.name || node.component.toLowerCase();
    const fileparts = node?.attributes?.filepath?.split('/');
    console.warn(node);
    const assetPath = isDevelopment
      ? `${viteServerUrl}/${fileparts?.at(fileparts?.length - 1)}`
      : `{{ '${path.basename(node?.attributes?.filepath).replace(path.extname(node?.attributes?.filepath), '')}.js' | asset_url }}`;

    return Promise.resolve(`<framework-island 
  name="${componentName}" 
  asset="${assetPath}" 
  load="${node.load?.replace(/'/gm, '')}" 
  library="${node.library?.replace(/'/gm, '')}">
  <${componentName}${node.props ? ` props='${node.props}'` : ''}></${componentName}>
</framework-island>`);
  }

  private compileLiquidTag(node: LiquidNode): Promise<string> {
    const openingHyphen = node.hasOpeningHyphen ? '-' : '';
    const closingHyphen = node.hasClosingHyphen ? '-' : '';
    const value = node.value ? node.value.trim() : '';
    return Promise.resolve(`{%${openingHyphen} ${value} ${closingHyphen}%}`);
  }

  private compileLiquidVariable(node: LiquidNode): Promise<string> {
    const openingHyphen = node.hasOpeningHyphen ? '-' : '';
    const closingHyphen = node.hasClosingHyphen ? '-' : '';
    const value = node.value ? node.value.trim() : '';
    return Promise.resolve(`{{${openingHyphen} ${value} ${closingHyphen}}}`);
  }

  public tokenize(content: string) {
    const tokens = this.tokenizer.tokenize(content);

    this.tokens = tokens;

    return this;
  }

  public parse() {
    const ast = this.parser.parse(this.tokens);

    this.ast = ast;

    return this;
  }

  public async compile(currentFile?: string): Promise<string> {
    const props = new Map<string, string>();
    const imports = new Set<string>();

    this.currentFile = currentFile;

    this.ast.children.forEach((node) => {
      if (node.type === 'PROPS') {
        const castedNode = node as PropsNode;
        props.set(castedNode.name, castedNode.content);
      }
      if (node.type === 'IMPORT' && !(node as ImportNode).isNamed) {
        const castedNode = node as ImportNode;
        imports.add(castedNode.path);
      }
    });

    const compiledNodes = await Promise.all(
      this.ast.children.map(async (node) => {
        if (node.type === 'USE' && (node as UseNode).props) {
          const propsContent = props.get(node.props);
          if (propsContent) {
            return this.compileNode({
              ...node,
              props: propsContent,
            });
          }
        }
        return this.compileNode(node);
      }),
    );

    this.tokens = [];
    this.ast = new ASTRootNode([]);
    return compiledNodes.join('');
  }
}

export const compiler = new Compiler();
