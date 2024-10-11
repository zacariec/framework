package core

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/spf13/viper"
	"github.com/zacariec/cli/constants"
)

func Compile(ast ASTNode, config *viper.Viper) (string, error) {
	var result strings.Builder
	imports := make(map[string]string)
	props := make(map[string]string)

	for _, node := range ast.Children {
		switch node.Type {
		case TokenImport:
			componentName, componentPath := compileImport(node.Value, config)
			imports[componentName] = componentPath
		case TokenComponentRender:
			result.WriteString(compileComponentRender(node.Value, imports, props, config))
		case TokenLiquidTag:
			result.WriteString(node.Value)
		case TokenLiquidVariable:
			result.WriteString(node.Value)
		case TokenText:
			result.WriteString(node.Value)
		case TokenProps:
			name, content := compileProps(node.Value)
			props[name] = content
		}
		result.WriteString("\n")
	}
	return result.String(), nil
}

func compileProps(propsContent string) (string, string) {
	lines := strings.Split(propsContent, "\n")

	if len(lines) < 2 {
		return "", ""
	}

	firstLine := strings.TrimSpace(lines[0])
	name := strings.TrimPrefix(firstLine, "{% props ")
	name = strings.TrimSuffix(name, "%}")

	content := strings.Join(lines[1:len(lines)-1], "\n")
	content = strings.TrimSpace(content)

	processedLines := make([]string, 0, len(lines)-2)
	for _, line := range lines {
		if !strings.Contains(line, "{{") && !strings.Contains(line, "}}") {
			line = strings.Replace(line, "\\", "\\\\", -1)
			line = strings.Replace(line, "\"", "\\\"", -1)
			line = strings.Replace(line, "'", "\\'", -1)
			line = strings.Replace(line, "\n", "\\n", -1)
			line = strings.Replace(line, "\r", "\\r", -1)
			line = strings.Replace(line, "\t", "\\t", -1)
		}
		processedLines = append(processedLines, line)
	}

	return name, strings.Join(processedLines, "\n")
}

func compileImport(importStmt string, config *viper.Viper) (string, string) {
	importStmt = strings.TrimPrefix(importStmt, "{%")
	importStmt = strings.TrimSuffix(importStmt, "%}")
	importStmt = strings.TrimSpace(importStmt)

	parts := strings.Fields(importStmt)
	if len(parts) < 4 {
		return fmt.Sprintf("<!-- Invalid import statement: %s -->", importStmt), ""
	}

	componentName := parts[1]
	componentPath := strings.Trim(parts[3], "\"")

	return componentName, componentPath
}

func compileComponentRender(renderStmt string, imports map[string]string, propsMap map[string]string, config *viper.Viper) string {
	renderStmt = strings.TrimPrefix(renderStmt, "{{")
	renderStmt = strings.TrimSuffix(renderStmt, "}}")
	renderStmt = strings.TrimSpace(renderStmt)

	parts := strings.Split(renderStmt, "|")
	if len(parts) < 1 {
		return fmt.Sprintf("<!-- Invalid component render statement: %s -->", renderStmt)
	}

	componentName := strings.TrimSpace(parts[0])
	componentPath, ok := imports[componentName]
	if !ok {
		return fmt.Sprintf("<!-- Component not imported: %s -->", componentName)
	}

	loadStrategy := "client" // default
	props := "{}"            // default empty JSON object
	framework := ""          // default empty, will be set to a default in the framework-island if not specified

	for _, part := range parts[1:] {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "load:") {
			loadStrategy = strings.Trim(strings.TrimPrefix(part, "load:"), "\"")
		} else if strings.HasPrefix(part, "props:") {
			propsName := strings.TrimSpace(strings.TrimPrefix(part, "props:"))
			if propsContent, ok := propsMap[propsName]; ok {
				props = propsContent
			} else {
				props = fmt.Sprintf("{{ %s | json }}", propsName)
			}
		} else if strings.HasPrefix(part, "framework:") {
			framework = strings.Trim(strings.TrimPrefix(part, "framework:"), "\"")
		}
	}

	assetURL := getAssetURL(componentPath, config)
	customElementName := toCustomElementName(componentName)

	return fmt.Sprintf(`<framework-island name="%s" asset="%s" load="%s" framework="%s">
  <%s props='%s'>
  </%s>
</framework-island>`, customElementName, assetURL, loadStrategy, framework, customElementName, props, customElementName)
}

func toCustomElementName(name string) string {
	var result strings.Builder
	needsDash := true

	for i, r := range name {
		if unicode.IsUpper(r) {
			if i > 0 && needsDash {
				result.WriteRune('-')
			}

			result.WriteRune(unicode.ToLower(r))
			needsDash = false
		} else {
			result.WriteRune(r)
			needsDash = true
		}
	}

	customName := result.String()
	if !strings.Contains(customName, "-") {
		customName = "x-" + customName
	}

	return customName
}

func getAssetURL(componentPath string, config *viper.Viper) string {
	isDevelopment := config.GetBool("development")
	if isDevelopment {
		viteServerURL := config.GetString("vite_server_url")
		if viteServerURL == "" {
			viteServerURL = constants.ViteServerURL
		}
		return fmt.Sprintf("%s/%s", viteServerURL, componentPath)
	}

	return fmt.Sprintf("{{ '%s' | asset_url }}", componentPath)
}
