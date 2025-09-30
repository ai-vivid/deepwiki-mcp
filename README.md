# DeepWiki MCP Server

**Give Claude superpowers to understand any codebase instantly.**

This MCP (Model Context Protocol) server connects Claude to [DeepWiki](https://deepwiki.org), an AI-powered platform by Cognition Labs (creators of Devin AI) that provides **"Deep Research for GitHub"** - interactive, up-to-date documentation for any public repository. With this integration, Claude can explore, analyze, and answer questions about any GitHub codebase - without you having to manually copy-paste code or documentation.

## ⚠️ Disclaimer

**This is a learning/experimental project created through AI-assisted "vibe coding".**

- The author is not a professional developer
- This entire MCP server was built using Claude Opus 4.0 (vibe coding)
- Code quality improvements and auditing done with Claude Sonnet 4.5
- Provided as-is for educational and experimental purposes only
- Use at your own risk - see LICENSE for full disclaimer

## What is DeepWiki?

[DeepWiki](https://deepwiki.org) is an AI platform by **Cognition Labs** (the team behind Devin AI) that automatically transforms any public GitHub repository into interactive, conversational documentation.

**How it works:**
- Visit any repo: `github.com/facebook/react`
- Change URL to: `deepwiki.org/facebook/react`
- Get instant access to AI-generated architecture diagrams, documentation, and an interactive chatbot

DeepWiki analyzes the code structure, relationships, and patterns, then creates up-to-date documentation you can have conversations with - like having an expert who has deeply studied the codebase and can answer questions about it.

## What Does This MCP Do?

This MCP server acts as a **command-line tool that Claude can use automatically** when you ask questions about code. When you chat with Claude Desktop and mention a GitHub repository, Claude can:

1. **Read Documentation**: Fetch and parse DeepWiki's generated documentation for any repo
2. **Ask Questions**: Query DeepWiki's AI to understand how code works, find implementations, or explore architecture
3. **Get Code Snippets**: Retrieve exact code references that answer your questions
4. **Deep Research**: Trigger comprehensive analysis for complex questions (3-15 minutes)
5. **Cache Results**: Store responses locally for instant retrieval in follow-up questions

**You don't directly use this tool** - instead, you talk to Claude naturally, and Claude decides when to use these tools to help answer your questions.

## Key Benefits

✅ **Understand unfamiliar codebases instantly** - No need to clone repos or wade through docs
✅ **Ask natural questions** - "How does authentication work?" instead of reading thousands of lines
✅ **Get exact code references** - Automatically retrieves relevant snippets with file paths and line numbers
✅ **Follow-up conversations** - Ask deeper questions based on previous answers
✅ **Save research** - Export findings to markdown files for documentation
✅ **Works with any public GitHub repo** - React, Next.js, your company's repos, etc.

## Installation

### Prerequisites
- Node.js 18 or higher
- Claude Desktop app

### Setup Steps

1. **Clone this repository:**
   ```bash
   git clone https://github.com/ai-vivid/deepwiki-mcp.git
   cd deepwiki-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers** (required for web automation):
   ```bash
   npx playwright install chromium
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Add to Claude Desktop configuration:**

   On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "deepwiki": {
         "command": "node",
         "args": ["/absolute/path/to/deepwiki-mcp/dist/index.js"]
       }
     }
   }
   ```

   Replace `/absolute/path/to/deepwiki-mcp` with your actual installation path.

6. **Restart Claude Desktop**

## How to Use

Just chat naturally with Claude! Here are example conversations:

**Example 1: Understanding a new framework**
```
You: "Can you explain how Next.js handles server-side rendering?"

Claude: *uses wiki_question tool to query DeepWiki about vercel/next.js*

Claude: "Next.js handles SSR through..."
```

**Example 2: Finding implementations**
```
You: "Show me how React implements hooks"

Claude: *retrieves code snippets from facebook/react*

Claude: "Here's the hooks implementation from ReactFiberHooks.js..."
```

**Example 3: Deep research**
```
You: "I need a comprehensive explanation of how Kubernetes manages container orchestration"

Claude: *triggers deep research mode for kubernetes/kubernetes*

Claude: "Starting deep research - this will take 5-10 minutes..."
*returns detailed architectural analysis*
```

## Available Tools (For Claude's Use)

Claude automatically decides when to use these tools. This section explains what each tool does **for your understanding**, but you don't need to call them directly.

### Tool 1: `wiki_parser`

**Purpose:** Reads DeepWiki's static documentation pages for a repository.

**When Claude uses it:**
- You ask for an overview of a project's structure
- You want to see the table of contents for documentation
- You request specific chapters from the documentation

**Parameters Claude can set:**

| Parameter | What it does | Example value |
|-----------|--------------|---------------|
| `repo` | GitHub repository to query | `"facebook/react"` |
| `action` | `"structure"` = show table of contents<br>`"extract"` = get specific content | `"extract"` |
| `chapters` | Specific chapters to retrieve | `["Getting Started", "API Reference"]` |
| `depth` | How many heading levels to show (1-4) | `2` |
| `saveToFile` | `"save-only"` = just save to file<br>`"save-and-show"` = save and display | `"save-and-show"` |

**Example - What Claude does:**
```javascript
// When you ask: "Show me the React documentation structure"
wiki_parser({
  repo: "facebook/react",
  action: "structure",
  depth: 2
})

// Returns: A table of contents with 2 levels of headers
// Output looks like:
// 1: Getting Started
//   ## Installation
//   ## Quick Start
// 2: Main Concepts
//   ## Components
//   ## Props & State
```

**Example - Extracting specific content:**
```javascript
// When you ask: "Get me the Getting Started guide from React docs"
wiki_parser({
  repo: "facebook/react",
  action: "extract",
  chapters: ["Getting Started"]
})

// Returns: Full markdown content of the "Getting Started" chapter
```

### Tool 2: `wiki_question`

**Purpose:** Asks DeepWiki's AI questions about a repository and gets intelligent answers with code references.

**When Claude uses it:**
- You ask how something works in a codebase
- You want to find specific implementations
- You need architectural explanations
- You ask follow-up questions about previous answers

**Parameters Claude can set:**

| Parameter | What it does | Example value |
|-----------|--------------|---------------|
| `repo` | GitHub repository to query | `"facebook/react"` |
| `question` | Your question (for new queries) | `"How does React implement hooks?"` |
| `queryId` | ID from previous answer (for follow-ups) | `"query-abc123"` |
| `useDeepResearch` | Enable 3-15 minute deep analysis | `true` |
| `goDeeper` | Get more details on previous query | `true` |
| `followUpQuestion` | Ask follow-up on same topic | `"What about error handling?"` |
| `includeAnswer` | Show the text explanation | `true` (default) |
| `includeReferencesList` | Show numbered file references | `true` (default) |
| `referencesNumbers` | Get specific code snippets by number | `[1, 2, 3]` |
| `contextFiles` | Get full content of specific files | `["src/hooks.js"]` |
| `contextRanges` | Get specific line ranges | `{"src/hooks.js": {"start": 1, "end": 50}}` |
| `saveToFile` | Save response to file | `"save-and-show"` |

**Example 1 - Basic question:**
```javascript
// When you ask: "How does React handle component state?"
wiki_question({
  repo: "facebook/react",
  question: "How does React handle component state?"
})

// Returns:
// Query ID: query-abc123
//
// # Answer
// React handles component state through the useState hook...
// [1] [2]
//
// # References
// [1]: facebook/react: src/ReactHooks.js:45-67
// [2]: facebook/react: src/ReactFiberHooks.js:120-145
```

**Example 2 - Getting specific code snippets:**
```javascript
// When you say: "Show me the code for reference 1 from that last answer"
wiki_question({
  repo: "facebook/react",
  queryId: "query-abc123",           // From previous response
  includeAnswer: false,              // Don't repeat the explanation
  includeReferencesList: false,      // Don't show the reference list again
  referencesNumbers: [1]             // Just show code for reference #1
})

// Returns:
// Query ID: query-abc123
//
// # Referenced Files
// ## facebook/react: src/ReactHooks.js
// **[45-67]:**
// ```
// function useState(initialState) {
//   const hook = mountState(initialState);
//   return [hook.state, hook.dispatch];
// }
// ...
// ```
```

**Example 3 - Deep research mode:**
```javascript
// When you ask: "Give me a comprehensive analysis of Next.js routing architecture"
wiki_question({
  repo: "vercel/next.js",
  question: "Explain the complete routing architecture",
  useDeepResearch: true,
  saveToFile: "save-and-show"
})

// What happens:
// 1. DeepWiki spends 3-15 minutes doing deep analysis
// 2. Returns comprehensive architectural breakdown
// 3. Saves to: ~/.deepwiki-mcp/output/vercel-next.js/questions/2025-09-30_14-30-00_routing-architecture_query-xyz789.md
// 4. Shows you the full analysis
```

**Example 4 - Follow-up questions:**
```javascript
// You: "What about error handling in that routing system?"
wiki_question({
  repo: "vercel/next.js",
  queryId: "query-xyz789",           // References previous deep research
  followUpQuestion: "How does error handling work in the routing system?",
  includeFullConversation: false     // Only show new answer, not previous one
})

// Returns: Answer about error handling, building on previous context
```

**Example 5 - Getting full file contents:**
```javascript
// You: "Show me the full content of that routing file"
wiki_question({
  repo: "vercel/next.js",
  queryId: "query-xyz789",
  includeAnswer: false,
  contextFiles: ["packages/next/src/server/router.ts"]
})

// Returns: Complete contents of router.ts file
```

## Understanding API Polling (Advanced)

When you ask DeepWiki a question, it doesn't respond instantly. Instead, your question is processed asynchronously by their AI, and this MCP periodically checks if the answer is ready.

**How it works:**

1. **Question submitted** → DeepWiki starts processing
2. **MCP checks for answer** → Polls every few seconds/minutes
3. **Answer ready** → Returns results to Claude

**Polling schedules:**

- **Regular mode:** Checks at 10s, 15s, 20s, 30s, 45s, 75s, 2m, 3m, 5m
  - Total: up to 5 minutes for an answer

- **Deep research mode:** Checks at 3m, 4m, 5m, 7m, 9m, 12m, 15m
  - Total: up to 15 minutes for comprehensive analysis

**Why this matters:**

- Regular questions: Usually answered in 30-60 seconds
- Deep research: Takes 5-15 minutes but provides much more thorough analysis
- You can customize these intervals (see Configuration below)

**Visual example:**
```
You ask question → DeepWiki AI thinks → MCP checks → Gets answer → Claude shows you

Regular: [0s] ----10s----15s----20s---[Answer!]
Deep:    [0s] ----------------3m--------------5m---------7m----[Answer!]
```

## Configuration

You can customize the MCP's behavior through environment variables in your Claude Desktop config.

### File Storage

**`default_directory`** - Where to save exported files
- Default: `~/.deepwiki-mcp/output`
- Example: `"/Users/me/Documents/deepwiki-research"`

**`allowed_directories`** - Security: which directories can be written to
- Default: `~/.deepwiki-mcp` and `default_directory`
- Example: `"/Users/me/Documents/deepwiki-research,/Users/me/projects"`

### API Polling

**`DEEPWIKI_POLL_INTERVALS_REGULAR`** - When to check for regular answers (in seconds)
- Default: `"10,15,20,30,45,75,120,180,300"` (checks at these intervals)
- Faster polling: `"5,10,15,20,30,60"` (checks more frequently)

**`DEEPWIKI_POLL_INTERVALS_DEEP`** - When to check for deep research answers (in seconds)
- Default: `"180,240,300,420,540,720,900"` (3min, 4min, 5min, 7min, 9min, 12min, 15min)
- Faster polling: `"60,120,180,300,600"` (checks more frequently)

### Example Configuration

```json
{
  "mcpServers": {
    "deepwiki": {
      "command": "node",
      "args": ["/path/to/deepwiki-mcp/dist/index.js"],
      "env": {
        "default_directory": "/Users/me/Documents/deepwiki-research",
        "allowed_directories": "/Users/me/Documents/deepwiki-research,/Users/me/projects",
        "DEEPWIKI_POLL_INTERVALS_REGULAR": "5,10,15,30,60",
        "DEEPWIKI_POLL_INTERVALS_DEEP": "60,120,240,480"
      }
    }
  }
}
```

## Caching & Storage

**Cache location:** `~/.deepwiki-mcp/cache/`

- Stores previous responses for instant retrieval
- Organized by repository
- Automatically used for follow-up questions

**Output location:** `~/.deepwiki-mcp/output/` (or your `default_directory`)

- Saved files use this structure: `{repo}/{type}/{date}_{time}_{description}_query-{id}.md`
- Example: `facebook-react/questions/2025-09-30_14-30-00_hooks-implementation_query-abc123.md`

## Tips & Best Practices

💡 **Start with regular questions** - Use deep research only for complex architectural questions
💡 **Use follow-ups** - Build on previous answers instead of asking everything at once
💡 **Save important findings** - Ask Claude to save responses for future reference
💡 **Be specific** - "How does React implement the useState hook?" vs "How does React work?"
💡 **Request code when needed** - "Show me the code for reference 2" to get actual implementation

## Troubleshooting

**"No cached response found"**
→ The queryId you provided doesn't exist. Ask a new question first.

**"Tool timeout"**
→ DeepWiki is taking longer than expected. Try again or increase polling intervals.

**"Repository not found"**
→ Check the repo format is `owner/repo` and that it's a public GitHub repository.

**Playwright errors**
→ Run `npx playwright install chromium` to install browser dependencies.

## Development

### Project Structure
```
deepwiki-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # Tool implementations
│   │   ├── wiki-parser.ts    # Documentation parser tool
│   │   └── wiki-question.ts  # Question/answer tool
│   ├── automation/           # Playwright browser automation
│   ├── parsers/              # Response parsers & transformers
│   ├── cache/                # Cache management
│   └── utils/                # Helper utilities
├── dist/                     # Compiled JavaScript (generated)
├── package.json
└── tsconfig.json
```

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

## License

MIT - See LICENSE file for full details including disclaimer.

## Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
- Powered by [DeepWiki](https://deepwiki.org) (by Cognition Labs)
- Created using [Claude](https://claude.ai) (Opus 4.0 & Sonnet 4.5)
