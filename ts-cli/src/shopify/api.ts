import { LogInfo, LogSuccess } from '@utils/logger.js';
import type { ShopifyConfig, ThemeFileBase64, ThemeFileUtf8, ThemeInfo } from '../types/types.js';


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

  private handleStatusCode(response: Response) {
    switch (response.status) {
      case 200:
        // Response is OK
        break;
      case 400:
        // Response is Bad Request
        throw new Error(response.statusText);
      case 402:
        // Response is Payment Required
        throw new Error(response.statusText);
      case 403:
        // Response is Forbidden Request
        throw new Error(response.statusText);
      case 404:
        // Response is Not Found
        throw new Error(response.statusText);
      case 423:
        // Response is Locked.
        throw new Error(response.statusText);
      default:
        // Will be unexpected
        throw new Error(response.statusText);
    }
  }

  /**
   * Sends a GraphQL request to the Shopify API.
   * @param {string} query - The GraphQL query string.
   * @param {Record<string, unknown>} variables - The variables for the GraphQL query.
   * @returns {Promise<Record<string, unknown>>} The data returned from the API.
   * @throws {Error} If the HTTP request fails or if the API returns errors.
   * @private
   */
  private async graphqlRequest<T extends Record<string, unknown>>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (response.headers.has('Content-Length')) {
      console.log(response.headers.get('Content-Length'));
    }

    this.handleStatusCode(response);

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

    const response = await this.graphqlRequest(query, variables);
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

  async getShopThemes(pageSize: number = 250): Promise<any[]> {
    const query = `
      query getThemes($first: Int!, $after: String) {
        themes(first: $first, after: $after) {
          edges {
            node {
              id
              name
              role
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const fetchThemes = async (cursor: string | null = null): Promise<any[]> => {
      const variables = {
        first: pageSize,
        after: cursor,
      };

      const response = await this.graphqlRequest(query, variables);
      const { themes } = response;

      const currentThemes = themes.edges.map((edge: any) => edge.node);

      if (themes.pageInfo.hasNextPage) {
        const nextThemes = await fetchThemes(themes.pageInfo.endCursor);
        return [...currentThemes, ...nextThemes];
      }

      return currentThemes;
    };

    return fetchThemes();
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

  /**
   * Recursively retrieves all files from the current theme.
   * @param {number} pageSize - The number of files to fetch per request.
   * @returns {Promise<Array<{filename: string, content: string}>>} A promise that resolves with an array of theme files.
   * @throws {Error} If fetching the theme files fails.
   */
  async getThemeFiles(themeId: string, pageSize: number = 50): Promise<Array<ThemeFileUtf8 | ThemeFileBase64>> {
    const query = `
      query getThemeFiles($id: ID!, $first: Int!, $after: String) {
        theme(id: $id) {
          files(first: $first, after: $after) {
            edges {
              node {
                filename
                body {
                  ... on OnlineStoreThemeFileBodyText {
                    content
                  }
                  ... on OnlineStoreThemeFileBodyBase64 {
                    contentBase64
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            userErrors {
              code
              filename
            }
          }
        }
      }
    `;

    const fetchFiles = async (cursor: string | null = null): Promise<Array<ThemeFileUtf8 | ThemeFileBase64>> => {
      const variables = {
        id: themeId,
        first: pageSize,
        after: cursor,
      };

      const response = await this.graphqlRequest(query, variables);
      const { theme } = response;

      const currentFiles = theme.files.edges.map((edge: any) => ({
        filename: edge.node.filename,
        ...(Object.keys(edge.node.body).includes('content') && { content: edge.node.body.content }),
        ...(Object.keys(edge.node.body).includes('contentBase64') && { content: edge.node.body.contentBase64 }),
      }));

      if (theme.files.pageInfo.hasNextPage) {
        const nextFiles = await fetchFiles(theme.files.pageInfo.endCursor);
        return [...currentFiles, ...nextFiles];
      }

      return currentFiles;
    };

    return fetchFiles();
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
