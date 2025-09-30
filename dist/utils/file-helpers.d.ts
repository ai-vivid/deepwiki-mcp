/**
 * Generate a descriptive filename-safe name from a question string
 *
 * Extracts the first 3 meaningful words (longer than 2 characters,
 * excluding common words) and converts them to kebab-case.
 *
 * @param question - The question text to convert
 * @returns A kebab-case string suitable for filenames
 *
 * @example
 * generateDescriptiveName("How does the authentication work?")
 * // => "does-authentication-work"
 *
 * @example
 * generateDescriptiveName("What is React reconciliation?")
 * // => "react-reconciliation"
 *
 * @example
 * generateDescriptiveName(undefined)
 * // => "query"
 */
export declare function generateDescriptiveName(question?: string): string;
/**
 * Convert repo string to folder name
 * @param repo - Repository in format 'owner/repo'
 * @returns Folder name with '/' replaced by '-'
 */
export declare function getRepoFolder(repo: string): string;
/**
 * Ensure output folder structure exists
 * @param repo - Repository in format 'owner/repo'
 * @param type - Type of content ('question' or 'wiki')
 * @returns Path to the output directory
 */
export declare function ensureOutputStructure(repo: string, type: string): Promise<string>;
/**
 * Validate that a save location path is safe and within allowed directories
 *
 * This function provides security by:
 * - Checking that the path is within allowed directories (from config)
 * - Blocking path traversal patterns (..)
 * - Resolving to absolute paths
 *
 * Allowed directories are configured via the `allowed_directories` environment
 * variable, or default to ~/.deepwiki-mcp and the default output directory.
 *
 * @param saveLocation - User-provided save location path (can be relative or absolute)
 * @returns Validated absolute path
 * @throws {Error} If path is invalid, empty, or outside allowed directories
 * @throws {Error} If path contains traversal patterns (..)
 *
 * @example
 * // Valid: within allowed directory
 * validateSaveLocation("~/.deepwiki-mcp/output/myfile.md")
 * // => "/Users/username/.deepwiki-mcp/output/myfile.md"
 *
 * @example
 * // Invalid: outside allowed directories
 * validateSaveLocation("/tmp/file.md")
 * // => throws Error
 *
 * @example
 * // Invalid: path traversal
 * validateSaveLocation("~/.deepwiki-mcp/../../../etc/passwd")
 * // => throws Error
 */
export declare function validateSaveLocation(saveLocation: string): string;
//# sourceMappingURL=file-helpers.d.ts.map