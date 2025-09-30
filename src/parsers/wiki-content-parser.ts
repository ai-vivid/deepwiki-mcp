// Wiki content parser - based on the original wiki-parser.ts
export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface ChapterStructure {
  id: string;
  title: string;
  fullTitle: string;
}

export interface HeaderInfo {
  level: number;
  title: string;
  path: string;
}

export interface ParseOptions {
  chapters?: string[];
  headers?: {[chapter: string]: string[]};
}

export interface StructureOptions {
  depth?: number;
  chapterDepths?: {[chapter: string]: number};
}

export class WikiParser {
  constructor(private readonly content: string) {}

  getChapterStructure(): ChapterStructure[] {
    // Try JSON structure first
    const wikiJsonMatch = this.content.match(/"wiki":\s*\{[\s\S]*?"pages":\s*\[(.*?)\]\s*\}/s);
    
    if (wikiJsonMatch) {
      try {
        const pagesJson = `[${wikiJsonMatch[1]}]`;
        const fixedJson = pagesJson
          .replace(/\{\s*page_plan\s*:/g, '{"page_plan":')  
          .replace(/\{\s*id\s*:/g, '{"id":')  
          .replace(/\s*title\s*:/g, '"title":')  
          .replace(/\}\s*,\s*content\s*:/g, '},"content":');
          
        const pages = JSON.parse(fixedJson);
        
        return pages.map((page: any) => ({
          id: page.page_plan.id,
          title: page.page_plan.title,
          fullTitle: `# ${page.page_plan.title}`
        }));
      } catch (error) {
        // Fallback to pattern matching (JSON parsing failed)
        console.error('Failed to parse wiki JSON structure, falling back to pattern matching:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    // Fallback: chapter markers
    const matches = Array.from(this.content.matchAll(/,# ([^\n]+)/g));
    return matches.map((match, index) => ({
      id: (index + 1).toString(),
      title: match[1],
      fullTitle: `# ${match[1]}`
    }));
  }

  getChapterTitles(): string[] {
    return this.getChapterStructure().map(ch => ch.title);
  }

  parse(options?: ParseOptions): Chapter[] {
    const chapterStructure = this.getChapterStructure();
    const chaptersToProcess = options?.chapters 
      ? chapterStructure.filter(ch => {
          return options.chapters!.some(requestedChapter => {
            // Allow matching by title, id, "id: title", or "Chapter X" format
            return ch.title === requestedChapter || 
                   ch.id === requestedChapter || 
                   `${ch.id}: ${ch.title}` === requestedChapter ||
                   `Chapter ${ch.id}` === requestedChapter;
          });
        })
      : chapterStructure;
    
    return chaptersToProcess.map(chapterInfo => {
      const { id, title } = chapterInfo;
      const chapterMarker = `,# ${title}`;
      const markerIndex = this.content.indexOf(chapterMarker);
      
      if (markerIndex === -1) return null;
      
      const chapterStart = markerIndex + chapterMarker.length;
      const nextChapterIndex = this.content.indexOf(',# ', chapterStart);
      const chapterEnd = nextChapterIndex !== -1 ? nextChapterIndex : this.content.length;
      
      let content = this.content.substring(chapterStart, chapterEnd);
      
      // Clean content
      const detailsEndPos = content.indexOf('</details>');
      if (detailsEndPos !== -1) {
        content = content.substring(detailsEndPos + '</details>'.length).trim();
      }
      
      const excludedIndex = content.indexOf('---------------------------------------\nExcluded chapters');
      if (excludedIndex !== -1) {
        content = content.substring(0, excludedIndex).trim();
      }
      
      content = content.replace(/[0-9]+[a-z]:T[a-zA-Z0-9]+/g, '');
      
      const jsonStartIndex = content.indexOf('16:["$","$L17"');
      if (jsonStartIndex !== -1) {
        content = content.substring(0, jsonStartIndex).trim();
      }
      
      return { id, title, content };
    }).filter(Boolean) as Chapter[];
  }

  extractHeaders(content: string, chapterTitle: string): HeaderInfo[] {
    const headers: HeaderInfo[] = [];
    const headerRegex = /^(#{2,4})\s+(.+)$/gm;
    const matches = Array.from(content.matchAll(headerRegex));
    const parentHeaders: {[level: number]: string} = {};
    
    for (const match of matches) {
      const level = match[1].length;
      const title = match[2].trim();
      
      parentHeaders[level] = title;
      
      for (let i = level + 1; i <= 4; i++) {
        delete parentHeaders[i];
      }
      
      let path = chapterTitle;
      for (let i = 2; i <= level; i++) {
        if (parentHeaders[i]) {
          path += ` ${"#".repeat(i)} ${parentHeaders[i]}`;
        }
      }
      
      headers.push({ level, title, path });
    }
    
    return headers;
  }
  
  getFullStructure(): Map<string, HeaderInfo[]> {
    const structure = new Map<string, HeaderInfo[]>();
    const chapters = this.parse();
    
    for (const chapter of chapters) {
      const headers = this.extractHeaders(chapter.content, chapter.title);
      structure.set(chapter.title, headers);
    }
    
    return structure;
  }

  getStructureWithDepth(options?: StructureOptions): string {
    const defaultDepth = options?.depth || 1;
    const chapterDepths = options?.chapterDepths || {};
    const chapters = this.parse();
    const fullStructure = this.getFullStructure();
    
    return chapters.map(chapter => {
      const chapterDepth = chapterDepths[chapter.title] || defaultDepth;
      let result = `${chapter.id}: ${chapter.title}`;
      
      if (chapterDepth > 1) {
        const headers = fullStructure.get(chapter.title) || [];
        const filteredHeaders = headers.filter(h => h.level <= chapterDepth);
        
        if (filteredHeaders.length > 0) {
          result += '\n' + filteredHeaders.map(header => {
            const indent = '  '.repeat(header.level - 1);
            return `${indent}${'#'.repeat(header.level)} ${header.title}`;
          }).join('\n');
        } else if (headers.length === 0) {
          result += '\n  (No headers)';
        }
      }
      
      return result;
    }).join('\n\n');
  }

  extractContent(options: ParseOptions): string {
    const chapters = this.parse(options);
    const chapterHeaderMap = options.headers || {};
    
    // Create a mapping from requested chapter identifiers to actual chapter titles
    const chapterStructure = this.getChapterStructure();
    const requestedChapterMap = new Map<string, string>();
    
    if (options.chapters) {
      for (const requestedChapter of options.chapters) {
        // Check if this is a standalone header request (starts with ## or ###)
        if (requestedChapter.startsWith('##')) {
          const headerName = requestedChapter;
          const matchingChapters: string[] = [];
          
          // Find all chapters that contain this header
          for (const chapter of this.parse()) {
            const headerRegex = new RegExp(`^${headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
            if (headerRegex.test(chapter.content)) {
              matchingChapters.push(chapter.title);
            }
          }
          
          if (matchingChapters.length === 0) {
            throw new Error(`Header "${headerName}" not found in any chapter`);
          } else if (matchingChapters.length > 1) {
            throw new Error(`Conflicting subchapter name: "${headerName}" found in chapters: ${matchingChapters.join(', ')}. Format request like: "Chapter Title${headerName}"`);
          }
          
          // Single match - add it as "ChapterTitle##Header" format
          requestedChapterMap.set(requestedChapter, matchingChapters[0]);
          continue;
        }
        
        // Regular chapter matching
        const matchingChapter = chapterStructure.find(ch => 
          ch.title === requestedChapter || 
          ch.id === requestedChapter || 
          `${ch.id}: ${ch.title}` === requestedChapter ||
          `Chapter ${ch.id}` === requestedChapter
        );
        if (matchingChapter) {
          requestedChapterMap.set(requestedChapter, matchingChapter.title);
        }
      }
    }
    
    return chapters.map((chapter, index) => {
      // Find headers for this chapter using any of the possible identifiers
      let requestedHeaders: string[] | undefined;
      
      // Check if headers were specified using the actual chapter title
      if (chapterHeaderMap[chapter.title]) {
        requestedHeaders = chapterHeaderMap[chapter.title];
      } else {
        // Check if headers were specified using chapter id or "id: title" format
        for (const [requestedChapter, actualTitle] of requestedChapterMap) {
          if (actualTitle === chapter.title && chapterHeaderMap[requestedChapter]) {
            requestedHeaders = chapterHeaderMap[requestedChapter];
            break;
          }
        }
      }
      
      // Check for standalone header requests (## or ###)
      for (const [requestedChapter, actualTitle] of requestedChapterMap) {
        if (actualTitle === chapter.title && requestedChapter.startsWith('##')) {
          requestedHeaders = [requestedChapter];
          break;
        }
      }
      
      let output = `# ${chapter.title}\n\n`;
      
      if (requestedHeaders && requestedHeaders.length > 0) {
        const headerRegex = /^(#{2,4}\s+[^\n]+)$/gm;
        const headerMatches = Array.from(chapter.content.matchAll(headerRegex));
        
        // Process each requested header
        for (const requestedHeader of requestedHeaders) {
          const requestedLevel = (requestedHeader.match(/^#+/) || [''])[0].length;
          
          for (let i = 0; i < headerMatches.length; i++) {
            const match = headerMatches[i];
            const headerLine = match[0].trim();
            const normalizedHeader = headerLine.replace(/^(#{2,4})\s+/, '$1');
            
            if (normalizedHeader === requestedHeader) {
              const startIndex = (match.index || 0);
              
              // Find the end index - should include all nested headers (higher level numbers)
              // but stop at headers of the same or lower level (same or fewer #'s)
              let endIndex = chapter.content.length;
              
              for (let j = i + 1; j < headerMatches.length; j++) {
                const nextMatch = headerMatches[j];
                const nextHeaderLine = nextMatch[0].trim();
                const nextLevel = (nextHeaderLine.match(/^#+/) || [''])[0].length;
                
                // If we encounter a header at the same or higher level (fewer #'s), stop
                if (nextLevel <= requestedLevel) {
                  endIndex = nextMatch.index || chapter.content.length;
                  break;
                }
              }
              
              const content = chapter.content.substring(startIndex, endIndex).trim();
              output += `${content}\n\n`;
              break; // Found the header, no need to continue searching
            }
          }
        }
      } else {
        output += chapter.content;
      }
      
      return output + (index < chapters.length - 1 ? '\n\n---\n\n' : '');
    }).join('');
  }
}
