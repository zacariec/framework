package core

import "strings"

type TokenType int

const (
	TokenText TokenType = iota
	TokenLiquidTag
	TokenLiquidVariable
	TokenImport
	TokenComponentRender
	TokenProps
)

type Token struct {
	Type  TokenType
	Value string
}

func Tokenize(content string) ([]Token, error) {
	var tokens []Token
	lines := strings.Split(content, "\n")
	inProps := false
	var propsContent strings.Builder
	var propsName string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		if inProps {
			if trimmedLine == "{% endprops %}" {
				inProps = false
				tokens = append(tokens, Token{Type: TokenProps, Value: propsName + "\n" + propsContent.String()})
				propsContent.Reset()
			} else {
				propsContent.WriteString(line + "\n")
			}
		} else if strings.HasPrefix(trimmedLine, "{% props ") && strings.HasSuffix(trimmedLine, "%}") {
			inProps = true
			propsName = strings.TrimPrefix(trimmedLine, "{% props ")
			propsName = strings.TrimSuffix(propsName, " %}")
		} else if strings.HasPrefix(trimmedLine, "{% import") && strings.HasSuffix(trimmedLine, "%}") {
			tokens = append(tokens, Token{Type: TokenImport, Value: trimmedLine})
		} else if strings.HasPrefix(trimmedLine, "{{") && strings.HasSuffix(trimmedLine, "}}") {
			tokens = append(tokens, Token{Type: TokenComponentRender, Value: trimmedLine})
		} else if strings.HasPrefix(trimmedLine, "{%") {
			tokens = append(tokens, Token{Type: TokenLiquidTag, Value: trimmedLine})
		} else if strings.HasPrefix(trimmedLine, "{{") {
			tokens = append(tokens, Token{Type: TokenLiquidVariable, Value: trimmedLine})
		} else {
			tokens = append(tokens, Token{Type: TokenText, Value: line})
		}
	}

	return tokens, nil
}
