import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Asynchronously loads the content of a file.
 * 
 * @param {string} filePath - The path to the file to be loaded.
 * @returns {Promise<string>} A promise that resolves with the content of the file as a string.
 * @throws {Error} If the file cannot be read, with details about the failure.
 * 
 * @description
 * This function attempts to read the contents of a file at the specified path.
 * It uses UTF-8 encoding to read the file.
 * 
 * @example
 * try {
 *   const content = await loadFile('/path/to/file.txt');
 *   console.log(content);
 * } catch (error) {
 *   console.error(error.message);
 * }
 */
export async function loadFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to load file ${filePath}: ${error}`);
  }
}

/**
 * Asynchronously loads all .liquid files from a directory and its subdirectories.
 * 
 * @param {string} directoryPath - The path to the directory to load files from.
 * @returns {Promise<Map<string, string>>} A promise that resolves with a Map where keys are relative file paths and values are file contents.
 * 
 * @description
 * This function recursively traverses the given directory and its subdirectories,
 * loading all .liquid files it encounters. The resulting Map contains the relative
 * paths of the files (from the initial directory) as keys and their contents as values.
 * 
 * @example
 * try {
 *   const files = await loadDirectory('/path/to/templates');
 *   for (const [relativePath, content] of files) {
 *     console.log(`File: ${relativePath}`);
 *     console.log(`Content: ${content.substring(0, 100)}...`);
 *   }
 * } catch (error) {
 *   console.error('Error loading directory:', error);
 * }
 */
export async function loadDirectory(directoryPath: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  async function loadRecursively(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await loadRecursively(fullPath);
        } else if (entry.isFile() && path.extname(entry.name) === '.liquid') {
          const content = await loadFile(fullPath);
          const relativePath = path.relative(directoryPath, fullPath);

          files.set(relativePath, content);
        }
      }),
    );
  }

  await loadRecursively(directoryPath);
  return files;
}