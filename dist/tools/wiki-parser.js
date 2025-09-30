// Wiki parser tool
import { cacheManager } from '../cache/cache-manager.js';
import { WikiParser } from '../parsers/wiki-content-parser.js';
import { validateRepo, validateAction, validateChapters, validateDepth, validateChapterDepths, validateSaveToFile } from '../utils/validation.js';
/**
 * Parse and extract content from DeepWiki documentation
 *
 * This tool fetches DeepWiki documentation for a repository and either:
 * - Returns the table of contents structure (action: 'structure')
 * - Extracts specific chapters and sections (action: 'extract')
 *
 * Results are cached to improve performance on repeated requests.
 *
 * @param params - Parameters for the wiki parser
 * @returns Markdown-formatted documentation content
 * @throws {Error} If repo format is invalid
 * @throws {Error} If action is not 'structure' or 'extract'
 * @throws {Error} If chapters array is empty when provided
 * @throws {Error} If depth is not between 1-4
 * @throws {Error} If network request fails
 *
 * @example
 * // Get table of contents with depth 2
 * wikiParserTool({ repo: 'facebook/react', action: 'structure', depth: 2 })
 *
 * @example
 * // Extract specific chapter
 * wikiParserTool({ repo: 'facebook/react', action: 'extract', chapters: ['Getting Started'] })
 *
 * @example
 * // Extract section from chapter
 * wikiParserTool({ repo: 'facebook/react', action: 'extract', chapters: ['Setup##Installation'] })
 */
export async function wikiParserTool(params) {
    const { repo, action } = params;
    // Validate parameters
    validateRepo(repo);
    validateAction(action);
    if (params.chapters) {
        validateChapters(params.chapters);
    }
    if (params.depth !== undefined) {
        validateDepth(params.depth);
    }
    if (params.chapterDepths) {
        validateChapterDepths(params.chapterDepths);
    }
    if (params.saveToFile) {
        validateSaveToFile(params.saveToFile);
    }
    // Create a cache key for the wiki content
    const cacheKey = `wiki_${repo}`;
    // Try to get from cache first
    let wikiContent = await cacheManager.get('wiki', cacheKey, repo);
    if (!wikiContent) {
        console.error(`Downloading wiki content for ${repo}...`);
        // Download using fetch
        const url = `https://deepwiki.com/${repo}`;
        try {
            const response = await fetch(url, {
                headers: {
                    'RSC': '1'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            wikiContent = await response.text();
            // Save to cache
            await cacheManager.set('wiki', cacheKey, wikiContent, repo);
            console.error(`Wiki content cached for ${repo}`);
        }
        catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(`Network error: Failed to connect to ${url}. Check your internet connection.`);
            }
            throw new Error(`Failed to download wiki content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    else {
        console.error(`Using cached wiki content for ${repo}`);
    }
    // Parse the content
    const parser = new WikiParser(wikiContent);
    if (action === 'structure') {
        // Return chapter structure
        const structureOptions = {
            depth: params.depth,
            chapterDepths: params.chapterDepths
        };
        return parser.getStructureWithDepth(structureOptions);
    }
    else if (action === 'extract') {
        // Extract specific content
        const parseOptions = {
            chapters: params.chapters,
            headers: params.headers
        };
        // Parse chapter string format for headers
        if (params.chapters && !params.headers) {
            const headers = {};
            const chapters = [];
            for (const chapterString of params.chapters) {
                const parsed = parseChapterString(chapterString);
                chapters.push(parsed.title);
                if (parsed.headers.length > 0) {
                    headers[parsed.title] = parsed.headers;
                }
            }
            parseOptions.chapters = chapters;
            parseOptions.headers = headers;
        }
        return parser.extractContent(parseOptions);
    }
    else {
        throw new Error(`Unknown action: ${action}`);
    }
}
/**
 * Parse chapter string to extract title and headers
 *
 * Supports formats like:
 * - "Chapter 1" (just chapter title)
 * - "Chapter 1 ##Header1 ##Header2" (chapter with headers)
 * - "Chapter1##Header1##Header2" (no space before headers)
 *
 * @param chapterString - String containing chapter and optional headers
 * @returns Object with chapter title and array of headers
 *
 * @example
 * parseChapterString("Getting Started")
 * // => { title: "Getting Started", headers: [] }
 *
 * @example
 * parseChapterString("Setup ##Installation ##Configuration")
 * // => { title: "Setup", headers: ["##Installation", "##Configuration"] }
 */
function parseChapterString(chapterString) {
    // Match both "Chapter 1 ##Header" and "Chapter1##Header" formats (with or without space)
    const firstHeaderMatch = chapterString.match(/(\s|(?<=\d))(#{2,4})/);
    if (!firstHeaderMatch || typeof firstHeaderMatch.index !== 'number') {
        return { title: chapterString.trim(), headers: [] };
    }
    const title = chapterString.substring(0, firstHeaderMatch.index).trim();
    const headersString = chapterString.substring(firstHeaderMatch.index).trim();
    const headers = [];
    const headerRegex = /(#{2,4}\s*[^#\s][^#\n]*)/g;
    let match;
    while ((match = headerRegex.exec(headersString)) !== null) {
        headers.push(match[0].trim());
    }
    return { title, headers };
}
//# sourceMappingURL=wiki-parser.js.map