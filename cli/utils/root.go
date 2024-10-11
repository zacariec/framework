package utils

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
)

var (
	errorStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#FF0000")).
			Background(lipgloss.Color("#2D2D2D")).
			Padding(0, 1)
	warningStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFA500")).
			Padding(0, 1)
	infoStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#00FF00")).
			Padding(0, 1)
)

func LogError(message string, err error) {
	errorMessage := fmt.Sprintf("ERROR: %s: %v", message, err)
	fmt.Fprintln(os.Stderr, errorStyle.Render(errorMessage))
}

func LogWarning(message string) {
	fmt.Println(warningStyle.Render("WARNING: " + message))
}

func LogInfo(message string) {
	fmt.Println(infoStyle.Render("INFO: " + message))
}
