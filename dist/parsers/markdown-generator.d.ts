import { OutputResponse } from './json-transformer.js';
export interface MarkdownOptions {
    includeAnswer: boolean;
    includeReferencesList: boolean;
    referencesAll: boolean;
    referencesNumbers?: number[];
    contextAll: boolean;
    contextFiles?: string[];
    contextRanges?: Map<string, {
        start: number;
        end: number;
    }>;
}
export declare class MarkdownGenerator {
    private data;
    constructor(data: OutputResponse);
    private formatQueryId;
    private formatAnswer;
    private formatReferences;
    private formatRepoContextIds;
    private getCodeFence;
    private formatReferencedFiles;
    private formatFullContext;
    private formatFullContextNamesOnly;
    generateMarkdown(options: MarkdownOptions): string;
}
//# sourceMappingURL=markdown-generator.d.ts.map