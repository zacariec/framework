import { TokenType } from '../types';

import type { ASTNode, ImportNode, RootNode, Token } from '../types';

/**
 * Parses an array of tokens into an Abstract Syntax Tree (AST).
 * 
 * @param {Token[]} tokens - An array of tokens to be parsed.
 * @returns {ASTNode} The root node of the resulting Abstract Syntax Tree.
 * 
 * @description
 * This function creates a simple AST structure from the given tokens.
 * It creates a root node of type ROOT and adds each token as a child node.
 * Each child node preserves the type and value of its corresponding token.
 * 
 * @example
 * const tokens = [
 *   { type: TokenType.TEXT, value: 'Hello' },
 *   { type: TokenType.VARIABLE, value: '{{ name }}' }
 * ];
 * const ast = parse(tokens);
 * console.log(ast);
 * // Output:
 * // {
 * //   type: TokenType.ROOT,
 * //   value: '',
 * //   children: [
 * //     { type: TokenType.TEXT, value: 'Hello' },
 * //     { type: TokenType.VARIABLE, value: '{{ name }}' }
 * //   ]
 * // }
 */
export function parse(tokens: Token[]): RootNode {
  const root: RootNode = { type: 'ROOT', children: [] };

  root.children = tokens.map((token): ASTNode => {
    switch (token.type) {
      case TokenType.IMPORT:
        return {
          type: 'IMPORT',
          value: token.value,
          attributes: token.attributes || [],
        } as ImportNode;
      case TokenType.TEXT:
        return { type: 'TEXT', value: token.value };
      case TokenType.LIQUID_TAG:
        return { type: 'LIQUID_TAG', value: token.value };
      case TokenType.LIQUID_VARIABLE:
        return { type: 'LIQUID_VARIABLE', value: token.value };
      case TokenType.COMPONENT_RENDER:
        return { type: 'COMPONENT_RENDER', value: token.value };
      case TokenType.PROPS:
        return { type: 'PROPS', value: token.value };
      default:
        throw new Error(`Unsupported token type: ${token}`);
    }
  });

  return root;
}
