package core

import (
	"os"
)

func ReadFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)

	if err != nil {
		return "", err
	}

	return string(content), nil
}

func WriteFile(filePath string, content string) error {
	return os.WriteFile(filePath, []byte(content), 0644)
}
