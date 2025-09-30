import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { homedir } from 'os';
export class CacheManager {
    cacheDir;
    constructor() {
        // Store cache in user's home directory
        this.cacheDir = join(homedir(), '.deepwiki-mcp', 'cache');
    }
    getRepoFolder(repo) {
        return repo.replace('/', '-');
    }
    getCacheSubfolder(type) {
        return type === 'question' ? 'questions' : 'wiki';
    }
    async init() {
        try {
            await mkdir(this.cacheDir, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create cache directory:', error);
        }
    }
    async ensureCacheStructure(repo, type) {
        const repoFolder = this.getRepoFolder(repo);
        const subfolder = this.getCacheSubfolder(type);
        const cachePath = join(this.cacheDir, repoFolder, subfolder);
        try {
            await mkdir(cachePath, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create cache structure:', error);
        }
        return cachePath;
    }
    getCacheFileName(type, identifier) {
        // For question type with query IDs, use raw identifier to enable direct lookup
        if (type === 'question' && identifier.includes('-') && identifier.length > 30) {
            // This looks like a query ID, use it directly (sanitized for filesystem)
            const sanitized = identifier.replace(/[<>:"/\\|?*]/g, '_');
            return `query-${sanitized}.json`;
        }
        // For wiki content, use .md extension since it's markdown
        if (type === 'wiki') {
            const hash = createHash('md5').update(identifier).digest('hex');
            return `wiki_${hash}.md`;
        }
        // For everything else, use hash with .json extension
        const hash = createHash('md5').update(identifier).digest('hex');
        return `${type}_${hash}.json`;
    }
    async get(type, identifier, repo) {
        try {
            if (repo) {
                // Try new folder structure first
                const cachePath = await this.ensureCacheStructure(repo, type);
                const fileName = this.getCacheFileName(type, identifier);
                const filePath = join(cachePath, fileName);
                try {
                    await access(filePath);
                    const content = await readFile(filePath, 'utf-8');
                    return content;
                }
                catch (error) {
                    // Fall through to old format (file not found in new structure)
                    console.error(`Cache miss in new structure for ${type}/${identifier}:`, error instanceof Error ? error.message : 'Unknown error');
                }
            }
            // Try old flat format (backward compatibility)
            const newCacheKey = this.getCacheFileName(type, identifier);
            const newCachePath = join(this.cacheDir, newCacheKey.replace(/\.(json|md)$/, ''));
            try {
                await access(newCachePath);
                const content = await readFile(newCachePath, 'utf-8');
                return content;
            }
            catch (error) {
                // Fall back to old hashed format for backward compatibility
                console.error(`Cache miss in flat structure for ${type}/${identifier}:`, error instanceof Error ? error.message : 'Unknown error');
                const hash = createHash('md5').update(identifier).digest('hex');
                const oldCacheKey = `${type}_${hash}`;
                const oldCachePath = join(this.cacheDir, oldCacheKey);
                await access(oldCachePath);
                const content = await readFile(oldCachePath, 'utf-8');
                return content;
            }
        }
        catch (error) {
            // No cache entry found in any format
            console.error(`Cache not found for ${type}/${identifier}:`, error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }
    async set(type, identifier, content, repo) {
        try {
            if (repo) {
                // Use new folder structure
                const cachePath = await this.ensureCacheStructure(repo, type);
                const fileName = this.getCacheFileName(type, identifier);
                const filePath = join(cachePath, fileName);
                await writeFile(filePath, content, 'utf-8');
                // Use stderr for debugging since stdout is suppressed
                process.stderr.write(`Cache written: ${filePath}\n`);
            }
            else {
                // Fall back to old flat structure
                const cacheKey = this.getCacheFileName(type, identifier);
                const cachePath = join(this.cacheDir, cacheKey.replace(/\.(json|md)$/, ''));
                await writeFile(cachePath, content, 'utf-8');
            }
        }
        catch (error) {
            // Use stderr for debugging since console is suppressed
            process.stderr.write(`Failed to write to cache: ${error}\n`);
            throw error; // Re-throw to see if this is causing issues
        }
    }
    async getJSON(type, identifier, repo) {
        const content = await this.get(type, identifier, repo);
        if (!content)
            return null;
        try {
            return JSON.parse(content);
        }
        catch (error) {
            console.error(`Failed to parse JSON for ${type}/${identifier}:`, error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }
    async setJSON(type, identifier, data, repo) {
        await this.set(type, identifier, JSON.stringify(data, null, 2), repo);
    }
}
export const cacheManager = new CacheManager();
//# sourceMappingURL=cache-manager.js.map