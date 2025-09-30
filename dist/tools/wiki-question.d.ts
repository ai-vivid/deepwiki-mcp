/**
 * Parameters for the wiki question tool
 */
export interface WikiQuestionToolParams {
    /** GitHub repository in 'owner/repo' format */
    repo: string;
    /** Question to ask about the repository (required for new queries) */
    question?: string;
    /** Query ID from previous response (required when using cached data) */
    queryId?: string;
    /** Enable deep analysis mode (takes 3-15 minutes) */
    useDeepResearch?: boolean;
    /** Go deeper on existing query for more detailed analysis */
    goDeeper?: boolean;
    /** Send a follow-up question to existing query */
    followUpQuestion?: string;
    /** For follow-ups: include full conversation history (default: false) */
    includeFullConversation?: boolean;
    /** Show the AI's text explanation (default: true) */
    includeAnswer?: boolean;
    /** Show numbered list of referenced files (default: true) */
    includeReferencesList?: boolean;
    /** Get ALL exact code snippets DeepWiki referenced */
    referencesAll?: boolean;
    /** Get specific reference snippets by number */
    referencesNumbers?: number[];
    /** Get complete contents of ALL available files */
    contextAll?: boolean;
    /** Get complete contents of specific files */
    contextFiles?: string[];
    /** Get specific line ranges from files */
    contextRanges?: Map<string, {
        start: number;
        end: number;
    }>;
    /** Save mode: 'save-only' or 'save-and-show' */
    saveToFile?: string;
    /** Custom file path for saving output */
    saveLocation?: string;
}
/**
 * Ask questions about GitHub repositories using DeepWiki's AI analysis
 *
 * This tool provides intelligent answers based on deep codebase analysis.
 * It can retrieve specific code snippets, file contents, and supports:
 * - New questions with optional deep research mode
 * - Retrieving cached responses by query ID
 * - Going deeper on existing queries for more analysis
 * - Follow-up questions to continue conversations
 * - Extracting code references and full file contents
 * - Saving responses to files
 *
 * @param params - Parameters for the question tool
 * @returns Markdown-formatted answer with optional code references
 * @throws {Error} If repo format is invalid
 * @throws {Error} If question exceeds 10,000 characters
 * @throws {Error} If query ID is invalid or not found in cache
 * @throws {Error} If automation fails (browser/network issues)
 * @throws {Error} If reference or context validation fails
 *
 * @example
 * // Ask a new question
 * wikiQuestionTool({
 *   repo: 'facebook/react',
 *   question: 'How does the virtual DOM work?',
 *   includeReferencesList: true
 * })
 *
 * @example
 * // Get specific references from previous query
 * wikiQuestionTool({
 *   repo: 'facebook/react',
 *   queryId: 'query-12345',
 *   referencesNumbers: [1, 2],
 *   includeAnswer: false
 * })
 *
 * @example
 * // Send follow-up question
 * wikiQuestionTool({
 *   repo: 'facebook/react',
 *   queryId: 'query-12345',
 *   followUpQuestion: 'Can you explain the reconciliation algorithm?',
 *   includeFullConversation: true
 * })
 *
 * @example
 * // Go deeper on existing query
 * wikiQuestionTool({
 *   repo: 'facebook/react',
 *   queryId: 'query-12345',
 *   goDeeper: true
 * })
 *
 * @example
 * // Deep research with file saving
 * wikiQuestionTool({
 *   repo: 'facebook/react',
 *   question: 'Explain the entire data flow architecture',
 *   useDeepResearch: true,
 *   saveToFile: 'save-and-show'
 * })
 */
export declare function wikiQuestionTool(params: WikiQuestionToolParams): Promise<string>;
//# sourceMappingURL=wiki-question.d.ts.map