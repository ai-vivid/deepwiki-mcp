// Test script to verify the MCP setup
import { wikiParserTool } from './tools/wiki-parser.js';
import { cacheManager } from './cache/cache-manager.js';
async function test() {
    console.log('Testing DeepWiki MCP setup...\n');
    // Initialize cache
    await cacheManager.init();
    console.log('✓ Cache initialized');
    // Test wiki parser with a small repo
    try {
        console.log('\nTesting wiki parser...');
        const result = await wikiParserTool({
            repo: 'modelcontextprotocol/typescript-sdk',
            action: 'structure',
            depth: 1
        });
        console.log('✓ Wiki parser working');
        console.log('Sample output:');
        console.log(result.substring(0, 200) + '...');
    }
    catch (error) {
        console.error('✗ Wiki parser failed:', error);
    }
    console.log('\n✓ Setup test complete!');
    console.log('\nNote: wiki_question tool requires Playwright browsers.');
    console.log('Run "npx playwright install chromium" if not already installed.');
}
test().catch(console.error);
//# sourceMappingURL=test.js.map