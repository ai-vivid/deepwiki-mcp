/**
 * Validation utilities for MCP tool parameters
 */
/**
 * Validates GitHub repository format (owner/repo)
 * @param repo - Repository string to validate
 * @throws Error if repo format is invalid
 */
export declare function validateRepo(repo: string): void;
/**
 * Validates question text
 * @param question - Question string to validate
 * @throws Error if question is invalid
 */
export declare function validateQuestion(question: string): void;
/**
 * Validates query ID format
 * @param queryId - Query ID to validate
 * @throws Error if query ID is invalid
 */
export declare function validateQueryId(queryId: string): void;
/**
 * Validates chapters array
 * @param chapters - Array of chapter names
 * @throws Error if chapters array is invalid
 */
export declare function validateChapters(chapters: string[]): void;
/**
 * Validates depth parameter for documentation structure
 * @param depth - Depth value to validate
 * @throws Error if depth is invalid
 */
export declare function validateDepth(depth: number): void;
/**
 * Validates chapter depths object
 * @param chapterDepths - Object mapping chapter names to depth values
 * @throws Error if chapterDepths is invalid
 */
export declare function validateChapterDepths(chapterDepths: Record<string, number>): void;
/**
 * Validates reference numbers array
 * @param referencesNumbers - Array of reference numbers
 * @throws Error if array is invalid
 */
export declare function validateReferencesNumbers(referencesNumbers: number[]): void;
/**
 * Validates context files array
 * @param contextFiles - Array of file paths
 * @throws Error if array is invalid
 */
export declare function validateContextFiles(contextFiles: string[]): void;
/**
 * Validates context ranges object
 * @param contextRanges - Object mapping file paths to line ranges
 * @throws Error if object is invalid
 */
export declare function validateContextRanges(contextRanges: Record<string, {
    start: number;
    end: number;
}>): void;
/**
 * Validates saveToFile parameter
 * @param saveToFile - Save mode string
 * @throws Error if value is invalid
 */
export declare function validateSaveToFile(saveToFile: string): void;
/**
 * Validates action parameter for wiki parser
 * @param action - Action string
 * @throws Error if action is invalid
 */
export declare function validateAction(action: string): void;
//# sourceMappingURL=validation.d.ts.map