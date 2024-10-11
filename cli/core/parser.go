package core

type ASTNode struct {
	Type     TokenType
	Value    string
	Children []ASTNode
}

func Parse(tokens []Token) (ASTNode, error) {
	root := ASTNode{Type: TokenText, Value: ""}
	for _, token := range tokens {
		root.Children = append(root.Children, ASTNode{Type: token.Type, Value: token.Value})
	}

	return root, nil
}
