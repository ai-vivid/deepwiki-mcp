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
    headers?: {
        [chapter: string]: string[];
    };
}
export interface StructureOptions {
    depth?: number;
    chapterDepths?: {
        [chapter: string]: number;
    };
}
export declare class WikiParser {
    private readonly content;
    constructor(content: string);
    getChapterStructure(): ChapterStructure[];
    getChapterTitles(): string[];
    parse(options?: ParseOptions): Chapter[];
    extractHeaders(content: string, chapterTitle: string): HeaderInfo[];
    getFullStructure(): Map<string, HeaderInfo[]>;
    getStructureWithDepth(options?: StructureOptions): string;
    extractContent(options: ParseOptions): string;
}
//# sourceMappingURL=wiki-content-parser.d.ts.map