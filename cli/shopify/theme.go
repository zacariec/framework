package shopify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/spf13/viper"
)

func UploadFile(config *viper.Viper, path string, content string) error {
	query := `
		mutation assetCreate($input: AssetInput!) {
			asset {
				key
			}
			userErrors {
				field
				message
			}
		}
	`

	variables := map[string]interface{}{
		"input": map[string]interface{}{
			"key":     path,
			"content": content,
			"themeId": config.GetString("theme_id"),
		},
	}

	return executeGraphQL(config, query, variables)
}

func DeleteFile(config *viper.Viper, path string) error {
	query := `
		mutation assetDelete($input: AssetDeleteInput!) {
			assetDelete(input: $input) {
				deleteAssetId
				userErrors {
					field
					message
				}
			}
		}
	`

	variables := map[string]interface{}{
		"input": map[string]interface{}{
			"key":     path,
			"themeId": config.GetString("theme_id"),
		},
	}

	return executeGraphQL(config, query, variables)
}

func executeGraphQL(config *viper.Viper, query string, variables map[string]interface{}) error {
	shopifyURL := fmt.Sprintf("https://%s/admin/api/2023-04/graphql.json", config.GetString("shopify_store_url"))
	accessToken := config.GetString("shopify_access_token")

	payload := map[string]interface{}{
		"query":     query,
		"variables": variables,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error marshingling JSON: %v", err)
	}

	req, err := http.NewRequest("POST", shopifyURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Shopify-Storefront-Access-Token", accessToken)

	client := &http.Client{}
	response, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request: %v", err)
	}

	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return fmt.Errorf("error reading response body: %v", err)
	}

	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("GraphQL request failed with status %d: %s", response.StatusCode, string(body))
	}

	var result map[string]interface{}
	err = json.Unmarshal(body, &result)
	if err != nil {
		return fmt.Errorf("error parsing response: %v", err)
	}

	if errors, ok := result["errors"].([]interface{}); ok && len(errors) > 0 {
		return fmt.Errorf("GraphQL errors: %v", errors)
	}

	return nil
}
