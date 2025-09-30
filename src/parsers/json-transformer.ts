// JSON transformer - based on the original json-to-json-parser.ts

/**
 * Statistics from DeepWiki API response
 */
export interface Stats {
  [key: string]: number;
}

/**
 * Error information from API
 */
export type ApiError = string | null;

/**
 * Redis stream identifier
 */
export type RedisStream = string | null;

/**
 * Query object from DeepWiki API
 */
export interface ApiQuery {
  user_query: string;
  use_knowledge: boolean;
  engine_id: string;
  repo_context_ids: string[];
  response: ResponseItem[];
  error: ApiError;
  state: string;
  redis_stream: RedisStream;
}

/**
 * Input response from DeepWiki automation
 */
export interface InputResponse {
  timestamp: string;
  success: boolean;
  queryId: string;
  answer: string;
  references: Reference[];
  stats: Stats;
  rawResponse: ApiQuery | ApiQuery[];
}

/**
 * File reference with line range
 */
export interface Reference {
  file_path: string;
  range_start: number;
  range_end: number;
}

/**
 * Reference data structure
 */
export interface ReferenceData {
  file_path: string;
  range_start: number;
  range_end: number;
}

/**
 * Stats data structure
 */
export interface StatsData {
  key: string;
  value: number;
}

/**
 * Individual item in API response array
 */
export interface ResponseItem {
  type: string;
  data?: string | ReferenceData | StatsData | [string, string, string];
}

export interface AnswerSegment {
  text: string;
  reference?: string;
}

export interface ReferencedFile {
  reference_range: string;
  reference_material: string;
}

export interface FullContextItem {
  file_name: string;
  text: string;
}

export interface ConversationQuery {
  user_query: string;
  answer_segments: AnswerSegment[];
}

export interface OutputResponse {
  query_id: string;
  conversation: ConversationQuery[];
  repo_context_ids: string[];
  referenced_files: Record<string, ReferencedFile[]>;
  full_context: FullContextItem[];
}

export function transformResponse(input: InputResponse): OutputResponse {
  // Handle both single query and array of queries
  const queries = Array.isArray(input.rawResponse) ? input.rawResponse : [input.rawResponse];
  
  const output: OutputResponse = {
    query_id: input.queryId,
    conversation: [],
    repo_context_ids: queries[0].repo_context_ids,
    referenced_files: {},
    full_context: []
  };

  // Process all queries in the conversation
  for (const query of queries) {
    // Process response items to create answer segments for this specific query
    const responseItems = query.response;
    let currentChunks: string[] = [];
    const queryAnswerSegments: AnswerSegment[] = [];
    
    for (const item of responseItems) {
      if (item.type === 'chunk' && item.data && typeof item.data === 'string') {
        currentChunks.push(item.data);
      } else if (item.type === 'reference' && item.data && typeof item.data === 'object' && !Array.isArray(item.data)) {
        // When we hit a reference, combine all accumulated chunks
        if (currentChunks.length > 0) {
          const referenceData = item.data as ReferenceData;
          const filePath = referenceData.file_path;
          const rangeStart = referenceData.range_start;
          const rangeEnd = referenceData.range_end;
          
          // Format reference string based on the file path format
          let referenceStr = filePath;
          
          // Handle different formats
          if (filePath.includes('Repo ')) {
            // Already formatted like "Repo openai/openai-python: README.md:0-0"
            // Extract and reformat to match desired output
            const match = filePath.match(/Repo\s+([^:]+):\s+([^:]+)(?::\d+-\d+)?/);
            if (match) {
              referenceStr = `${match[1]}: ${match[2]}`;
              if (rangeStart !== undefined && rangeEnd !== undefined) {
                referenceStr += `:${rangeStart}-${rangeEnd}`;
              }
            }
          } else {
            // Format like "openai/openai-python/README.md"
            // Convert to "openai/openai-python: README.md:range"
            const parts = filePath.split('/');
            if (parts.length >= 3) {
              const repo = parts.slice(0, 2).join('/');
              const file = parts.slice(2).join('/');
              referenceStr = `${repo}: ${file}`;
              if (rangeStart !== undefined && rangeEnd !== undefined) {
                referenceStr += `:${rangeStart}-${rangeEnd}`;
              }
            } else if (rangeStart !== undefined && rangeEnd !== undefined) {
              referenceStr += `:${rangeStart}-${rangeEnd}`;
            }
          }
          
          queryAnswerSegments.push({
            text: currentChunks.join(''),
            reference: referenceStr
          });
          
          currentChunks = [];
        }
      }
    }
    
    // Add any remaining chunks without reference
    if (currentChunks.length > 0) {
      queryAnswerSegments.push({
        text: currentChunks.join('')
      });
    }
    
    // Add this query and its answer segments to the conversation
    output.conversation.push({
      user_query: query.user_query,
      answer_segments: queryAnswerSegments
    });
  }

  // Filter out "Searching codebase..." preamble from the first chunk if it exists
  if (output.conversation.length > 0 && output.conversation[0].answer_segments.length > 0 && output.conversation[0].answer_segments[0].text) {
    const firstSegment = output.conversation[0].answer_segments[0];
    const searchPattern = 'Searching codebase...';
    
    // Check if the first segment contains the search pattern
    if (firstSegment.text.includes(searchPattern)) {
      // Find the last occurrence of the pattern
      let lastIndex = firstSegment.text.lastIndexOf(searchPattern);
      
      if (lastIndex !== -1) {
        // Find the end of the line containing the last "Searching codebase..."
        let endOfLine = firstSegment.text.indexOf('\n', lastIndex);
        if (endOfLine === -1) {
          endOfLine = firstSegment.text.length;
        }
        
        // Extract text after the last "Searching codebase..." line
        // Skip any additional newlines after it
        let remainingText = firstSegment.text.substring(endOfLine + 1);
        remainingText = remainingText.replace(/^\n+/, ''); // Remove leading newlines
        
        // Update the first segment with filtered text
        output.conversation[0].answer_segments[0].text = remainingText;
      }
    }
  }

  // Build file content map from file_contents items across all queries
  const fileContentMap: Record<string, string[]> = {};
  
  for (const query of queries) {
    for (const item of query.response) {
      if (item.type === 'file_contents' && Array.isArray(item.data)) {
        const [repoPath, filename, content] = item.data;
        const fullPath = `${repoPath}/${filename}`;
        
        // Add to full_context array
        output.full_context.push({
          file_name: fullPath,
          text: content
        });
        
        // Split content into lines for reference extraction
        // The content is in markdown format with \n line breaks
        fileContentMap[fullPath] = content.split('\n');
      }
    }
  }

  // Process references to extract referenced file content
  for (const ref of input.references) {
    // Skip references with range 0-0
    if (ref.range_start === 0 && ref.range_end === 0) {
      continue;
    }
    
    let filePath = ref.file_path;
    
    // Handle different reference formats
    // Format 1: "Repo owner/repo: path/to/file.ext:0-0"
    // Format 2: "owner/repo/path/to/file.ext"
    if (filePath.includes('Repo ')) {
      // Extract the actual file path from format like "Repo openai/openai-python: README.md:0-0"
      const match = filePath.match(/Repo\s+([^:]+):\s+([^:]+)(?::\d+-\d+)?/);
      if (match) {
        filePath = `${match[1]}/${match[2]}`;
      }
    }
    
    if (!output.referenced_files[filePath]) {
      output.referenced_files[filePath] = [];
    }
    
    // Get the actual content for this reference
    let referenceMaterial = '';
    
    // Find the matching file content
    const fileLines = fileContentMap[filePath];
    if (fileLines) {
      // Extract lines from range_start to range_end (inclusive)
      // The references are 0-based, but we need to adjust:
      // - Keep startLine as is (subtracting 1 to align with current behavior)
      // - Use range_end directly (not subtracting 1) to include one more line
      const startLine = Math.max(0, ref.range_start - 1);
      const endLine = Math.min(fileLines.length - 1, ref.range_end);
      
      if (startLine <= endLine) {
        const extractedLines = fileLines.slice(startLine, endLine + 1);
        referenceMaterial = extractedLines.join('\n');
        // No truncation - keep full content
      }
    }
    
    output.referenced_files[filePath].push({
      reference_range: `${ref.range_start}-${ref.range_end}`,
      reference_material: referenceMaterial
    });
  }

  return output;
}
