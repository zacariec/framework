import path from 'node:path';
import { build } from 'vite';

import type { ASTNode, RootNode } from '../types/types.js';

// TODO: Make sure we're not creating a script for a default/named import.

async function compileWithVite(filePath: string, isCSS: boolean = false) {
  const { rootPath } = globalThis.config;

  try {
    const result = await build({
      root: rootPath,
      build: {
        write: false,
        minify: true,
        cssMinify: true,
        rollupOptions: {
          input: filePath,
          output: {
            format: 'es',
            entryFileNames: '[name].js',
            assetFileNames: '[name].css',
          },
        },
      },
      logLevel: 'error',
    });

    // build() returns an array of outputs
    if (Array.isArray(result)) {
      const { output } = result[0];
      // Find the relevant chunk (CSS or JS)
      // eslint-disable-next-line no-shadow
      const chunk = output.find((chunk) =>
        isCSS
          ? chunk.type === 'asset' && chunk.fileName.endsWith('.css')
          : chunk.type === 'chunk' && chunk.type === 'chunk',
      );

      if (chunk) {
        return chunk.type === 'asset' ? chunk.source : chunk.code;
      }
    }

    throw new Error(`No ${isCSS ? 'CSS' : 'JS'} output found`);
  } catch (error) {
    console.error(`Error compiling ${filePath}:`, error);
    return null;
  }
}

function compileNode(node: ASTNode): Promise<string> {
  switch (node.type) {
    case 'IMPORT': {
      const { isDevelopment, viteServerUrl } = globalThis.config;
      const ext = node.path.split('.').pop();

      // Skip component imports as they're handled by the framework-island
      if (node.isNamed) {
        return Promise.resolve('');
      }

      // Handle CSS files
      if (ext === 'css') {
        if (isDevelopment) {
          return Promise.resolve(`<link rel="stylesheet" href="${viteServerUrl}${node.path}">`);
        }
        // In production, compile and inline the CSS
        return compileWithVite(node.path, true).then((css) => {
          if (!css) return '<!-- Error processing CSS file -->';
          return `<style>${css}</style>`;
        });
      }

      // Handle TypeScript/JavaScript files
      if (ext === 'ts' || ext === 'js') {
        const attrs = node.attributes || {};
        const attrString = Object.entries(attrs)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ');

        if (isDevelopment) {
          return Promise.resolve(
            `<script type="module" ${attrString} src="${viteServerUrl}${node.path}"></script>`,
          );
        }

        // In production, compile and inline the JS
        return compileWithVite(node.path).then((js) => {
          if (!js) return '<!-- Error processing JS file -->';
          return `<script type="module" ${attrString}>${js}</script>`;
        });
      }

      return Promise.resolve('');
    }

    case 'PROPS': {
      // Props are used directly in the component, no need to output anything
      return Promise.resolve('');
    }

    case 'USE': {
      const { isDevelopment, viteServerUrl } = globalThis.config;
      const componentName = node.name || node.component.toLowerCase();
      const fileparts = node?.attributes?.filepath?.split('/');
      const assetPath = isDevelopment
        ? `${viteServerUrl}/${fileparts?.at(fileparts?.length - 1)}`
        : `{{ '${node.component}.js' | asset_url }}`;

      return Promise.resolve(`<framework-island 
  name="${componentName}" 
  asset="${assetPath}" 
  load="${node.load?.replace(/'/gm, '')}" 
  library="${node.library?.replace(/'/gm, '')}">
  <${componentName}${node.props ? ` props='${node.props}'` : ''}></${componentName}>
</framework-island>`);
    }

    case 'LIQUID_TAG': {
      return Promise.resolve(`{% ${node.value} %}`);
    }

    case 'LIQUID_VARIABLE': {
      return Promise.resolve(`{{ ${node.value} }}`);
    }

    case 'HTML': {
      return Promise.resolve(node.value);
    }

    case 'TEXT': {
      return Promise.resolve(node.value);
    }

    default:
      throw new Error(`Unknown node type: ${(node as ASTNode).type}`);
  }
}

/**
 * Compiles an AST into the final output string
 */
export async function compile(ast: RootNode): Promise<string> {
  // First pass: collect all props and imports
  const props = new Map<string, string>();
  const imports = new Set<string>();

  ast.children.forEach((node) => {
    if (node.type === 'PROPS') {
      props.set(node.name, node.content);
    }
    if (node.type === 'IMPORT' && !node.isNamed) {
      imports.add(node.path);
    }
  });

  // Second pass: compile nodes
  const compiledNodes = await Promise.all(
    ast.children.map(async (node) => {
      // If it's a USE node, check if we have props for it
      if (node.type === 'USE' && node.props) {
        const propsContent = props.get(node.props);
        if (propsContent) {
          // Replace the props reference with the actual content
          return compileNode({
            ...node,
            props: propsContent,
          });
        }
      }
      return compileNode(node);
    }),
  );

  return compiledNodes.join('');
}

