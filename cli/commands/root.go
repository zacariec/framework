package commands

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/zacariec/cli/utils"
)

var (
	cfgFile         string
	storeURL        string
	themeID         string
	accessToken     string
	Config          *viper.Viper
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
	RootCmd = &cobra.Command{
		Use:   "framework",
		Short: style.Render("Framework is a developer first web framework for building Shopify Liquid Storefronts."),
		Long: style.Render(title, `
Framework is a developer first web framework for building Shopify Liquid Storefronts.
Framework is known for providing a world-class developer experience for Shopify Storefronts,
providing a "framework" layer over the stock Liquid experience. Framework was designed to be
build to server first, fast by default, easy to use, developer-focused and a seamless integration for
existing Shopify Liquid Storefronts.`),
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			initConfig()
		},
	}
)

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.AddConfigPath(".")
		viper.SetConfigName("framework")
		viper.SetConfigType("toml")
	}

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		utils.LogInfo(fmt.Sprintf("Using config file: %s", viper.ConfigFileUsed()))
	}
}

func init() {
	cobra.OnInitialize(initConfig)
	RootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./framework.toml)")
	RootCmd.PersistentFlags().StringVar(&storeURL, "store_url", "", "Shopify store URL")
	RootCmd.PersistentFlags().StringVar(&themeID, "theme_id", "", "Shopify theme ID")
	RootCmd.PersistentFlags().StringVar(&accessToken, "access_token", "", "Shopify access token")

	viper.BindPFlag("store_url", RootCmd.PersistentFlags().Lookup("store_url"))
	viper.BindPFlag("theme_id", RootCmd.PersistentFlags().Lookup("theme_id"))
	viper.BindPFlag("access_token", RootCmd.PersistentFlags().Lookup("access_token"))
}

func RequireConfig(cmd *cobra.Command, args []string) {
	if cmd.Name() == "init" || cmd.Name() == "config" || cmd.Name() == "create" {
		return
	}

	if storeURL == "" || themeID == "" || accessToken == "" {
		utils.LogError("store_url, theme_id, and access_token must be set either in config file or as command line flags", nil)
		os.Exit(1)
	}

	return
}
