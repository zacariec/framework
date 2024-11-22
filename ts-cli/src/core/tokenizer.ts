import { Token, TokenType } from '../types/types.js';

export function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  let current = 0;
  let line = 1;
  let column = 0;

  while (current < content.length) {
    let char = content[current];

    // Handle line and column tracking
    if (char === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }

    // Handle Liquid tags
    if (char === '{' && content[current + 1] === '%') {
      let value = '';
      let hasOpeningHyphen = false;
      let hasClosingHyphen = false;

      current += 2; // Skip '{%'

      // Check for opening hyphen
      if (content[current] === '-') {
        hasOpeningHyphen = true;
        current++; // Skip the hyphen
      }

      // Skip whitespace
      while (content[current] === ' ') current++;

      // Check for import statement
      if (
        content.slice(current, current + 6) === 'import' ||
        content.slice(current, current + 7) === 'import '
      ) {
        current += 6;
        let importStatement = '';
        const attributes: Record<string, any> = {
          imports: [],
          filepath: '',
        };
        // Collect the entire import statement
        while (content[current] !== '%') {
          importStatement += content[current];
          current++;
        }
        // Parse import statement
        const importParts = importStatement.trim().split(/\s+from\s+/);
        if (importParts.length === 2) {
          const componentName = importParts[0].trim();
          const filepath = importParts[1].trim().replace(/['"]/g, '');
          attributes.imports.push(componentName);
          attributes.filepath = filepath;
          tokens.push({
            type: TokenType.IMPORT,
            value: importStatement.trim(),
            attributes,
            line,
            column,
          });
        } else if (
          importStatement.trim().startsWith("'") ||
          importStatement.trim().startsWith('"')
        ) {
          // Handle direct file import (e.g., import '../src/mycss.css')
          attributes.filepath = importStatement.trim().replace(/['"]/g, '');
          tokens.push({
            type: TokenType.IMPORT,
            value: importStatement.trim(),
            attributes,
            line,
            column,
          });
        } else {
          // Handle invalid import statement
          tokens.push({
            type: TokenType.INVALID_IMPORT,
            value: importStatement.trim(),
            line,
            column,
          });
        }
        current += 2; // Skip %}
        continue;
      }

      // Check for use statement
      if (content.slice(current, current + 3) === 'use') {
        current += 3;
        const attributes: Record<string, string> = {};
        let useStatement = '';
        while (content[current] !== '%') {
          if (content[current] === '|') {
            current++; // Skip the pipe
            let attrString = '';

            while (
              current < content.length &&
              content[current] !== '%' &&
              content[current] !== '|'
            ) {
              attrString += content[current];
              current++;
            }

            const colonIndex = attrString.indexOf(':');

            if (colonIndex !== -1) {
              const key = attrString
                .slice(0, colonIndex)
                .trim()
                .replace(/^['"]|['"]/g, '');
              const value = attrString
                .slice(colonIndex + 1)
                .trim()
                .replace(/^['"]|['"]/g, '');

              attributes[key] = value;
            }
          } else {
            useStatement += content[current];
            current++;
          }
        }

        tokens.push({
          type: TokenType.USE,
          value: useStatement.trim(),
          attributes,
          line,
          column,
        });
        current += 2; // Skip %}
        continue;
      }

      // Check for props
      if (content.slice(current, current + 5) === 'props') {
        current += 5;
        let propsName = '';
        while (content[current] !== '%') {
          propsName += content[current];
          current++;
        }
        tokens.push({
          type: TokenType.PROPS,
          value: propsName.trim(),
          line,
          column,
        });
        current += 2; // Skip %}
        continue;
      }

      // Collect the tag content for regular Liquid tags
      while (current < content.length) {
        if (content[current] === '%' && content[current + 1] === '}') break;
        if (content[current] === '-' && content[current + 1] === '%') {
          hasClosingHyphen = true;
          break;
        }
        value += content[current];
        current++;
      }

      // Handle closing hyphen
      if (hasClosingHyphen) {
        current++; // Skip the hyphen
      }

      tokens.push({
        type: TokenType.LIQUID_TAG,
        value: value.trim(),
        line,
        column,
        hasOpeningHyphen,
        hasClosingHyphen,
      });

      current += 2; // Skip %}
      continue;
    }

    // Rest of the tokenizer remains the same...
    // Handle Liquid variables
    if (char === '{' && content[current + 1] === '{') {
      let value = '';
      let hasOpeningHyphen = false;
      let hasClosingHyphen = false;

      current += 2; // Skip '{{'

      // Check for opening hyphen
      if (content[current] === '-') {
        hasOpeningHyphen = true;
        current++; // Skip the hyphen
        // Skip whitespace after hyphen
        while (content[current] === ' ') current++;
      }

      // Collect the variable content
      while (current < content.length) {
        if (content[current] === '}' && content[current + 1] === '}') break;
        if (content[current] === '-' && content[current + 1] === '}') {
          hasClosingHyphen = true;
          break;
        }
        value += content[current];
        current++;
      }

      // Handle closing hyphen
      if (hasClosingHyphen) {
        current++; // Skip the hyphen
      }

      tokens.push({
        type: TokenType.LIQUID_VARIABLE,
        value: value.trim(),
        line,
        column,
        hasOpeningHyphen,
        hasClosingHyphen,
      });

      current += 2; // Skip }}
      continue;
    }

    // Handle text
    let text = '';
    while (
      current < content.length &&
      !(char === '{' && (content[current + 1] === '%' || content[current + 1] === '{'))
    ) {
      text += char;
      current++;
      char = content[current];
    }

    if (text) {
      tokens.push({
        type: TokenType.TEXT,
        value: text,
        line,
        column,
      });
    }
  }

  return tokens;
}
