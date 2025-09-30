export class MarkdownGenerator {
    data;
    constructor(data) {
        this.data = data;
    }
    formatQueryId() {
        return `# Query ID\n\n${this.data.query_id}\n`;
    }
    formatAnswer() {
        let answer = '# Answer\n\n';
        let referenceCounter = 1;
        const referenceMap = {};
        // Format each query-answer pair in the conversation
        for (let i = 0; i < this.data.conversation.length; i++) {
            const query = this.data.conversation[i];
            // Add question header (except for the first one)
            if (i > 0) {
                answer += `\n---\n\n**Follow-up:** ${query.user_query}\n\n`;
            }
            // Process answer segments for this query
            for (const segment of query.answer_segments) {
                let text = segment.text;
                if (segment.reference) {
                    if (!referenceMap[segment.reference]) {
                        referenceMap[segment.reference] = referenceCounter++;
                    }
                    text += ` [${referenceMap[segment.reference]}]`;
                }
                answer += text;
            }
        }
        return answer + '\n';
    }
    formatReferences() {
        let references = '# References\n\n';
        const uniqueReferences = [];
        // Collect unique references in order from all conversation queries
        for (const query of this.data.conversation) {
            for (const segment of query.answer_segments) {
                if (segment.reference && !uniqueReferences.includes(segment.reference)) {
                    uniqueReferences.push(segment.reference);
                }
            }
        }
        // Format references
        uniqueReferences.forEach((ref, index) => {
            references += `[${index + 1}]: ${ref} \n`;
        });
        return references;
    }
    formatRepoContextIds() {
        let output = '# Repo Context IDs\n\n';
        for (const id of this.data.repo_context_ids) {
            output += `- ${id}\n`;
        }
        return output;
    }
    getCodeFence(content) {
        // Find the longest sequence of backticks in the content
        const backtickMatches = content.match(/`+/g) || [];
        let maxBackticks = 0;
        for (const match of backtickMatches) {
            maxBackticks = Math.max(maxBackticks, match.length);
        }
        // Use one more backtick than the longest sequence found
        const fenceLength = Math.max(3, maxBackticks + 1);
        const fence = '`'.repeat(fenceLength);
        return { open: fence, close: fence };
    }
    formatReferencedFiles(includeAll, selectedNumbers) {
        let output = '# Referenced Files\n\n';
        // Get references in order from all conversation queries
        const uniqueReferences = [];
        for (const query of this.data.conversation) {
            for (const segment of query.answer_segments) {
                if (segment.reference && !uniqueReferences.includes(segment.reference)) {
                    uniqueReferences.push(segment.reference);
                }
            }
        }
        // Determine which specific file+range combinations to include
        const includedReferences = new Set();
        if (includeAll) {
            // Include all references
            uniqueReferences.forEach(ref => includedReferences.add(ref));
        }
        else if (selectedNumbers) {
            // Include only selected reference numbers
            selectedNumbers.forEach(num => {
                const refIndex = num - 1;
                if (refIndex >= 0 && refIndex < uniqueReferences.length) {
                    includedReferences.add(uniqueReferences[refIndex]);
                }
            });
        }
        // Group included references by file
        const fileRangesMap = new Map();
        for (const ref of includedReferences) {
            // Parse reference format: "org/repo: path/to/file.ext:line-range"
            const firstColonIndex = ref.indexOf(':');
            if (firstColonIndex !== -1) {
                const repoPart = ref.substring(0, firstColonIndex).trim();
                const rest = ref.substring(firstColonIndex + 1).trim();
                const lastColonIndex = rest.lastIndexOf(':');
                if (lastColonIndex !== -1) {
                    const pathPart = rest.substring(0, lastColonIndex).trim();
                    const lineRange = rest.substring(lastColonIndex + 1).trim();
                    const fileName = repoPart + '/' + pathPart;
                    if (!fileRangesMap.has(fileName)) {
                        fileRangesMap.set(fileName, new Set());
                    }
                    fileRangesMap.get(fileName).add(lineRange);
                }
            }
        }
        // Format the referenced files
        for (const [fileName, entries] of Object.entries(this.data.referenced_files)) {
            if (!fileRangesMap.has(fileName))
                continue;
            const includedRanges = fileRangesMap.get(fileName);
            output += `## ${fileName}\n\n`;
            for (const entry of entries) {
                // Only include this entry if its range was specifically selected
                if (!includedRanges.has(entry.reference_range))
                    continue;
                output += `**[${entry.reference_range}]:**\n\n`;
                // Use dynamic fence length to avoid conflicts
                const fence = this.getCodeFence(entry.reference_material);
                output += fence.open + '\n';
                output += entry.reference_material;
                if (!entry.reference_material.endsWith('\n')) {
                    output += '\n';
                }
                output += fence.close + '\n\n';
            }
        }
        return output;
    }
    formatFullContext(includeAll, selectedFiles, fileRanges) {
        let output = '# Full Context Files\n\n';
        for (const context of this.data.full_context) {
            const fileName = context.file_name;
            // Only show files that are explicitly requested
            const shouldShowFile = includeAll || (selectedFiles && selectedFiles.includes(fileName));
            if (!shouldShowFile)
                continue;
            // Determine the range
            const lines = context.text.split('\n');
            const totalLines = lines.length;
            let rangeStart = 0;
            let rangeEnd = totalLines - 1;
            // If file has a specific range requested, use it
            if (fileRanges?.has(fileName)) {
                const range = fileRanges.get(fileName);
                rangeStart = range.start;
                rangeEnd = Math.min(range.end, totalLines - 1);
            }
            // Show the filename and range
            output += `## ${fileName} [${rangeStart}-${rangeEnd}]\n\n`;
            // Get the content to display
            const selectedLines = lines.slice(rangeStart, rangeEnd + 1);
            const content = selectedLines.join('\n');
            // Use dynamic fence length to avoid conflicts
            const fence = this.getCodeFence(content);
            output += fence.open + '\n';
            output += content;
            if (!content.endsWith('\n')) {
                output += '\n';
            }
            output += fence.close + '\n\n';
        }
        return output;
    }
    formatFullContextNamesOnly() {
        let output = '# Full Context Files\n\n';
        for (const context of this.data.full_context) {
            const fileName = context.file_name;
            const lines = context.text.split('\n');
            const totalLines = lines.length;
            output += `## ${fileName} [0-${totalLines - 1}]\n\n`;
        }
        return output;
    }
    generateMarkdown(options) {
        let markdown = '';
        // Always include Query ID
        markdown += this.formatQueryId() + '\n';
        // Include Answer if not using --additional flag
        if (options.includeAnswer) {
            markdown += this.formatAnswer() + '\n';
        }
        // Always include Repo Context IDs
        markdown += this.formatRepoContextIds() + '\n';
        // Include References section if not using --additional flag
        if (options.includeReferencesList) {
            markdown += this.formatReferences() + '\n';
        }
        // Include Referenced Files based on --references options
        if (options.referencesAll || options.referencesNumbers) {
            markdown += this.formatReferencedFiles(options.referencesAll, options.referencesNumbers) + '\n';
        }
        // Include Full Context Files section based on mode
        if (options.includeAnswer && options.includeReferencesList) {
            // Standard mode: show names only
            markdown += this.formatFullContextNamesOnly();
        }
        else if (options.contextAll || options.contextFiles) {
            // --additional mode with explicit --context: show requested files with content
            markdown += this.formatFullContext(options.contextAll, options.contextFiles, options.contextRanges);
        }
        // Otherwise (--additional with no --context): don't show Full Context Files section at all
        return markdown.trim();
    }
}
//# sourceMappingURL=markdown-generator.js.map