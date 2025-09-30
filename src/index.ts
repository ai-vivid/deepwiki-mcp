#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { cacheManager } from "./cache/cache-manager.js";
import { wikiParserTool } from "./tools/wiki-parser.js";
import { wikiQuestionTool } from "./tools/wiki-question.js";
import {
  getRepoFolder,
  ensureOutputStructure,
  validateSaveLocation
} from "./utils/file-helpers.js";

// Override console to prevent any output that would interfere with JSON-RPC
const noop = () => {};
global.console = {
  ...console,
  log: noop,
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
  trace: noop,
} as Console;

// Create the MCP server
const server = new McpServer({
  name: "deepwiki-mcp",
  version: "1.0.0",
  description: "MCP server for DeepWiki.com integration"
});

// Initialize cache on startup
await cacheManager.init();

// Helper function for wiki file naming
function generateWikiDescription(action: string, chapters?: string[]): string {
  if (action === 'structure') {
    return 'structure';
  } else if (action === 'extract' && chapters) {
    if (chapters.length === 1) {
      const chapter = chapters[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
      return `${chapter}-extract`;
    } else {
      return `${chapters.length}-chapters`;
    }
  }
  return 'wiki-content';
}

// Define the wiki parser tool
server.tool(  
  "wiki_parser",
  `A comprehensive tool for parsing and extracting content from DeepWiki documentation pages.
This tool helps you navigate and extract specific content from DeepWiki's AI-generated documentation for GitHub repositories.
DeepWiki analyzes codebases and creates detailed, structured documentation making complex projects easier to understand.

When to use this tool:
- Getting a table of contents or structure overview of a repository's documentation
- Extracting specific chapters or sections from the documentation
- Understanding the organization of a project's documentation
- Pulling detailed explanations of specific components or features
- Gathering comprehensive documentation for offline use or analysis

Key features:
- View documentation structure with customizable depth levels
- Extract single or multiple chapters/sections
- Support for nested section extraction using "Chapter##Section" format
- Flexible depth control per chapter
- Optional file saving with customizable paths
- Efficient caching for repeated requests

Usage examples:
1. Get overview of documentation structure:
   action: "structure", depth: 2
   
2. Extract a complete chapter:
   action: "extract", chapters: ["Introduction"]
   
3. Extract specific sections from multiple chapters:
   action: "extract", chapters: ["Setup##Installation", "Configuration##Environment Variables", "API##Core Methods"]
   
4. Extract with custom depth per chapter:
   action: "extract", chapters: ["API", "Examples"], chapterDepths: {"API": 4, "Examples": 2}
   
5. Save documentation for offline use:
   action: "extract", chapters: ["Introduction", "Setup", "Configuration"], saveToFile: "save-and-show"`,
  {
    repo: z.string().describe("GitHub repository in 'owner/repo' format (e.g., 'facebook/react')"),
    action: z.enum(["structure", "extract"]).describe("'structure' to see table of contents, 'extract' to get chapter content"),
    chapters: z.array(z.string()).optional().describe("Chapter names to extract, can include sections like 'Setup##Installation'"),
    depth: z.number().min(1).max(4).optional().describe("For structure view, how many header levels deep to show (1-4)"),
    chapterDepths: z.record(z.string(), z.number()).optional().describe("Override depth for specific chapters (e.g., {'Introduction': 2, 'API': 3})"),
    saveToFile: z.string().optional().describe("'save-only' returns just file path, 'save-and-show' returns content + saves"),
    saveLocation: z.string().optional().describe("Custom file path for saving (defaults to ~/.deepwiki-mcp/output/)")
  },
  async (params) => {
    try {
      const result = await wikiParserTool(params);
      
      // Handle file saving if requested
      if (params.saveToFile && (params.saveToFile.toLowerCase() === 'save-only' || params.saveToFile.toLowerCase() === 'save-and-show')) {
        const { writeFile, mkdir } = await import('fs/promises');
        const { join, dirname } = await import('path');
        
        // Generate structured file path
        let filePath: string;
        
        if (params.saveLocation) {
          // Validate and resolve the save location path
          filePath = validateSaveLocation(params.saveLocation);
          await mkdir(dirname(filePath), { recursive: true });
        } else {
          const outputPath = await ensureOutputStructure(params.repo, 'wiki');
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
          const description = generateWikiDescription(params.action, params.chapters);
          
          const filename = `${dateStr}_${timeStr}_${description}.md`;
          filePath = join(outputPath, filename);
        }
        
        // Ensure directory exists and save file (synchronous - waits for completion)
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, result, 'utf-8');
        console.error(`Output saved to: ${filePath}`);

        if (params.saveToFile.toLowerCase() === 'save-only') {
          return {
            content: [{ type: "text", text: `Output saved to: ${filePath}` }]
          };
        } else {
          return {
            content: [{ type: "text", text: `Output saved to: ${filePath}\n\n---\n\n${result}` }]
          };
        }
      }
      
      // Normal return without saving
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }],
        isError: true
      };
    }
  }
);

// Define the wiki question tool
server.tool(
  "wiki_question", 
  `A powerful tool for asking questions about GitHub repositories using DeepWiki's AI analysis.
This tool provides intelligent answers based on deep codebase analysis, with the ability to retrieve specific code snippets and file contents.
DeepWiki's AI examines the entire repository structure, code patterns, and relationships to provide accurate, context-aware answers.

When to use this tool:
- Understanding how a specific feature or system works in a repository
- Getting explanations of complex code implementations
- Finding where specific functionality is implemented
- Understanding architectural decisions and patterns
- Retrieving exact code snippets that answer your questions
- Getting full file contents for detailed analysis
- Following up on previous questions with cached results
- Going deeper on existing queries for more detailed analysis
- Sending follow-up questions to continue conversations

⚠️ Important: Do NOT ask for specific files in new questions (e.g., "show me auth.js"). Instead ask conceptual questions and use queryId to retrieve referenced files.

Key features:
- Ask natural language questions about any GitHub repository
- Retrieve exact code snippets that DeepWiki referenced in its answer
- Get complete file contents or specific line ranges
- Use cached results for efficient follow-up queries
- Optional deep research mode for comprehensive analysis (3-15 minutes) - consider running in tmux for background processing
- Go deeper functionality for existing queries to get more detailed analysis
- Follow-up questions to continue conversations with existing queries (supports deep research)
- Save responses to files for documentation or sharing
- Flexible output control to show only what you need

CRITICAL: Understanding when to use queryId vs new question:
- USE queryId when: Getting references/files from previous response, asking follow-ups about the same topic, going deeper, sending follow-up questions
- USE new question when: Asking something completely different, no previous query exists

Usage examples:
1. Ask a new question:
   question: "How does the authentication system work?", includeReferencesList: true
   
2. Get specific references from previous query:
   queryId: "query-12345", referencesNumbers: [1, 2], includeAnswer: false
   
3. Get full file content from previous query:
   queryId: "query-12345", contextFiles: ["src/auth/login.ts"], includeAnswer: false
   
4. Get specific line ranges:
   queryId: "query-12345", contextFiles: ["src/index.ts"], contextRanges: {"src/index.ts": {"start": 100, "end": 150}}
   
5. Deep research with file saving:
   question: "Explain the entire data flow architecture", useDeepResearch: true, saveToFile: "save-and-show"
   
6. Go deeper on existing query:
   queryId: "query-12345", goDeeper: true
   
7. Send follow-up question (shows only new response):
   queryId: "query-12345", followUpQuestion: "Can you explain how error handling works?", includeFullConversation: false
   
8. Send follow-up with deep research (shows full conversation):
   queryId: "query-12345", followUpQuestion: "What are the security implications?", useDeepResearch: true, includeFullConversation: true
   
9. Get all code snippets without the explanation:
   queryId: "query-12345", referencesAll: true, includeAnswer: false, includeReferencesList: false

Important notes:
- referencesNumbers gets the EXACT snippets DeepWiki used (not full files)
- contextFiles gets COMPLETE file contents (not just snippets)
- Always check the queryId in responses for follow-up queries
- Deep research mode provides more comprehensive analysis but takes significantly longer - consider using tmux for background execution
- goDeeper creates a new query with deeper analysis on existing queries - returns a new queryId
- followUpQuestion continues existing conversation with same queryId, supports deep research
- includeFullConversation=false (default) shows only new response; true shows complete conversation
- Use queryId instead of question when following up on previous responses`,
  {
    repo: z.string().describe("GitHub repository in 'owner/repo' format"),
    question: z.string().optional().describe("Your question about the repository (required for NEW queries only)"),
    queryId: z.string().optional().describe("ID from previous response (required when using cached data)"),
    useDeepResearch: z.boolean().optional().describe("Enable deep analysis mode (takes 3-15 minutes, use sparingly)"),
    goDeeper: z.boolean().optional().describe("Go deeper on existing query for more detailed analysis (requires queryId)"),
    followUpQuestion: z.string().optional().describe("Send a follow-up question to existing query (requires queryId)"),
    includeFullConversation: z.boolean().optional().default(false).describe("For follow-ups: include full conversation history (default: false, shows only new response)"),
    includeAnswer: z.boolean().optional().default(true).describe("Show the AI's text explanation (default: true)"),
    includeReferencesList: z.boolean().optional().default(true).describe("Show numbered list of referenced files (default: true)"),
    referencesAll: z.boolean().optional().describe("Get ALL exact code snippets DeepWiki referenced"),
    referencesNumbers: z.array(z.number()).optional().describe("Get specific reference snippets by number (e.g., [1, 2, 3])"),
    contextAll: z.boolean().optional().describe("Get complete contents of ALL available files"),
    contextFiles: z.array(z.string()).optional().describe("Get complete contents of specific files (e.g., ['src/index.ts', 'lib/utils.js'])"),
    contextRanges: z.record(z.string(), z.object({
      start: z.number(),
      end: z.number()
    })).optional().describe("Get specific line ranges from files (e.g., {'src/index.ts': {'start': 10, 'end': 50}})"),
    saveToFile: z.string().optional().describe("'save-only' or 'save-and-show' to save output"),
    saveLocation: z.string().optional().describe("Custom file path for saving")
  },
  async (params) => {
    try {
      // Validate that either question or queryId is provided
      if (!params.question && !params.queryId) {
        throw new Error("Either 'question' or 'queryId' must be provided");
      }
      
      // Validate goDeeper requires queryId
      if (params.goDeeper && !params.queryId) {
        throw new Error("'queryId' is required when using 'goDeeper'");
      }
      
      // Validate followUpQuestion requires queryId
      if (params.followUpQuestion && !params.queryId) {
        throw new Error("'queryId' is required when using 'followUpQuestion'");
      }
      
      // Validate conflicting actions
      const actions = [params.question, params.goDeeper, params.followUpQuestion].filter(Boolean);
      if (actions.length > 1) {
        throw new Error("Cannot use 'question', 'goDeeper', and 'followUpQuestion' together. Choose one action.");
      }
      
      // Convert contextRanges object to Map if present
      const contextRangesMap = params.contextRanges 
        ? new Map(Object.entries(params.contextRanges))
        : undefined;
      
      const result = await wikiQuestionTool({
        ...params,
        contextRanges: contextRangesMap
      });
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }],
        isError: true
      };
    }
  }
);

// Add a resource to list available wikis (optional)
server.resource(
  "available-commands",
  "deepwiki://commands",
  async () => ({
    contents: [{
      uri: "deepwiki://commands",
      text: `# DeepWiki MCP Server

This MCP server provides access to DeepWiki.com, which creates comprehensive documentation for GitHub repositories using AI. DeepWiki analyzes codebases and generates detailed explanations, making it easier to understand complex projects.

## wiki_parser
Parse and extract content from DeepWiki's generated documentation pages.

### Parameters:
- repo: Repository in format 'owner/repo' (required)
- action: 'structure' (show table of contents) or 'extract' (get specific content)
- chapters: Which chapters to extract using format "Chapter Title" or "Chapter Title##Section Name"
- depth: For structure view, how many header levels to show (1-4)
- chapterDepths: Override depth for specific chapters

### Usage Examples:
- Get table of contents: action="structure", depth=2
- Extract full chapter: action="extract", chapters=["Introduction"]
- Extract specific section: action="extract", chapters=["Setup##Installation"]
- Extract multiple chapters with sections: action="extract", chapters=["Introduction", "Setup##Installation", "Configuration##Environment Variables"]

## wiki_question

### ⚠️ CRITICAL: When to use queryId vs new question

**USE queryId (cached response) when user asks for:**
- References from previous query: "give me reference 1", "show me the first reference"
- Content from files already mentioned: "show me lines 1-10 of filename.ts"
- Details about previous answer: "explain that code", "give me more context"
- Go deeper analysis: "go deeper on this query", "analyze this more deeply"
- Follow-up questions: "can you explain more about X?", "what about Y?"
- ANY content from files listed in previous "References" or "Full Context Files"

**Example - Getting specific file content from cached response:**
repo: "owner/repo"
queryId: "previous-query-id-12345"
includeAnswer: false
includeReferencesList: false
contextFiles: ["filename.ts"]
contextRanges: {"filename.ts": {"start": 1, "end": 10}}

**Example - Getting specific references:**
repo: "owner/repo" 
queryId: "previous-query-id-12345"
includeAnswer: false
includeReferencesList: false
referencesNumbers: [1, 2]

**Example - Go Deeper analysis:**
repo: "owner/repo"
queryId: "previous-query-id-12345"
goDeeper: true

**Example - Follow-up question (new response only):**
repo: "owner/repo"
queryId: "previous-query-id-12345"
followUpQuestion: "Can you explain the error handling?"
includeFullConversation: false

**Example - Follow-up with deep research (full conversation):**
repo: "owner/repo"
queryId: "previous-query-id-12345"
followUpQuestion: "What are the security implications?"
useDeepResearch: true
includeFullConversation: true

### ⚠️ ONLY use NEW question when:
- User asks completely different question not related to previous response
- User asks about files NOT mentioned in previous response
- No previous queryId exists

### Parameters Explained:

**Basic Parameters:**
- repo: Repository in format 'owner/repo' (required)
- question: Your question about the repository (required for NEW questions only)
- queryId: Query ID from previous response (required when using cached data)
- useDeepResearch: Use deep research mode - takes 3-15 minutes, only use when necessary
- goDeeper: Execute Go Deeper analysis on existing query (requires queryId, creates new query)
- followUpQuestion: Send follow-up question to existing query (requires queryId, keeps same query)
- includeFullConversation: For follow-ups, include full conversation history (default: false)

**Output Control:**
- includeAnswer: Include the text answer/explanation (default: true)
- includeReferencesList: Show numbered list of referenced files (default: true)

**Getting Code Content - Two Types:**

1. **Reference Code Snippets** (specific code ranges DeepWiki used in its answer)
   - referencesAll: Get the EXACT CODE SNIPPETS/RANGES that DeepWiki referenced
   - referencesNumbers: Get EXACT CODE SNIPPETS/RANGES for specific references [1,2,3]
   
2. **Full File Contents** (complete files, not just snippets)
   - contextAll: Get COMPLETE FULL FILE CONTENT of all available files
   - contextFiles: Get COMPLETE FULL FILE CONTENT of specific files ["filename.ts"]
   - contextRanges: Get SPECIFIC LINE RANGES you choose {"filename.ts": {"start": 1, "end": 50}}

**IMPORTANT:** 
- referencesNumbers=[1] gets the code snippet DeepWiki referenced as #1
- contextFiles=["file.ts"] gets the entire file content
- includeReferencesList=false hides the reference list but you can still get reference content

**Saving Output to File:**
- saveToFile: "save-only": Saves output to file and returns only the query ID and file path
- saveToFile: "save-and-show": Saves output to file and also displays the full result
- saveLocation: Custom file path (default: ~/.deepwiki-mcp/output/repo_timestamp.md)

**Example - Save response to file:**
repo: "owner/repo"
question: "How does the authentication system work?"
saveToFile: "save-only"
# Returns: Query ID: query-12345
# Output saved to: /path/to/file.md
`
    }]
  })
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);