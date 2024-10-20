import { ShopifyConfig, ThemeInfo } from '../types';
import { LogError } from '../utils/logger';

/**
 * Represents an API client for interacting with Shopify's GraphQL API.
 */
class ShopifyAPI {
  private baseUrl: string;

  private headers: HeadersInit;

  private themeId: number;

  /**
   * Creates an instance of ShopifyAPI.
   * @param {ShopifyConfig} config - The configuration object for the Shopify API.
   */
  constructor(config: ShopifyConfig) {
    // TODO: add api version to config.
    this.baseUrl = `https://${config.storeUrl}/admin/api/unstable/graphql.json`;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken,
    };
    this.themeId = config.themeId;
  }

  /**
   * Sends a GraphQL request to the Shopify API.
   * @param {string} query - The GraphQL query string.
   * @param {Record<string, unknown>} variables - The variables for the GraphQL query.
   * @returns {Promise<Record<string, unknown>>} The data returned from the API.
   * @throws {Error} If the HTTP request fails or if the API returns errors.
   * @private
   */
  private async graphqlRequest(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return data.data;
  }

  /**
   * Uploads a file to the Shopify theme.
   * @param {string} path - The path where the file should be uploaded.
   * @param {string} content - The content of the file to be uploaded.
   * @throws {Error} If the upload fails or if the API returns user errors.
   */
  async uploadFile(path: string, content: string): Promise<void> {
    const query = `
            mutation assetUpdate($input: AssetInput!) {
                assetUpdate(input: $input) {
                    asset {
                        key
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

    const variables = {
      input: {
        key: path,
        themeId: this.themeId,
        value: content,
      },
    };

    try {
      const response = await this.graphqlRequest(query, variables);
      if (response.assetUpdate.userErrors.length > 0) {
        throw new Error(response.assetUpdate.userErrors[0].message);
      }
    } catch (error) {
      LogError(`Failed to upload file ${path}`, error as Error);
      throw error;
    }
  }

  /**
   * Deletes a file from the Shopify theme.
   * @param {string} path - The path of the file to be deleted.
   * @throws {Error} If the deletion fails or if the API returns user errors.
   */
  async deleteFile(path: string): Promise<void> {
    const query = `
            mutation assetDelete($input: AssetDeleteInput!) {
                assetDelete(input: $input) {
                    deletedAssetId
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

    const variables = {
      input: {
        key: path,
        themeId: this.themeId,
      },
    };

    try {
      const response = await this.graphqlRequest(query, variables);
      if (response.assetDelete.userErrors.length > 0) {
        throw new Error(response.assetDelete.userErrors[0].message);
      }
    } catch (error) {
      LogError(`Failed to delete file ${path}`, error as Error);
      throw error;
    }
  }

  /**
   * Retrieves information about the current theme.
   * @returns {Promise<ThemeInfo>} A promise that resolves with the theme information.
   * @throws {Error} If fetching the theme information fails.
   */
  async getThemeInfo(): Promise<ThemeInfo> {
    const query = `
            query getTheme($id: ID!) {
                theme(id: $id) {
                    name
                    id
                }
            }
        `;

    const variables = {
      id: `gid://shopify/Theme/${this.themeId}`,
    };

    try {
      const response = await this.graphqlRequest(query, variables);
      return response.theme as ThemeInfo;
    } catch (error) {
      LogError(`Failed to get theme info`, error as Error);
      throw error;
    }
  }
}

/**
 * Creates and returns a new instance of ShopifyAPI.
 * @param {ShopifyConfig} config - The configuration object for the Shopify API.
 * @returns {ShopifyAPI} A new instance of ShopifyAPI.
 */
export function createShopifyAPI(config: ShopifyConfig): ShopifyAPI {
  return new ShopifyAPI(config);
}
