import fs from 'node:fs/promises';
import path from 'node:path';
import { LogError, LogInfo, LogSuccess } from '@utils/logger.js';
import { sanitizeFilePath } from './process.js';
import type { ShopifyAPI } from '@shopify/api.js';

export enum FileSource {
  LOCAL = 'local',
  REMOTE = 'remote',
  BOTH = 'both',
}

export interface FileInfo {
  path: string;
  source: FileSource;
  lastModified?: Date;
  size?: number;
  contentType?: string;
  checksum?: string;
  createdAt?: Date;
}

export class VirtualFileSystem {
  private shopifyClient: ShopifyAPI;

  private localRootPath: string;

  private remoteCache: Map<string, { content: string, timestamp: number }> = new Map();

  private cacheTTL: number = 600000;

  constructor(shopifyClient: ShopifyAPI, localRootPath: string) {
    this.shopifyClient = shopifyClient;
    this.localRootPath = localRootPath;
  }

  private resolveLocalPath(filePath: string): string {
    return path.join(this.localRootPath, filePath);
  }

  // eslint-disable-next-line class-methods-use-this
  private resolveRemotePath(filePath: string): string {
    if (!path.isAbsolute(filePath)) {
      return filePath;
    }

    return sanitizeFilePath(filePath);
  }

  private async existsLocally(filePath: string): Promise<boolean> {
    try {
      LogInfo(`Checking if local file exists: ${this.resolveLocalPath(filePath)}`);
      await fs.access(this.resolveLocalPath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  private async readLocal(filePath: string): Promise<string> {
    try {
      return await fs.readFile(this.resolveLocalPath(filePath), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read local file ${filePath}: ${error}`);
    }
  }

  private async writeLocal(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolveLocalPath(filePath);
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write local file ${filePath}: ${error}`);
    }
  }

  private async readRemote(filePath: string): Promise<string> {
    try {
      const file = await this.shopifyClient.readFile(filePath);

      if (file?.body?.type === 'TEXT') {
        return file.body.content;
      } 

      if (file?.body?.type === 'BASE64') {
        return Buffer.from(file.body.contentBase64, 'base64').toString('utf-8');
      } 

      throw new Error(`Unsupported file type: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to read remote file ${filePath}: ${error}`);
    }
  }

  private async writeRemote(filePath: string, content: string): Promise<void> {
    try {
      const remotePath = this.resolveRemotePath(filePath);
      await this.shopifyClient.uploadFile(remotePath, content);

      this.remoteCache.set(remotePath, {
        content,
        timestamp: Date.now(),
      });
    } catch (error) {
      throw new Error(`Failed to write remote file ${filePath}: ${error}`);
    }
  }

  async readFile(
    filePath: string,
    source: FileSource = FileSource.LOCAL
  ): Promise<string> {
    const remotePath = this.resolveRemotePath(filePath);
    const cachedFile = this.remoteCache.get(remotePath);

    if (source === FileSource.REMOTE && cachedFile && (Date.now() - cachedFile.timestamp < this.cacheTTL)) {
      LogInfo(`Reading ${filePath} from cache`);
      return cachedFile.content;
    }

    if (source === FileSource.LOCAL || source === FileSource.BOTH) {
      if (await this.existsLocally(filePath)) {
        return this.readLocal(filePath);
      }

      if (source === FileSource.LOCAL) {
        throw new Error(`Local file not found: ${filePath}`);
      }
    }

    if (source === FileSource.REMOTE || source === FileSource.BOTH) {
      try {
        const content = await this.readRemote(remotePath);
        this.remoteCache.set(remotePath, { content, timestamp: Date.now() });
        return content;
      } catch (error) {
        throw new Error(`Failed to read remote file ${filePath}: ${error}`);
      }
    }

    throw new Error(`File not found in specified sources: ${filePath}`);
  }

  async writeFile(
    filePath: string,
    content: string,
    source: FileSource = FileSource.BOTH
  ): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (source === FileSource.LOCAL || source === FileSource.BOTH) {
      tasks.push(this.writeLocal(filePath, content));
    }

    if (source === FileSource.REMOTE || source === FileSource.BOTH) {
      tasks.push(this.writeRemote(filePath, content));
    }

    await Promise.all(tasks);
    LogSuccess(`File ${filePath} saved successfully`);
  }

  async deleteFile(filePath: string, source: FileSource = FileSource.BOTH): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (source === FileSource.LOCAL || source === FileSource.BOTH) {
      try {
        tasks.push(fs.unlink(this.resolveLocalPath(filePath)));
      } catch (error) {
        LogError(`Failed to delete local file ${filePath}: ${error}`);
      }
    }

    if (source === FileSource.REMOTE || source === FileSource.BOTH) {
      const remotePath = this.resolveRemotePath(filePath);
      tasks.push(this.shopifyClient.deleteFile(remotePath));

      this.remoteCache.delete(remotePath);
    }

    await Promise.all(tasks);
    LogSuccess(`File ${filePath} deleted successfully`);
  }

  async listFiles(directoryPath: string = ''): Promise<string[]> {
    const fullPath = this.resolveLocalPath(directoryPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: string[] = [];

      for await (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);
        
        if (entry.isDirectory()) {
          const subDirectoryFiles = await this.listFiles(entryPath);
          files.push(...subDirectoryFiles);
        } else {
          files.push(entryPath);
        }
      }

      return files;
    } catch (error) {
      LogError(`Failed to list files in ${directoryPath}: ${error}`);
      return [];
    }
  }

  async syncFile(
    filePath: string,
    direction: 'upload' | 'download' = 'upload'
  ): Promise<void> {
    try {
      if (direction === 'upload') {
        const content = await this.readLocal(filePath);
        await this.writeFile(filePath, content, FileSource.REMOTE);
      } else {
        const remotePath = this.resolveRemotePath(filePath);
        const content = await this.readRemote(remotePath);
        await this.writeLocal(filePath, content);
      }

      LogSuccess(`File ${filePath} synchronized successfully (${direction})`);
    } catch (error) {
      LogError(`Failed to synchronize file ${filePath}: ${error}`);
    }
  }

  clearCache(filePath?: string): void {
    if (filePath) {
      const remotePath = this.resolveRemotePath(filePath);
      this.remoteCache.delete(remotePath);
    } else {
      this.remoteCache.clear();
    }
  }
}


export function createVirtualFileSystem(shopifyClient: ShopifyAPI, localRootPath: string): VirtualFileSystem {
  return new VirtualFileSystem(shopifyClient, localRootPath);
}
