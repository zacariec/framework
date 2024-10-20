package commands

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/cobra"
	"github.com/zacariec/cli/core"
	"github.com/zacariec/cli/shopify"
	"github.com/zacariec/cli/utils"
)

var (
	watchCmd = &cobra.Command{
		Use:    "watch [directory]",
		Short:  "Watch a directory for changes",
		Long:   "Watch the current directory or a specified directory for changes and sync with Shopify theme.",
		Args:   cobra.MaximumNArgs(1),
		PreRun: RequireConfig,
		Run:    runWatch,
	}
	watchDir string
	themeDir string
)

func init() {
	RootCmd.AddCommand(watchCmd)
}

func runWatch(cmd *cobra.Command, args []string) {
	// Use viper to get config values
	// storeURL := viper.GetString("store_url")
	// themeID := viper.GetString("theme_id")
	// accessToken := viper.GetString("access_token")

	var err error
	watchDir = "."

	if len(args) > 0 {
		watchDir = args[0]
	}

	watchDir, err = filepath.Abs(watchDir)
	if err != nil {
		utils.LogError("Error getting absolute path", err)
		os.Exit(1)
	}

	themeDir = filepath.Join(watchDir, "theme")
	if _, err := os.Stat(themeDir); os.IsNotExist(err) {
		utils.LogError("Theme directory does not exist", fmt.Errorf("%s", themeDir))
		os.Exit(1)
	}

	// TODO: Implement Vite || ESBuild?

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		utils.LogError("Error creating watcher", err)
		os.Exit(1)
	}

	defer watcher.Close()

	done := make(chan bool)

	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				handleFileEvent(event)
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				utils.LogError("Watcher error", err)
			}
		}
	}()

	err = filepath.Walk(watchDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return watcher.Add(path)
		}
		return nil
	})

	if err != nil {
		utils.LogError("Error walking directory", err)
		os.Exit(1)
	}

	fmt.Printf("Watching %s for changes...\n", watchDir)

	<-done
}

func handleFileEvent(event fsnotify.Event) {
	// Only process files in the watched directory
	if !strings.HasPrefix(event.Name, themeDir) {
		return
	}

	relativePath, err := filepath.Rel(themeDir, event.Name)
	if err != nil {
		utils.LogError("Error getting relative path", err)
		return
	}

	switch event.Op {
	case fsnotify.Write, fsnotify.Create:
		utils.LogInfo(fmt.Sprintf("File modified: %s", relativePath))
		processAndUploadFile(event.Name)
	case fsnotify.Remove:
		utils.LogInfo(fmt.Sprintf("File removed: %s", relativePath))
		deleteFile(relativePath)
	case fsnotify.Rename:
		utils.LogInfo(fmt.Sprintf("File renamed: %s", relativePath))
		deleteFile(relativePath)
	}
}

func processAndUploadFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		utils.LogError("Error reading file", err)
		return
	}

	var processedContent string
	if filepath.Ext(filePath) == ".liquid" {
		processedContent, err = compileLiquid(string(content))
		if err != nil {
			log.Printf("Error compiling Liquid file %s: %v\n", filePath, err)
			return
		}
	} else {
		processedContent = string(content)
	}

	log.Println(processedContent)

	relativePath, _ := filepath.Rel("theme", filePath)
	err = shopify.UploadFile(Config, relativePath, processedContent)

	if err != nil {
		utils.LogError("Error uploading file", err)
		return
	}

	utils.LogInfo(fmt.Sprintf("Successfully processed and uploaded %s", relativePath))
}

func compileLiquid(content string) (string, error) {
	tokens, err := core.Tokenize(content)
	if err != nil {
		return "", fmt.Errorf("error tokenizing: %v", err)
	}

	ast, err := core.Parse(tokens)
	if err != nil {
		return "", fmt.Errorf("error parsing: %v", err)
	}

	Config.Set("development", true)
	compiledContent, err := core.Compile(ast, Config)
	if err != nil {
		return "", fmt.Errorf("error compiling: %v", err)
	}

	return compiledContent, nil
}

func deleteFile(relativePath string) {
	err := shopify.DeleteFile(Config, relativePath)
	if err != nil {
		utils.LogError("Error deleting file", err)
		return
	}

	utils.LogInfo(fmt.Sprintf("Successfully processed and uploaded %s", relativePath))
}

// func compileFile(filePath string) {
// 	content, err := compiler.ReadFile(filePath)

// 	if err != nil {
// 		log.Printf("Error reading file %s: %v\n", filePath, err)
// 		return
// 	}

// 	tokens, err := compiler.Tokenize(content)
// 	if err != nil {
// 		log.Printf("Error tokenizing file %s: %v\n", filePath, err)
// 		return
// 	}

// 	ast, err := compiler.Parse(tokens)
// 	if err != nil {
// 		log.Printf("Error parsing file %s: %v\n", filePath, err)
// 		return
// 	}

// 	compiledContent, err := compiler.Compile(ast, Config)
// 	if err != nil {
// 		log.Printf("Error compiling file %s: %v\n", filePath, err)
// 		return
// 	}

// 	outputPath := Config.GetString("output_dir")
// 	if outputPath == "" {
// 		outputPath = "."
// 	}

// 	outputFile := filepath.Join(outputPath, filepath.Base(filePath)+".compiled")

// 	err = compiler.WriteFile(outputFile, compiledContent)
// 	if err != nil {
// 		log.Printf("Error writing compiled file %s: %v\n", outputFile, err)
// 		return
// 	}

// 	fmt.Printf("Successfully compiled %s to %s\n", filePath, outputFile)
// }
