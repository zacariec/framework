import path from 'node:path';
import fs from 'node:fs/promises';

import type { ASTNode, CompilerConfig, ImportNode, RootNode } from '../types';

const importFileExtensions = ['.css', '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

/**
 * Generates the appropriate asset URL based on the development mode and configuration.
 * 
 * @param {string} assetPath - The path of the asset relative to the asset root.
 * @param {CompilerConfig} config - The compiler configuration object.
 * @returns {string} The generated asset URL.
 * 
 * @description
 * In development mode, this function returns a URL pointing to the Vite dev server.
 * In production mode, it returns a Liquid filter expression for resolving the asset URL.
 */
function getAssetURL(assetPath: string, config: CompilerConfig): string {
  if (config.development) {
    return `${config.viteServerURL}/${assetPath}`;
  }

  return `{{ '${assetPath}' | asset_url }}`;
}

/**
 * Converts a camelCase or PascalCase string to a valid custom element name.
 * 
 * @param {string} name - The original name to convert.
 * @returns {string} A valid custom element name.
 * 
 * @description
 * This function performs the following transformations:
 * 1. Inserts a hyphen before each capital letter and converts to lowercase.
 * 2. If the result doesn't include a hyphen, prepends 'x-' to ensure validity.
 * 
 * @example
 * toCustomElementName('MyComponent') // Returns 'my-component'
 * toCustomElementName('header') // Returns 'x-header'
 */
function toCustomElementName(name: string): string {
  let result = name.replace(/([A-Z])/g, '-$1').toLowerCase();
  if (!result.includes('-')) {
    result = `x-${result}`;
  }

  return result;
}

async function compileStyleOrScript(node: ImportNode, config: CompilerConfig): Promise<string> {
  const { value: filePath, attributes } = node;
  const fullPath = path.join(config.basePath || '', filePath);
  const fileContent = await fs.readFile(fullPath, 'utf-8');
  const fileExtension = path.extname(filePath).toLowerCase();

  if (!importFileExtensions.includes(fileExtension)) {
    throw new Error(`Unsupported file type for inline import: ${fileExtension}`);
  }

  if (fileExtension === 'css') {
    return `<style>${fileContent}</style>`;
  } 

  const attribs = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';

  return `<script type="module"${attribs}>${fileContent}</script>`;
}
 
/**
 * Compiles an import statement and extracts the component name and path.
 * 
 * @param {string} importStatement - The import statement to compile.
 * @returns {[string, string]} A tuple containing the component name and path.
 * @throws {Error} If the import statement is invalid.
 * 
 * @description
 * This function parses an import statement of the form:
 * {% import ComponentName from "path/to/component" %}
 * 
 * @example
 * compileImport('{% import MyComponent from "components/MyComponent" %}')
 * // Returns ['MyComponent', 'components/MyComponent']
 */
function compileImport(importValue: string): [string, string] {
  const match = importValue.match(/\{%\s*import\s+(\w+)\s+from\s+["'](.+)["']\s*%\}/);

  if (!match) {
    throw new Error(`Invalid import statement: ${importValue}`);
  }

  return [match[1], match[2]];
}

/**
 * Compiles the props content by extracting the name and the actual content.
 * 
 * @param {string} propsContent - The raw props content to compile.
 * @returns {[string, string]} A tuple containing the props name and the props content.
 * 
 * @description
 * This function expects the propsContent to be in the following format:
 * - The first line contains the name of the props.
 * - The subsequent lines contain the actual props content.
 * 
 * @example
 * compileProps('myProps\n{ "key": "value" }')
 * // Returns ['myProps', '{ "key": "value" }']
 */
function compileProps(propsContent: string): [string, string] {
  const lines = propsContent.split('\n');
  const name = lines[0].trim();
  const content = lines.slice(1).join('\n');

  return [name, content];
}

/**
 * Compiles a component render statement into an HTML string.
 * 
 * @param {string} renderStatement - The render statement to compile.
 * @param {Map<string, string>} imports - A map of component names to their import paths.
 * @param {Map<string, string>} props - A map of props names to their content.
 * @param {CompilerConfig} config - The compiler configuration.
 * @returns {string} The compiled HTML string representing the component render.
 * @throws {Error} If the component is not imported.
 * 
 * @description
 * This function processes a render statement of the form:
 * {% ComponentName | load: "strategy" | props: propsName | framework: "frameworkName" %}
 * It generates a <framework-island> element with the appropriate attributes and content.
 * 
 * @example
 * compileComponentRender('{% MyComponent | load: "lazy" | props: myProps | framework: "react" %}', imports, props, config)
 * // Returns '<framework-island name="my-component" asset="..." load="lazy" framework="react"><my-component props='...'></my-component></framework-island>'
 */
function compileComponentRender(
  renderStatement: string,
  imports: Map<string, string>,
  props: Map<string, string>,
  config: CompilerConfig,
): string {
  const parts = renderStatement
    .slice(2, -2)
    .split('|')
    .map((part) => part.trim());
  const componentName = parts[0];
  const componentPath = imports.get(componentName);

  if (!componentPath) {
    throw new Error(`Component not imported: ${componentName}`);
  }

  let loadStrategy = 'client';
  let propsContent = '{}';
  let framework = '';

  const partProcessors: Record<string, (value: string) => void> = {
    'load:': (value) => {
      loadStrategy = value.replace(/"/g, '');
    },
    'props:': (value) => {
      const propsName = value.trim();
      propsContent = props.get(propsName) || `{{ ${propsName} | json }}`;
    },
    'framework:': (value) => {
      framework = value.replace(/"/g, '');
    },
  };

  parts.slice(1).forEach((part) => {
    const [prefix, ...rest] = part.split(':');
    const processor = partProcessors[`${prefix}:`];
    if (processor) {
      processor(rest.join(':').trim());
    }
  });

  const assetURL = getAssetURL(componentPath, config);
  const customElementName = toCustomElementName(componentName);

  return `<framework-island name="${customElementName}" asset="${assetURL}" load="${loadStrategy}" framework="${framework}">
    <${customElementName} props='${propsContent}'>
    </${customElementName}>
    </framework-island>`;
}

/**
 * Compiles an Abstract Syntax Tree (AST) into a string representation.
 * 
 * @param {ASTNode} ast - The root node of the Abstract Syntax Tree to compile.
 * @param {CompilerConfig} config - The compiler configuration.
 * @returns {string} The compiled string representation of the AST.
 * @throws {Error} If an unknown node type is encountered.
 * 
 * @description
 * This function processes each node in the AST and compiles it based on its type:
 * - IMPORT: Processes import statements and stores them for later use.
 * - COMPONENT_RENDER: Compiles component render statements.
 * - LIQUID_TAG, LIQUID_VARIABLE, TEXT: Passes through these node values directly.
 * - PROPS: Processes and stores props for later use in component renders.
 * 
 * The function maintains internal maps for imports and props to use during compilation.
 * 
 * @example
 * const compiledString = compile(astNode, compilerConfig);
 */
export async function compile(ast: RootNode, config: CompilerConfig): Promise<string> {
  const imports = new Map<string, string>();
  const props = new Map<string, string>();

  const compileNode = async (node: ASTNode): Promise<string> => {
    switch (node.type) {
      case 'IMPORT': {
        if (node.value.match(/\.(css|js|ts|tsx|jsx|mjs|cjs|mts|cts)$/i)) {
          return compileStyleOrScript(node, config);
        }
        const [componentName, componentPath] = compileImport(node.value);
        imports.set(componentName, componentPath);
        return '';
      }
      case 'COMPONENT_RENDER':
        return `${compileComponentRender(node.value, imports, props, config)}\n`;
      case 'LIQUID_TAG':
      case 'LIQUID_VARIABLE':
      case 'TEXT':
        return `${node.value}\n`;
      case 'PROPS': {
        const [propsName, propsContent] = compileProps(node.value);
        props.set(propsName, propsContent);
        return '';
      }
      default:
        throw new Error(`Unknown node type: ${(node as { type: string }).type}`);
    }
  };

  const compiledNodes = await Promise.all(ast.children.map(compileNode));
  return compiledNodes.join('');
}