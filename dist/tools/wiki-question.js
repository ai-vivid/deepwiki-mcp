// Wiki question tool
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { cacheManager } from '../cache/cache-manager.js';
import { DeepwikiAutomator } from '../automation/deepwiki-automator.js';
import { transformResponse } from '../parsers/json-transformer.js';
import { MarkdownGenerator } from '../parsers/markdown-generator.js';
import { generateDescriptiveName, ensureOutputStructure, validateSaveLocation } from '../utils/file-helpers.js';
import { validateRepo, validateQuestion, validateQueryId, validateReferencesNumbers, validateContextFiles, validateContextRanges, validateSaveToFile } from '../utils/validation.js';
/**
 * Handle "Go Deeper" request for existing query
 * @param paramQueryId - Query ID to go deeper on
 * @returns Tuple of [transformedJson, actualQueryId]
 */
async function handleGoDeeperRequest(paramQueryId) {
    console.error(`Initiating Go Deeper for query ID: ${paramQueryId}`);
    const automator = new DeepwikiAutomator();
    const result = await automator.goDeeper({
        queryId: paramQueryId,
        headless: true
    });
    if (!result.success) {
        throw new Error(`Failed to execute Go Deeper: ${result.error}`);
    }
    // Transform the response to our format
    const inputResponse = {
        timestamp: new Date().toISOString(),
        success: result.success,
        queryId: result.queryId || '',
        answer: result.answer || '',
        references: result.references || [],
        stats: result.stats || {},
        rawResponse: result.rawResponse || {
            user_query: `Go Deeper from ${paramQueryId}`,
            use_knowledge: true,
            engine_id: '',
            repo_context_ids: [],
            response: result.rawResponse?.response || [],
            error: null,
            state: 'done',
            redis_stream: null
        }
    };
    const transformedJson = transformResponse(inputResponse);
    const newQueryId = result.queryId || '';
    // Cache the deeper response with the new query ID
    if (newQueryId) {
        await cacheManager.setJSON('question', newQueryId, transformedJson, result.queryId?.split('_')[0] || '');
        console.error(`Go Deeper response cached with new query ID: ${newQueryId}`);
    }
    return [transformedJson, newQueryId];
}
/**
 * Handle follow-up question for existing query
 * @param paramQueryId - Original query ID
 * @param followUpQuestion - Follow-up question text
 * @param useDeepResearch - Whether to use deep research mode
 * @param repo - Repository name
 * @returns Tuple of [transformedJson, actualQueryId]
 */
async function handleFollowUpRequest(paramQueryId, followUpQuestion, useDeepResearch, repo) {
    console.error(`Sending follow-up question to query ID: ${paramQueryId}`);
    console.error(`Follow-up question: ${followUpQuestion}`);
    const automator = new DeepwikiAutomator();
    const result = await automator.sendFollowUp({
        queryId: paramQueryId,
        followUpQuestion,
        useDeepResearch,
        headless: true
    });
    if (!result.success) {
        throw new Error(`Failed to send follow-up: ${result.error}`);
    }
    // Transform the response to our format (conversation will contain both original and follow-up)
    const inputResponse = {
        timestamp: new Date().toISOString(),
        success: result.success,
        queryId: result.queryId || '',
        answer: result.answer || '',
        references: result.references || [],
        stats: result.stats || {},
        rawResponse: result.rawResponse || {
            user_query: `Follow-up: ${followUpQuestion}`,
            use_knowledge: true,
            engine_id: '',
            repo_context_ids: [],
            response: result.rawResponse?.response || [],
            error: null,
            state: 'done',
            redis_stream: null
        }
    };
    const transformedJson = transformResponse(inputResponse);
    // Update the existing cache entry with the full conversation
    await cacheManager.setJSON('question', paramQueryId, transformedJson, repo);
    console.error(`Follow-up response cached with original query ID: ${paramQueryId}`);
    return [transformedJson, paramQueryId];
}
/**
 * Handle new question request
 * @param repo - Repository name
 * @param question - Question text
 * @param useDeepResearch - Whether to use deep research mode
 * @returns Tuple of [transformedJson, actualQueryId]
 */
async function handleNewQuestion(repo, question, useDeepResearch) {
    console.error(`Asking DeepWiki: ${question}`);
    console.error(`Repository: ${repo}`);
    console.error(`Mode: ${useDeepResearch ? 'Deep Research' : 'Regular'}`);
    const automator = new DeepwikiAutomator();
    // Always wait for the response
    const result = await automator.askQuestion({
        repoUrl: repo,
        question,
        useDeepResearch,
        headless: true
    });
    if (!result.success) {
        throw new Error(`Failed to get answer: ${result.error}`);
    }
    // Transform the response to our format
    const inputResponse = {
        timestamp: new Date().toISOString(),
        success: result.success,
        queryId: result.queryId || '',
        answer: result.answer || '',
        references: result.references || [],
        stats: result.stats || {},
        rawResponse: result.rawResponse || {
            user_query: question,
            use_knowledge: true,
            engine_id: '',
            repo_context_ids: [],
            response: result.rawResponse?.response || [],
            error: null,
            state: 'done',
            redis_stream: null
        }
    };
    const transformedJson = transformResponse(inputResponse);
    // Use the actual queryId from the response as the cache key
    const responseQueryId = result.queryId || '';
    if (responseQueryId) {
        await cacheManager.setJSON('question', responseQueryId, transformedJson, repo);
        console.error(`Response cached with query ID: ${responseQueryId}`);
    }
    else {
        console.error(`Warning: No query ID received, caching with temporary key`);
        const tempCacheKey = `question_${repo}_${question}_${useDeepResearch ? 'deep' : 'regular'}`;
        await cacheManager.setJSON('question', tempCacheKey, transformedJson, repo);
        return [transformedJson, tempCacheKey];
    }
    return [transformedJson, responseQueryId];
}
/**
 * Save response to file
 * @param transformedJson - Response data to save
 * @param saveToFile - Save mode ('save-only' or 'save-and-show')
 * @param saveLocation - Optional custom file path
 * @param queryId - Query ID for filename
 * @param repo - Repository name
 * @param question - Original question (for new questions)
 * @param goDeeper - Whether this is a go deeper request
 * @param followUpQuestion - Follow-up question text (if applicable)
 * @param markdown - Formatted markdown content
 * @returns File path where content was saved
 */
async function saveResponseToFile(transformedJson, saveToFile, saveLocation, queryId, repo, question, goDeeper, followUpQuestion, markdown) {
    let filePath;
    if (saveLocation) {
        // Validate and resolve the save location path
        filePath = validateSaveLocation(saveLocation);
        // Ensure directory exists
        await mkdir(dirname(filePath), { recursive: true });
    }
    else {
        // Generate structured file path
        const outputPath = await ensureOutputStructure(repo, 'question');
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        let description;
        if (goDeeper) {
            description = `go-deeper`;
        }
        else if (followUpQuestion) {
            description = `follow-up-${generateDescriptiveName(followUpQuestion)}`;
        }
        else {
            description = generateDescriptiveName(question);
        }
        const filename = `${dateStr}_${timeStr}_${description}_query-${queryId}.md`;
        filePath = join(outputPath, filename);
    }
    // Save file
    await writeFile(filePath, markdown, 'utf-8');
    console.error(`Output saved to: ${filePath}`);
    return filePath;
}
/**
 * Filter conversation to show only latest response for follow-ups
 *
 * When includeFullConversation is false, this function extracts just the
 * latest query-response pair from a conversation. This is useful for
 * follow-up questions where the user only wants to see the new response.
 *
 * @param transformedJson - Complete conversation data with all queries
 * @param includeFullConversation - If true, return full conversation; if false, return only latest
 * @returns Filtered conversation data containing either full or latest response
 *
 * @example
 * // Returns only the latest query-response pair
 * filterConversationForFollowUp(fullConversation, false)
 *
 * @example
 * // Returns the complete conversation history
 * filterConversationForFollowUp(fullConversation, true)
 */
function filterConversationForFollowUp(transformedJson, includeFullConversation) {
    if (includeFullConversation) {
        return transformedJson; // Return full conversation
    }
    // For follow-ups, extract just the latest response (last query in conversation)
    if (transformedJson.conversation && transformedJson.conversation.length > 1) {
        const lastQuery = transformedJson.conversation[transformedJson.conversation.length - 1];
        return {
            ...transformedJson,
            conversation: [lastQuery] // Only include the latest query-response pair
        };
    }
    // If no conversation or only one query, return as-is
    return transformedJson;
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
export async function wikiQuestionTool(params) {
    const { repo, question, queryId: paramQueryId, useDeepResearch = false, goDeeper = false, followUpQuestion, includeFullConversation = false, includeAnswer = true, includeReferencesList = true, referencesAll = false, referencesNumbers, contextAll = false, contextFiles, contextRanges, saveToFile, saveLocation } = params;
    // Validate parameters
    validateRepo(repo);
    if (question) {
        validateQuestion(question);
    }
    if (paramQueryId) {
        validateQueryId(paramQueryId);
    }
    if (followUpQuestion) {
        validateQuestion(followUpQuestion); // Follow-up questions have same constraints as questions
    }
    if (referencesNumbers) {
        validateReferencesNumbers(referencesNumbers);
    }
    if (contextFiles) {
        validateContextFiles(contextFiles);
    }
    if (contextRanges) {
        // Convert Map to plain object if needed for validation
        const rangesObj = contextRanges instanceof Map
            ? Object.fromEntries(contextRanges)
            : contextRanges;
        validateContextRanges(rangesObj);
    }
    if (saveToFile) {
        validateSaveToFile(saveToFile);
    }
    let transformedJson = null;
    let actualQueryId = '';
    // Generate markdown options early (needed for metadata storage)
    const markdownOptions = {
        includeAnswer,
        includeReferencesList,
        referencesAll,
        referencesNumbers,
        contextAll,
        contextFiles,
        contextRanges
    };
    // Route to appropriate handler based on request type
    if (goDeeper) {
        if (!paramQueryId) {
            throw new Error("Query ID is required for Go Deeper functionality");
        }
        [transformedJson, actualQueryId] = await handleGoDeeperRequest(paramQueryId);
    }
    else if (followUpQuestion) {
        if (!paramQueryId) {
            throw new Error("Query ID is required for follow-up questions");
        }
        [transformedJson, actualQueryId] = await handleFollowUpRequest(paramQueryId, followUpQuestion, useDeepResearch, repo);
    }
    else if (paramQueryId) {
        // If queryId is provided, use it directly for cache lookup
        actualQueryId = paramQueryId;
        transformedJson = await cacheManager.getJSON('question', paramQueryId, repo);
        if (!transformedJson) {
            throw new Error(`No cached response found for query ID: ${paramQueryId}`);
        }
        console.error(`Using cached response for query ID: ${paramQueryId}`);
    }
    else {
        // Check cache for new questions
        if (!question) {
            throw new Error("Question is required when queryId is not provided");
        }
        const tempCacheKey = `question_${repo}_${question}_${useDeepResearch ? 'deep' : 'regular'}`;
        transformedJson = await cacheManager.getJSON('question', tempCacheKey, repo);
        // If not cached, ask the question
        if (!transformedJson) {
            [transformedJson, actualQueryId] = await handleNewQuestion(repo, question, useDeepResearch);
        }
        else {
            actualQueryId = tempCacheKey;
        }
    }
    // Generate markdown for output or saving
    const filteredResponse = followUpQuestion
        ? filterConversationForFollowUp(transformedJson, includeFullConversation)
        : transformedJson;
    const generator = new MarkdownGenerator(filteredResponse);
    let markdown = generator.generateMarkdown(markdownOptions);
    // Add deep research indicator if used
    if (useDeepResearch && (followUpQuestion || question)) {
        markdown = `**Deep Research Mode Used**\n\n${markdown}`;
    }
    // Handle file saving if requested
    if (saveToFile && (saveToFile.toLowerCase() === 'save-only' || saveToFile.toLowerCase() === 'save-and-show')) {
        const queryId = actualQueryId || transformedJson?.query_id || 'unknown';
        const filePath = await saveResponseToFile(transformedJson, saveToFile, saveLocation, queryId, repo, question, goDeeper, followUpQuestion, markdown);
        if (saveToFile.toLowerCase() === 'save-only') {
            return `Query ID: ${queryId}\nOutput saved to: ${filePath}`;
        }
        else {
            return `Query ID: ${queryId}\nOutput saved to: ${filePath}\n\n---\n\n${markdown}`;
        }
    }
    // Normal return without saving
    return markdown;
}
//# sourceMappingURL=wiki-question.js.map