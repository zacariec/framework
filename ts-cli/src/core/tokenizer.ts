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

    // Handle Liquid tags (both with and without hyphens)
    if (
      char === '{' &&
      (content[current + 1] === '%' || content.slice(current + 1, current + 3) === '%-')
    ) {
      let value = '';
      let hasOpeningHyphen = false;
      let hasClosingHyphen = false;

      current += 2; // Skip '{%'

      // Check and track opening hyphen
      if (content[current - 1] === '-') {
        hasOpeningHyphen = true;
        current++;
      }

      // Skip whitespace
      while (content[current] === ' ') current++;

      // Check for import statement
      if (
        content.slice(current, current + 6) === 'import' ||
        content.slice(current, current + 7) === 'import '
      ) {
        // ... existing import handling code ...
        continue;
      }

      // Check for props
      if (content.slice(current, current + 5) === 'props') {
        // ... existing props handling code ...
        continue;
      }

      // Check for use statement
      if (content.slice(current, current + 3) === 'use') {
        // ... existing use handling code ...
        continue;
      }

      // Regular Liquid tag
      while (
        current < content.length &&
        !(content[current] === '%' || (content[current] === '-' && content[current + 1] === '%'))
      ) {
        value += content[current];
        current++;
      }

      // Check and track closing hyphen
      if (content[current] === '-') {
        hasClosingHyphen = true;
        current++;
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

    // Handle Liquid variables (both with and without hyphens)
    if (
      char === '{' &&
      (content[current + 1] === '{' || content.slice(current + 1, current + 3) === '{-')
    ) {
      let value = '';
      let hasOpeningHyphen = false;
      let hasClosingHyphen = false;

      current += 2; // Skip '{{'

      // Check and track opening hyphen
      if (content[current - 1] === '-') {
        hasOpeningHyphen = true;
        current++;
      }

      while (
        (current < content.length &&
          !(
            content[current] === '}' ||
            (content[current] === '-' && content[current + 1] === '}')
          )) ||
        (content[current] === '}' && content[current + 1] !== '}')
      ) {
        value += content[current];
        current++;
      }

      // Check and track closing hyphen
      if (content[current] === '-') {
        hasClosingHyphen = true;
        current++;
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
      !(
        char === '{' &&
        (content[current + 1] === '%' ||
          content[current + 1] === '{' ||
          content.slice(current + 1, current + 3) === '%-' ||
          content.slice(current + 1, current + 3) === '{-')
      )
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
