import { LogInfo, LogSuccess } from '@utils/logger.js';
import type { ShopifyConfig, ThemeInfo } from '../types/types.js';

/**
 * Represents an API client for interacting with Shopify's GraphQL API.
 */
export class ShopifyAPI {
  private baseUrl: string;

  private headers: HeadersInit;

  private themeId: string;

  /**
   * Creates an instance of ShopifyAPI.
   * @param {ShopifyConfig} config - The configuration object for the Shopify API.
   */
  constructor(config: ShopifyConfig) {
    // TODO: add api version to config.
    this.baseUrl = `${config.shopifyUrl}/admin/api/unstable/graphql.json`;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken,
    };
    this.themeId = `gid://shopify/OnlineStoreTheme/${config.themeId}`;
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
      throw new Error(
        `HTTP error! status: ${response.status} ${JSON.stringify(await response.json())}`,
      );
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
  async uploadFile(filename: string, content: string): Promise<void> {
    LogInfo(`Uploading ${filename}`);
    const query = `
      mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      themeId: this.themeId,
      files: [
        {
          filename,
          body: {
            type: 'TEXT',
            value: content,
          },
        },
      ],
    };

    const response = (await this.graphqlRequest(query, variables)) as Record<string, unknown>;
    // eslint-disable-next-line prefer-destructuring
    const userErrors = response.themeFilesUpsert.userErrors;
    if (userErrors && userErrors.length > 0) {
      throw new Error(`Failed to upload file: ${userErrors[0].message}`);
    }

    LogSuccess(`Finished uploading ${filename}`);

    return;
  }

  /**
   * Deletes a file from the Shopify theme.
   * @param {string} path - The path of the file to be deleted.
   * @throws {Error} If the deletion fails or if the API returns user errors.
   */
  async deleteFile(filename: string): Promise<void> {
    const query = `
      mutation themeFilesDelete($themeId: ID!, $files: [String!]!) {
        themeFilesDelete(themeId: $themeId, files: $files) {
          deletedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      themeId: this.themeId,
      files: [filename],
    };

    const response = await this.graphqlRequest(query, variables);
    // eslint-disable-next-line prefer-destructuring
    const userErrors = response.themeFilesDelete.userErrors;
    if (userErrors && userErrors.length > 0) {
      throw new Error(`Failed to delete file: ${userErrors[0].message}`);
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

    const response = await this.graphqlRequest(query, variables);
    return response.theme as ThemeInfo;
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
