/* eslint-disable prefer-destructuring */
import { LogError } from '@utils/logger.js';
import { Token, TokenType, RootNode } from '../types/types.js';

export function parse(tokens: Token[]): RootNode {
  const ast: RootNode = {
    type: 'ROOT',
    children: [],
  };

  let current = 0;

  while (current < tokens.length) {
    const token = tokens[current];

    switch (token.type) {
      case TokenType.IMPORT:
      case TokenType.IMPORT_NAMED: {
        // ... existing import handling ...
        break;
      }

      case TokenType.PROPS: {
        // ... existing props handling ...
        break;
      }

      case TokenType.USE: {
        // ... existing use handling ...
        break;
      }

      case TokenType.LIQUID_TAG: {
        // Skip certain Liquid tags that we don't need to transform
        if (
          !token.value.startsWith('import') &&
          !token.value.startsWith('props') &&
          !token.value.startsWith('use')
        ) {
          ast.children.push({
            type: 'LIQUID_TAG',
            value: token.value,
            line: token.line,
            column: token.column,
            hasOpeningHyphen: token.hasOpeningHyphen,
            hasClosingHyphen: token.hasClosingHyphen,
          });
        }
        break;
      }

      case TokenType.LIQUID_VARIABLE: {
        ast.children.push({
          type: 'LIQUID_VARIABLE',
          value: token.value,
          line: token.line,
          column: token.column,
          hasOpeningHyphen: token.hasOpeningHyphen,
          hasClosingHyphen: token.hasClosingHyphen,
        });
        break;
      }

      case TokenType.HTML: {
        ast.children.push({
          type: 'HTML',
          value: token.value,
          line: token.line,
          column: token.column,
        });
        break;
      }

      case TokenType.TEXT: {
        ast.children.push({
          type: 'TEXT',
          value: token.value,
          line: token.line,
          column: token.column,
        });
        break;
      }
      default:
        break;
    }

    current++;
  }

  return ast;
}
