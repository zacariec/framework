package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile         string
	backgroundColor = lipgloss.Color("#0F172A")
	foregroundColor = lipgloss.Color("#FF7A59")
	title           = `
▗▄▄▄▖▗▄▄▖  ▗▄▖ ▗▖  ▗▖▗▄▄▄▖▗▖ ▗▖ ▗▄▖ ▗▄▄▖ ▗▖ ▗▖
▐▌   ▐▌ ▐▌▐▌ ▐▌▐▛▚▞▜▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌▐▌▗▞▘
▐▛▀▀▘▐▛▀▚▖▐▛▀▜▌▐▌  ▐▌▐▛▀▀▘▐▌ ▐▌▐▌ ▐▌▐▛▀▚▖▐▛▚▖ 
▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌  ▐▌▐▙▄▄▖▐▙█▟▌▝▚▄▞▘▐▌ ▐▌▐▌ ▐▌
`
	style = lipgloss.NewStyle().
		Foreground(foregroundColor).
		Background(backgroundColor).
		PaddingBottom(1).
		PaddingLeft(2).
		PaddingRight(2).
		Width(70).
		Border(lipgloss.DoubleBorder()).
		BorderForeground(foregroundColor).
		BorderBackground(backgroundColor).
		Align(lipgloss.Left)
	rootCmd = &cobra.Command{
		Use:   "framework",
		Short: style.Render("Framework is a developer first web framework for building Shopify Liquid Storefronts."),
		Long: style.Render(title, `
Framework is a developer first web framework for building Shopify Liquid Storefronts.
Framework is known for providing a world-class developer experience for Shopify Storefronts,
providing a "framework" layer over the stock Liquid experience. Framework was designed to be
build to server first, fast by default, easy to use, developer-focused and a seamless integration for
existing Shopify Liquid Storefronts.`),
	}
)

func Execute() error {
	return rootCmd.Execute()
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		cwd, err := os.Executable()
		cobra.CheckErr(err)

		viper.AddConfigPath(cwd)
		viper.SetConfigType("toml")
		viper.SetConfigName(".framework")
	}

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		fmt.Println("Using config file:", viper.ConfigFileUsed())
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./framework.toml)")
}
