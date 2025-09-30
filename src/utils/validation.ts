/**
 * Validation utilities for MCP tool parameters
 */

/**
 * Validates GitHub repository format (owner/repo)
 * @param repo - Repository string to validate
 * @throws Error if repo format is invalid
 */
export function validateRepo(repo: string): void {
  if (!repo || typeof repo !== 'string') {
    throw new Error('Repository is required and must be a string');
  }

  const trimmed = repo.trim();
  if (trimmed.length === 0) {
    throw new Error('Repository cannot be empty');
  }

  // Check for basic owner/repo format
  const parts = trimmed.split('/');
  if (parts.length !== 2) {
    throw new Error(
      `Invalid repository format. Expected "owner/repo", got "${repo}"`
    );
  }

  const [owner, repoName] = parts;
  if (!owner || !repoName) {
    throw new Error(
      `Invalid repository format. Both owner and repo name are required, got "${repo}"`
    );
  }

  // Check for valid GitHub username/org characters (alphanumeric, hyphens)
  const validPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  if (!validPattern.test(owner)) {
    throw new Error(
      `Invalid repository owner "${owner}". Must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen.`
    );
  }
  if (!validPattern.test(repoName)) {
    throw new Error(
      `Invalid repository name "${repoName}". Must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen.`
    );
  }
}

/**
 * Validates question text
 * @param question - Question string to validate
 * @throws Error if question is invalid
 */
export function validateQuestion(question: string): void {
  if (!question || typeof question !== 'string') {
    throw new Error('Question is required and must be a string');
  }

  const trimmed = question.trim();
  if (trimmed.length === 0) {
    throw new Error('Question cannot be empty');
  }

  if (trimmed.length > 10000) {
    throw new Error(
      `Question is too long (${trimmed.length} characters). Maximum length is 10,000 characters.`
    );
  }
}

/**
 * Validates query ID format
 * @param queryId - Query ID to validate
 * @throws Error if query ID is invalid
 */
export function validateQueryId(queryId: string): void {
  if (!queryId || typeof queryId !== 'string') {
    throw new Error('Query ID is required and must be a string');
  }

  const trimmed = queryId.trim();
  if (trimmed.length === 0) {
    throw new Error('Query ID cannot be empty');
  }

  // Query IDs from DeepWiki appear to be alphanumeric with possible hyphens/underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    throw new Error(
      `Invalid query ID format "${queryId}". Must contain only alphanumeric characters, hyphens, and underscores.`
    );
  }
}

/**
 * Validates chapters array
 * @param chapters - Array of chapter names
 * @throws Error if chapters array is invalid
 */
export function validateChapters(chapters: string[]): void {
  if (!Array.isArray(chapters)) {
    throw new Error('Chapters must be an array');
  }

  if (chapters.length === 0) {
    throw new Error('Chapters array cannot be empty');
  }

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    if (typeof chapter !== 'string') {
      throw new Error(`Chapter at index ${i} must be a string, got ${typeof chapter}`);
    }

    if (chapter.trim().length === 0) {
      throw new Error(`Chapter at index ${i} cannot be empty`);
    }
  }
}

/**
 * Validates depth parameter for documentation structure
 * @param depth - Depth value to validate
 * @throws Error if depth is invalid
 */
export function validateDepth(depth: number): void {
  if (typeof depth !== 'number') {
    throw new Error(`Depth must be a number, got ${typeof depth}`);
  }

  if (!Number.isInteger(depth)) {
    throw new Error(`Depth must be an integer, got ${depth}`);
  }

  if (depth < 1 || depth > 4) {
    throw new Error(`Depth must be between 1 and 4, got ${depth}`);
  }
}

/**
 * Validates chapter depths object
 * @param chapterDepths - Object mapping chapter names to depth values
 * @throws Error if chapterDepths is invalid
 */
export function validateChapterDepths(chapterDepths: Record<string, number>): void {
  if (typeof chapterDepths !== 'object' || chapterDepths === null || Array.isArray(chapterDepths)) {
    throw new Error('Chapter depths must be an object');
  }

  const entries = Object.entries(chapterDepths);
  if (entries.length === 0) {
    throw new Error('Chapter depths object cannot be empty');
  }

  for (const [chapter, depth] of entries) {
    if (chapter.trim().length === 0) {
      throw new Error('Chapter name in chapterDepths cannot be empty');
    }

    validateDepth(depth);
  }
}

/**
 * Validates reference numbers array
 * @param referencesNumbers - Array of reference numbers
 * @throws Error if array is invalid
 */
export function validateReferencesNumbers(referencesNumbers: number[]): void {
  if (!Array.isArray(referencesNumbers)) {
    throw new Error('References numbers must be an array');
  }

  if (referencesNumbers.length === 0) {
    throw new Error('References numbers array cannot be empty');
  }

  for (let i = 0; i < referencesNumbers.length; i++) {
    const refNum = referencesNumbers[i];
    if (typeof refNum !== 'number') {
      throw new Error(
        `Reference number at index ${i} must be a number, got ${typeof refNum}`
      );
    }

    if (!Number.isInteger(refNum)) {
      throw new Error(
        `Reference number at index ${i} must be an integer, got ${refNum}`
      );
    }

    if (refNum < 1) {
      throw new Error(
        `Reference number at index ${i} must be positive, got ${refNum}`
      );
    }
  }
}

/**
 * Validates context files array
 * @param contextFiles - Array of file paths
 * @throws Error if array is invalid
 */
export function validateContextFiles(contextFiles: string[]): void {
  if (!Array.isArray(contextFiles)) {
    throw new Error('Context files must be an array');
  }

  if (contextFiles.length === 0) {
    throw new Error('Context files array cannot be empty');
  }

  for (let i = 0; i < contextFiles.length; i++) {
    const file = contextFiles[i];
    if (typeof file !== 'string') {
      throw new Error(
        `Context file at index ${i} must be a string, got ${typeof file}`
      );
    }

    if (file.trim().length === 0) {
      throw new Error(`Context file at index ${i} cannot be empty`);
    }
  }
}

/**
 * Validates context ranges object
 * @param contextRanges - Object mapping file paths to line ranges
 * @throws Error if object is invalid
 */
export function validateContextRanges(contextRanges: Record<string, { start: number; end: number }>): void {
  if (typeof contextRanges !== 'object' || contextRanges === null || Array.isArray(contextRanges)) {
    throw new Error('Context ranges must be an object');
  }

  const entries = Object.entries(contextRanges);
  if (entries.length === 0) {
    throw new Error('Context ranges object cannot be empty');
  }

  for (const [file, range] of entries) {
    if (file.trim().length === 0) {
      throw new Error('File path in contextRanges cannot be empty');
    }

    if (typeof range !== 'object' || range === null || Array.isArray(range)) {
      throw new Error(`Range for file "${file}" must be an object`);
    }

    if (typeof range.start !== 'number' || !Number.isInteger(range.start)) {
      throw new Error(
        `Start line for file "${file}" must be an integer, got ${typeof range.start}`
      );
    }

    if (typeof range.end !== 'number' || !Number.isInteger(range.end)) {
      throw new Error(
        `End line for file "${file}" must be an integer, got ${typeof range.end}`
      );
    }

    if (range.start < 1) {
      throw new Error(
        `Start line for file "${file}" must be positive, got ${range.start}`
      );
    }

    if (range.end < range.start) {
      throw new Error(
        `End line (${range.end}) for file "${file}" must be greater than or equal to start line (${range.start})`
      );
    }
  }
}

/**
 * Validates saveToFile parameter
 * @param saveToFile - Save mode string
 * @throws Error if value is invalid
 */
export function validateSaveToFile(saveToFile: string): void {
  if (typeof saveToFile !== 'string') {
    throw new Error(`saveToFile must be a string, got ${typeof saveToFile}`);
  }

  const normalized = saveToFile.toLowerCase();
  if (normalized !== 'save-only' && normalized !== 'save-and-show') {
    throw new Error(
      `saveToFile must be either "save-only" or "save-and-show", got "${saveToFile}"`
    );
  }
}

/**
 * Validates action parameter for wiki parser
 * @param action - Action string
 * @throws Error if action is invalid
 */
export function validateAction(action: string): void {
  if (typeof action !== 'string') {
    throw new Error(`Action must be a string, got ${typeof action}`);
  }

  const normalized = action.toLowerCase();
  if (normalized !== 'structure' && normalized !== 'extract') {
    throw new Error(
      `Action must be either "structure" or "extract", got "${action}"`
    );
  }
}