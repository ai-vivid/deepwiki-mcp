// Shared file helper utilities
import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';
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
export function generateDescriptiveName(question) {
    let description = 'query';
    if (question) {
        // Extract first few meaningful words from question
        const words = question
            .toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !['how', 'what', 'why', 'when', 'where', 'the', 'and', 'for', 'with'].includes(word))
            .slice(0, 3)
            .join('-');
        description = words || 'query';
    }
    return description;
}
/**
 * Convert repo string to folder name
 * @param repo - Repository in format 'owner/repo'
 * @returns Folder name with '/' replaced by '-'
 */
export function getRepoFolder(repo) {
    return repo.replace('/', '-');
}
/**
 * Get the default directory for saving outputs
 * @returns Default directory path
 */
function getDefaultDirectory() {
    return process.env.default_directory || join(homedir(), '.deepwiki-mcp', 'output');
}
/**
 * Ensure output folder structure exists
 * @param repo - Repository in format 'owner/repo'
 * @param type - Type of content ('question' or 'wiki')
 * @returns Path to the output directory
 */
export async function ensureOutputStructure(repo, type) {
    const defaultDir = getDefaultDirectory();
    const repoFolder = getRepoFolder(repo);
    const subfolder = type === 'question' ? 'questions' : 'wiki';
    const outputPath = join(defaultDir, repoFolder, subfolder);
    await mkdir(outputPath, { recursive: true });
    return outputPath;
}
/**
 * Get allowed directories from environment variable
 * @returns Array of allowed directory paths
 */
function getAllowedDirectories() {
    const defaultAllowed = [
        resolve(homedir(), '.deepwiki-mcp'),
        resolve(getDefaultDirectory())
    ];
    // Check if custom allowed directories are specified
    const customDirs = process.env.allowed_directories;
    if (!customDirs) {
        return defaultAllowed;
    }
    // Parse comma-separated list of directories
    const parsedDirs = customDirs
        .split(',')
        .map(dir => dir.trim())
        .filter(dir => dir.length > 0)
        .map(dir => resolve(dir));
    if (parsedDirs.length === 0) {
        console.error('Warning: allowed_directories is empty, using defaults');
        return defaultAllowed;
    }
    return parsedDirs;
}
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
export function validateSaveLocation(saveLocation) {
    if (!saveLocation || typeof saveLocation !== 'string') {
        throw new Error('Invalid save location: must be a non-empty string');
    }
    // Resolve to absolute path
    const resolvedPath = resolve(saveLocation);
    // Get allowed base directories
    const allowedBases = getAllowedDirectories();
    // Check if the resolved path is within any allowed base directory
    const isWithinAllowedBase = allowedBases.some(base => resolvedPath.startsWith(base));
    if (!isWithinAllowedBase) {
        throw new Error(`Invalid save location: must be within one of the allowed directories: ${allowedBases.join(', ')}. Got: ${saveLocation}`);
    }
    // Additional checks for dangerous patterns in the original input
    if (saveLocation.includes('..')) {
        throw new Error('Invalid save location: path traversal patterns not allowed');
    }
    return resolvedPath;
}
//# sourceMappingURL=file-helpers.js.map