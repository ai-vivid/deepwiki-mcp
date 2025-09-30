export declare class CacheManager {
    private cacheDir;
    constructor();
    private getRepoFolder;
    private getCacheSubfolder;
    init(): Promise<void>;
    private ensureCacheStructure;
    private getCacheFileName;
    get(type: string, identifier: string, repo?: string): Promise<string | null>;
    set(type: string, identifier: string, content: string, repo?: string): Promise<void>;
    getJSON<T>(type: string, identifier: string, repo?: string): Promise<T | null>;
    setJSON<T = unknown>(type: string, identifier: string, data: T, repo?: string): Promise<void>;
}
export declare const cacheManager: CacheManager;
//# sourceMappingURL=cache-manager.d.ts.map