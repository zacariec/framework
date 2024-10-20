import { LIQUID_DELIMITERS } from '../constants/constants';
import { TokenType, Token } from '../types';

/**
 * Tokenizes a string content into an array of tokens.
 * 
 * @param {string} content - The string content to be tokenized.
 * @returns {Token[]} An array of tokens extracted from the content.
 * 
 * @description
 * This function processes the input content line by line, identifying different types of tokens:
 * - PROPS: Content between props and endprops tags
 * - IMPORT: Import statements (including CSS and JS/TS imports)
 * - COMPONENT_RENDER: Component render statements
 * - LIQUID_TAG: Liquid tags
 * - LIQUID_VARIABLE: Liquid variables
 * - TEXT: Any other content
 * 
 * The function handles multi-line props by maintaining an internal state (inProps).
 * 
 * @example
 * const content = `
 * {% import 'styles.css' %}
 * {% import 'script.js' | defer | async %}
 * {% import MyComponent from 'components/MyComponent' %}
 * {% props myProps %}
 * { "key": "value" }
 * {% endprops %}
 * {{ myComponent | render: props }}
 * Some text
 * `;
 * const tokens = tokenize(content);
 * console.log(tokens);
 * // Output will be an array of Token objects representing the different parts of the input
 */
export function tokenize(content: string): Token[] {
  let inProps = false;
  let propsContent = '';
  let propsName = '';

  return content.split('\n').reduce((tokens: Token[], line: string) => {
    const trimmedLine = line.trim();

    if (inProps) {
      if (trimmedLine === `${LIQUID_DELIMITERS.TAG_OPEN} endprops ${LIQUID_DELIMITERS.TAG_CLOSE}`) {
        inProps = false;
        tokens.push({ type: TokenType.PROPS, value: `${propsName}\n${propsContent.trim()}` });
        propsContent = '';
      } else {
        propsContent += `${line}\n`;
      }
    } else if (
      trimmedLine.startsWith(`${LIQUID_DELIMITERS.TAG_OPEN} props`) &&
      trimmedLine.endsWith(LIQUID_DELIMITERS.TAG_CLOSE)
    ) {
      inProps = true;
      propsName = trimmedLine
        .slice(LIQUID_DELIMITERS.TAG_OPEN.length + 7, -LIQUID_DELIMITERS.TAG_CLOSE.length)
        .trim();
    } else if (
      trimmedLine.startsWith(`${LIQUID_DELIMITERS.TAG_OPEN} import`) &&
      trimmedLine.endsWith(LIQUID_DELIMITERS.TAG_CLOSE)
    ) {
      const importMatch = trimmedLine.match(/{% import ['"](.+?)['"](\s*\|\s*(.+?))?\s*%}/);
      if (importMatch) {
        const [, filePath, , attributes] = importMatch;
        tokens.push({
          type: TokenType.IMPORT,
          value: filePath,
          attributes: attributes ? attributes.split('|').map(attr => attr.trim()) : []
        });
      } else {
        // Handle component imports
        tokens.push({ type: TokenType.IMPORT, value: trimmedLine, attributes: [] });
      }
    } else if (
      trimmedLine.startsWith(LIQUID_DELIMITERS.OBJECT_OPEN) &&
      trimmedLine.includes('|') &&
      trimmedLine.endsWith(LIQUID_DELIMITERS.OBJECT_CLOSE)
    ) {
      tokens.push({ type: TokenType.COMPONENT_RENDER, value: trimmedLine });
    } else if (trimmedLine.startsWith(LIQUID_DELIMITERS.TAG_OPEN)) {
      tokens.push({ type: TokenType.LIQUID_TAG, value: trimmedLine });
    } else if (trimmedLine.startsWith(LIQUID_DELIMITERS.OBJECT_OPEN)) {
      tokens.push({ type: TokenType.LIQUID_VARIABLE, value: trimmedLine });
    } else if (trimmedLine.length > 0) {
      tokens.push({ type: TokenType.TEXT, value: line });
    }

    return tokens;
  }, []);
}
