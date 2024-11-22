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
        const isNamed = token.type === TokenType.IMPORT_NAMED;
        let name;
        let path;
        let names;
        if (isNamed) {
          // Handle named imports like: {MyElement, MyOtherElement} from '../MyElement.ts'
          const matches = token.value.match(/\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
          if (matches) {
            names = matches[1].split(',').map((n) => n.trim());
            path = matches[2];
          }
        } else {
          // Handle default imports like: MyTestComponent from '../MyTestComponent.ts'
          const matches = token.value.match(/([^\s]+)\s+from\s+['"]([^'"]+)['"]/);
          if (matches) {
            name = matches[1];
            path = matches[2];
          }
        }
        ast.children.push({
          type: 'IMPORT',
          name: name || '',
          path: path || '',
          isNamed,
          names,
          attributes: token.attributes,
          line: token.line,
          column: token.column,
        });
        break;
      }

      case TokenType.PROPS: {
        const name = token.value;
        current++;
        // Collect all content until PROPS_END
        let content = '';
        while (current < tokens.length && tokens[current].type !== TokenType.PROPS_END) {
          if (tokens[current].type === TokenType.PROPS_CONTENT) {
            content += tokens[current].value;
          }
          current++;
        }
        ast.children.push({
          type: 'PROPS',
          name,
          content: content.trim(),
          line: token.line,
          column: token.column,
        });
        break;
      }

      case TokenType.USE: {
        // get the matching import token.
        const matchingImportToken = tokens.find(
          (importToken) =>
            (importToken.type === TokenType.IMPORT ||
              importToken.type === TokenType.IMPORT_NAMED) &&
            importToken.attributes?.imports?.includes(token.value) === true &&
            importToken,
        );
        // TODO: Handle error for not being able to find matching import statement
        if (!matchingImportToken) {
          LogError(
            `Failed to find matching import statement for ${token.value} on line: ${token.line}`,
          );
        }
        // Parse component name and attributes
        const componentName = token.value.trim().replace(/'/gm, '');
        const attributes = token.attributes || {};
        ast.children.push({
          type: 'USE',
          component: componentName,
          props: attributes.props,
          load: attributes.load?.replace(/'/gm, '') as 'client' | 'server',
          library: attributes.library?.replace(/'/gm, ''),
          name: attributes.name?.replace(/'/gm, ''),
          line: token.line,
          column: token.column,
          attributes: {
            filepath: matchingImportToken?.attributes?.filepath,
          },
        });
        break;
      }

      case TokenType.LIQUID_TAG: {
        // Skip certain Liquid tags that we don't need to transform
        if (
          !token.value.startsWith('import') &&
          !token.value.startsWith('props') &&
          !token.value.startsWith('use')
        ) {
          // Remove any spaces between the hyphen and the content
          const value = token.value.trim();
          ast.children.push({
            type: 'LIQUID_TAG',
            value,
            line: token.line,
            column: token.column,
            hasOpeningHyphen: token.hasOpeningHyphen || false,
            hasClosingHyphen: token.hasClosingHyphen || false,
          });
        }
        break;
      }

      case TokenType.LIQUID_VARIABLE: {
        // Remove any spaces between the hyphen and the content
        const value = token.value.trim();
        ast.children.push({
          type: 'LIQUID_VARIABLE',
          value,
          line: token.line,
          column: token.column,
          hasOpeningHyphen: token.hasOpeningHyphen || false,
          hasClosingHyphen: token.hasClosingHyphen || false,
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
