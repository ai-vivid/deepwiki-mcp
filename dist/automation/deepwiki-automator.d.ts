/**
 * Options for asking a new question to DeepWiki
 */
export interface DeepwikiQuestionOptions {
    /** GitHub repository URL (e.g., 'facebook/react') */
    repoUrl: string;
    /** Question to ask about the repository */
    question: string;
    /** Enable deep research mode for comprehensive analysis (3-15 min) */
    useDeepResearch?: boolean;
    /** Run browser in headless mode (default: true) */
    headless?: boolean;
    /** Maximum timeout in milliseconds (kept for compatibility) */
    timeout?: number;
}
/**
 * Options for going deeper on an existing query
 */
export interface DeepwikiGoDeeperOptions {
    /** Query ID from previous response */
    queryId: string;
    /** Run browser in headless mode (default: true) */
    headless?: boolean;
}
/**
 * Options for sending a follow-up question
 */
export interface DeepwikiFollowUpOptions {
    /** Query ID from previous response */
    queryId: string;
    /** Follow-up question to ask */
    followUpQuestion: string;
    /** Enable deep research mode for the follow-up */
    useDeepResearch?: boolean;
    /** Run browser in headless mode (default: true) */
    headless?: boolean;
}
/**
 * Response from DeepWiki automation operations
 */
export interface DeepwikiResponse {
    /** Whether the operation was successful */
    success: boolean;
    /** AI-generated answer text */
    answer?: string;
    /** Array of code references with file paths and line ranges */
    references?: Array<{
        file_path: string;
        range_start: number;
        range_end: number;
    }>;
    /** Statistics about the analysis (e.g., files analyzed, tokens used) */
    stats?: Record<string, number>;
    /** Error message if operation failed */
    error?: string;
    /** Raw API response data */
    rawResponse?: any;
    /** Query ID for caching and follow-ups */
    queryId?: string;
}
/**
 * Browser automation for DeepWiki website interactions
 *
 * This class handles all browser automation tasks for interacting with deepwiki.com,
 * including asking questions, going deeper on analyses, and sending follow-ups.
 * It uses Playwright for cross-platform browser automation with support for
 * Chrome on macOS, Linux, and Windows.
 *
 * @example
 * const automator = new DeepwikiAutomator();
 * const result = await automator.askQuestion({
 *   repoUrl: 'facebook/react',
 *   question: 'How does the reconciler work?',
 *   useDeepResearch: false,
 *   headless: true
 * });
 */
export declare class DeepwikiAutomator {
    private browser;
    private page;
    private answerPage;
    private static cachedExecutablePath;
    /**
     * Format seconds into human-readable time string
     *
     * @param seconds - Number of seconds to format
     * @returns Formatted time string (e.g., "45s", "2m30s", "5m")
     *
     * @example
     * formatTime(45)   // => "45s"
     * formatTime(150)  // => "2m30s"
     * formatTime(300)  // => "5m"
     */
    private formatTime;
    /**
     * Submit a question to DeepWiki and get AI-generated answer
     *
     * This method automates the process of:
     * 1. Opening the DeepWiki page for the repository
     * 2. Submitting the question through the web interface
     * 3. Optionally enabling deep research mode
     * 4. Polling the API until the response is complete
     * 5. Extracting and returning the answer with references
     *
     * @param options - Question options including repo, question text, and settings
     * @returns Promise resolving to response with answer, references, and query ID
     * @throws {Error} If browser automation fails or question cannot be submitted
     *
     * @example
     * const result = await automator.askQuestion({
     *   repoUrl: 'facebook/react',
     *   question: 'How does reconciliation work?',
     *   useDeepResearch: false,
     *   headless: true
     * });
     * console.log(result.answer);
     * console.log(result.queryId);
     */
    askQuestion(options: DeepwikiQuestionOptions): Promise<DeepwikiResponse>;
    /**
     * Execute "Go Deeper" functionality on an existing query
     *
     * This method navigates to an existing query and clicks the "Go deeper" button
     * to get more detailed analysis. A new query is created with deeper insights,
     * and a new query ID is returned.
     *
     * The "Go Deeper" operation always uses deep research mode and takes several minutes.
     *
     * @param options - Options including the query ID to go deeper on
     * @returns Promise resolving to response with deeper analysis and new query ID
     * @throws {Error} If browser automation fails or "Go deeper" button not found
     * @throws {Error} If the original query ID is invalid
     *
     * @example
     * const deeperResult = await automator.goDeeper({
     *   queryId: 'query-12345',
     *   headless: true
     * });
     * console.log(deeperResult.queryId); // New query ID for the deeper analysis
     */
    goDeeper(options: DeepwikiGoDeeperOptions): Promise<DeepwikiResponse>;
    /**
     * Send a follow-up question to an existing query
     *
     * This method adds a follow-up question to an existing conversation.
     * The response includes the full conversation history with all queries
     * and responses. The same query ID is maintained for the conversation.
     *
     * Follow-ups can optionally use deep research mode for more thorough analysis.
     *
     * @param options - Options including query ID, follow-up question, and settings
     * @returns Promise resolving to response with full conversation history
     * @throws {Error} If browser automation fails or query page not accessible
     * @throws {Error} If the query ID is invalid
     *
     * @example
     * const followUpResult = await automator.sendFollowUp({
     *   queryId: 'query-12345',
     *   followUpQuestion: 'Can you explain the error handling?',
     *   useDeepResearch: false,
     *   headless: true
     * });
     * // Same queryId, but response includes full conversation
     */
    sendFollowUp(options: DeepwikiFollowUpOptions): Promise<DeepwikiResponse>;
    private constructQueryUrl;
    private findChromiumExecutable;
    private initBrowser;
    private extractRepoPath;
    private extractQueryId;
    private enableDeepResearch;
    /**
     * Parse custom polling schedule from environment variable
     * @param envVar - Environment variable value
     * @param defaultSchedule - Default schedule to use if parsing fails
     * @returns Sorted array of polling intervals in seconds
     */
    private parseCustomPollSchedule;
    /**
     * Wait until the next scheduled API check time
     * @param startTime - Timestamp when polling started
     * @param scheduleIndex - Current index in the polling schedule
     * @param pollSchedule - Array of polling intervals in seconds
     */
    private waitForNextScheduledCheck;
    /**
     * Check API for query progress
     * @param apiUrl - API endpoint URL
     * @returns API response with query data
     */
    private checkApiProgress;
    /**
     * Detect and log changes in query state or response
     * @param lastQuery - Current query state
     * @param lastState - Previous state
     * @param lastResponseLength - Previous response length
     * @param lastChangeTime - Time of last change
     * @returns Updated tracking values
     */
    private detectProgressChanges;
    /**
     * Check if query appears stuck and log warning
     * @param lastQuery - Current query state
     * @param lastChangeTime - Time of last detected change
     * @param stuckThreshold - Threshold in ms to consider stuck
     * @param currentResponseLength - Current response item count
     */
    private checkIfStuck;
    private fetchApiResponse;
    private extractDataFromAllQueries;
    private cleanup;
}
//# sourceMappingURL=deepwiki-automator.d.ts.map