/* eslint-disable prefer-destructuring */
import { LogError } from '@utils/logger.js';
import { Token, TokenType, RootNode, ASTNode, ImportNode, ImportNamedNode, PropsNode, UseNode, LiquidTagNode, LiquidVariableNode, HtmlNode, TextNode } from '../types/types.js';

export class ASTRootNode implements RootNode {
  type: 'ROOT';
  children: ASTNode[];

  constructor(children: ASTNode[]) {
    this.type = 'ROOT';
    this.children = children;
  }
}

export class Parser {
  private ast: RootNode;
  private current: number;

  constructor() {
    this.ast = new ASTRootNode([]);
    this.current = 0;
  }

  public parse(tokens: Token[]): RootNode {
    this.current = 0;
    this.ast = new ASTRootNode([]);

    while (this.current < tokens.length) {
      const token = tokens[this.current];

      switch (token.type) {
        case TokenType.IMPORT:
          this.handleImportToken(token);
          break;
        case TokenType.IMPORT_NAMED:
          this.handleNamedImportToken(token);
          break;
        case TokenType.PROPS:
          this.handlePropsToken(token, tokens);
          break;
        case TokenType.USE:
          this.handleUseToken(token, tokens);
          break;
        case TokenType.LIQUID_TAG:
          this.handleLiquidTagToken(token);
          break;
        case TokenType.LIQUID_VARIABLE:
          this.handleLiquidVariableToken(token);
          break;
        case TokenType.HTML:
          this.handleHtmlToken(token);
          break;
        case TokenType.TEXT:
          this.handleTextToken(token);
          break;
        default:
          break;
      }

      this.current++;
    }

    return this.ast;
  }

  private handleImportToken(token: Token) {
    const matches = token.value.match(/['"]([^'"]+)['"]/);
    if (matches) {
      const path = matches[1];
      this.ast.children.push({
        type: 'IMPORT',
        path,
        isNamed: false,
        attributes: token.attributes,
        line: token.line,
        column: token.column,
      });
    }
  }

  private handleNamedImportToken(token: Token) {
    let name;
    let path;
    let names;
    const defaultImportMatch = token.value.match(/(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultImportMatch) {
      name = defaultImportMatch[1];
      path = defaultImportMatch[2];
    } else {
      const namedImportMatch = token.value.match(/\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/);
      if (namedImportMatch) {
        names = namedImportMatch[1].split(',').map((n) => n.trim());
        path = namedImportMatch[2];
      }
    }
    this.ast.children.push({
      type: 'IMPORT_NAMED',
      name: name || '',
      path: path || '',
      isNamed: true,
      names,
      attributes: token.attributes,
      line: token.line,
      column: token.column,
    });
  }

  private handlePropsToken(token: Token, tokens: Token[]) {
    const name = token.value;
    this.current++;
    let content = '';
    while (this.current < tokens.length && tokens[this.current].type !== TokenType.PROPS_END) {
      if (tokens[this.current].type === TokenType.PROPS_CONTENT) {
        content += tokens[this.current].value;
      }
      this.current++;
    }
    this.ast.children.push({
      type: 'PROPS',
      name,
      content: content.trim(),
      line: token.line,
      column: token.column,
    });
  }

  private handleUseToken(token: Token, tokens: Token[]) {
    const matchingImportToken = tokens.find(
      (importToken) =>
        (importToken.type === TokenType.IMPORT ||
          importToken.type === TokenType.IMPORT_NAMED) &&
        importToken.attributes?.imports?.includes(token.value) === true &&
        importToken,
    );
    if (!matchingImportToken) {
      LogError(
        `Failed to find matching import statement for ${token.value} on line: ${token.line}`,
      );
    }
    const componentName = token.value.trim().replace(/'/gm, '');
    const attributes = token.attributes || {};
    this.ast.children.push({
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
  }

  private handleLiquidTagToken(token: Token) {
    if (
      !token.value.startsWith('import') &&
      !token.value.startsWith('props') &&
      !token.value.startsWith('use')
    ) {
      const value = token.value.trim();
      this.ast.children.push({
        type: 'LIQUID_TAG',
        value,
        line: token.line,
        column: token.column,
        hasOpeningHyphen: token.hasOpeningHyphen || false,
        hasClosingHyphen: token.hasClosingHyphen || false,
      });
    }
  }

  private handleLiquidVariableToken(token: Token) {
    const value = token.value.trim();
    this.ast.children.push({
      type: 'LIQUID_VARIABLE',
      value,
      line: token.line,
      column: token.column,
      hasOpeningHyphen: token.hasOpeningHyphen || false,
      hasClosingHyphen: token.hasClosingHyphen || false,
    });
  }

  private handleHtmlToken(token: Token) {
    this.ast.children.push({
      type: 'HTML',
      value: token.value,
      line: token.line,
      column: token.column,
    });
  }

  private handleTextToken(token: Token) {
    this.ast.children.push({
      type: 'TEXT',
      value: token.value,
      line: token.line,
      column: token.column,
    });
  }
}

