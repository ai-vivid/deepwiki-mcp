/**
 * Parameters for the wiki parser tool
 */
export interface WikiParserToolParams {
    /** GitHub repository in 'owner/repo' format */
    repo: string;
    /** Action to perform: 'structure' to get table of contents, 'extract' to get chapter content */
    action: 'structure' | 'extract';
    /** Array of chapter names to extract (can include sections like 'Setup##Installation') */
    chapters?: string[];
    /** Map of chapter names to arrays of header names to extract */
    headers?: {
        [chapter: string]: string[];
    };
    /** Default depth for structure view (1-4) */
    depth?: number;
    /** Override depth for specific chapters */
    chapterDepths?: {
        [chapter: string]: number;
    };
    /** Save mode: 'save-only' or 'save-and-show' */
    saveToFile?: string;
    /** Custom file path for saving output */
    saveLocation?: string;
}
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
export declare function wikiParserTool(params: WikiParserToolParams): Promise<string>;
//# sourceMappingURL=wiki-parser.d.ts.map