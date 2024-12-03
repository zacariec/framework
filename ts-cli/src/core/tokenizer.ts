import { Token, TokenType } from '../types/types.js';

export class Tokenizer {
  private tokens: Token[];
  private content: string;
  private current: number;
  private line: number;
  private column: number;

  constructor() {
    this.tokens = [];
    this.content = '';
    this.current = 0;
    this.line = 1;
    this.column = 0;
  }

  private handleLineColumnTracking(char: string) {
    if (char === '\n') {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }
  }

  private handleLiquidTags() {
    let value = '';
    let hasOpeningHyphen = false;
    let hasClosingHyphen = false;

    this.current += 2; // Skip '{%'

    // Check for opening hyphen
    if (this.content[this.current] === '-') {
      hasOpeningHyphen = true;
      this.current++; // Skip the hyphen
    }

    // Skip whitespace
    while (this.content[this.current] === ' ') this.current++;

    // Check for import statement
    if (
      this.content.slice(this.current, this.current + 6) === 'import' ||
      this.content.slice(this.current, this.current + 7) === 'import '
    ) {
      this.handleImportStatement();
      return;
    }

    // Check for use statement
    if (this.content.slice(this.current, this.current + 3) === 'use') {
      this.handleUseStatement();
      return;
    }

    // Check for props
    if (this.content.slice(this.current, this.current + 5) === 'props') {
      this.handlePropsStatement();
      return;
    }

    // Collect the tag content for regular Liquid tags
    while (this.current < this.content.length) {
      if (this.content[this.current] === '%' && this.content[this.current + 1] === '}') break;
      if (this.content[this.current] === '-' && this.content[this.current + 1] === '%') {
        hasClosingHyphen = true;
        break;
      }
      value += this.content[this.current];
      this.current++;
    }

    // Handle closing hyphen
    if (hasClosingHyphen) {
      this.current++; // Skip the hyphen
    }

    this.tokens.push({
      type: TokenType.LIQUID_TAG,
      value: value.trim(),
      line: this.line,
      column: this.column,
      hasOpeningHyphen,
      hasClosingHyphen,
    });

    this.current += 2; // Skip %}
  }

  private handleLiquidVariables() {
    let value = '';
    let hasOpeningHyphen = false;
    let hasClosingHyphen = false;

    this.current += 2; // Skip '{{'

    // Check for opening hyphen
    if (this.content[this.current] === '-') {
      hasOpeningHyphen = true;
      this.current++; // Skip the hyphen
      // Skip whitespace after hyphen
      while (this.content[this.current] === ' ') this.current++;
    }

    // Collect the variable content
    while (this.current < this.content.length) {
      if (this.content[this.current] === '}' && this.content[this.current + 1] === '}') break;
      if (this.content[this.current] === '-' && this.content[this.current + 1] === '}') {
        hasClosingHyphen = true;
        break;
      }
      value += this.content[this.current];
      this.current++;
    }

    // Handle closing hyphen
    if (hasClosingHyphen) {
      this.current++; // Skip the hyphen
    }

    this.tokens.push({
      type: TokenType.LIQUID_VARIABLE,
      value: value.trim(),
      line: this.line,
      column: this.column,
      hasOpeningHyphen,
      hasClosingHyphen,
    });

    this.current += 2; // Skip }}
  }

  private handleText() {
    let text = '';
    while (
      this.current < this.content.length &&
      !(this.content[this.current] === '{' && (this.content[this.current + 1] === '%' || this.content[this.current + 1] === '{'))
    ) {
      text += this.content[this.current];
      this.current++;
    }

    if (text) {
      this.tokens.push({
        type: TokenType.TEXT,
        value: text,
        line: this.line,
        column: this.column,
      });
    }
  }

  private handleImportStatement() {
    this.current += 6;
    let importStatement = '';
    const attributes: Record<string, any> = {
      imports: [],
      filepath: '',
    };
    // Collect the entire import statement
    while (this.content[this.current] !== '%') {
      importStatement += this.content[this.current];
      this.current++;
    }
    // Parse import statement
    const importParts = importStatement.trim().split(/\s+from\s+/);
    if (importParts.length === 2) {
      const componentName = importParts[0].trim();
      const filepath = importParts[1].trim().replace(/['"]/g, '');
      attributes.imports.push(componentName);
      attributes.filepath = filepath;
      this.tokens.push({
        type: TokenType.IMPORT_NAMED,
        value: importStatement.trim(),
        attributes,
        line: this.line,
        column: this.column,
      });
    } else if (
      importStatement.trim().startsWith("'") ||
      importStatement.trim().startsWith('"')
    ) {
      // Handle direct file import (e.g., import '../src/mycss.css')
      attributes.filepath = importStatement.trim().replace(/['"]/g, '');
      this.tokens.push({
        type: TokenType.IMPORT,
        value: importStatement.trim(),
        attributes,
        line: this.line,
        column: this.column,
      });
    } else {
      // Handle invalid import statement
      this.tokens.push({
        type: TokenType.INVALID_IMPORT,
        value: importStatement.trim(),
        line: this.line,
        column: this.column,
      });
    }
    this.current += 2; // Skip %}
  }

  private handleUseStatement() {
    this.current += 3;
    const attributes: Record<string, string> = {};
    let useStatement = '';
    while (this.content[this.current] !== '%') {
      if (this.content[this.current] === '|') {
        this.current++; // Skip the pipe
        let attrString = '';

        while (
          this.current < this.content.length &&
          this.content[this.current] !== '%' &&
          this.content[this.current] !== '|'
        ) {
          attrString += this.content[this.current];
          this.current++;
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
        useStatement += this.content[this.current];
        this.current++;
      }
    }

    this.tokens.push({
      type: TokenType.USE,
      value: useStatement.trim(),
      attributes,
      line: this.line,
      column: this.column,
    });
    this.current += 2; // Skip %}
  }

  private handlePropsStatement() {
    this.current += 5;
    let propsName = '';
    while (this.content[this.current] !== '%') {
      propsName += this.content[this.current];
      this.current++;
    }
    this.tokens.push({
      type: TokenType.PROPS,
      value: propsName.trim(),
      line: this.line,
      column: this.column,
    });
    this.current += 2; // Skip %}
  }

  public tokenize(content: string): Token[] {
    this.content = content;
    this.current = 0;
    this.line = 1;
    this.column = 0;
    this.tokens = [];

    while (this.current < this.content.length) {
      const char = this.content[this.current];

      this.handleLineColumnTracking(char);

      if (char === '{' && this.content[this.current + 1] === '%') {
        this.handleLiquidTags();
      } else if (char === '{' && this.content[this.current + 1] === '{') {
        this.handleLiquidVariables();
      } else {
        this.handleText();
      }
    }

    return this.tokens;
  }
}
