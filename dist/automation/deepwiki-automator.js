/**
 * DeepWiki automator - Browser automation for interacting with deepwiki.com
 *
 * This module uses Playwright to automate interactions with the DeepWiki website,
 * enabling programmatic access to AI-powered repository analysis.
 */
import { chromium } from 'playwright';
/**
 * Configuration constants for DeepWiki automation
 */
const CONFIG = {
    TIMEOUTS: {
        SELECTOR_WAIT: 10000, // Timeout for waiting for selectors (10s)
        PAGE_READY: 1000, // Wait time to ensure page is ready (1s)
        INITIAL_API_WAIT: 3000, // Initial wait before polling API (3s)
        PAGE_LOAD: 10000, // Timeout for new page load (10s)
        FORM_READY: 500, // Wait after toggling form elements (0.5s)
    },
    POLLING: {
        REGULAR_MODE: [10, 15, 20, 30, 45, 75, 120, 180, 300], // Regular polling schedule (seconds)
        DEEP_MODE: [180, 240, 300, 420, 540, 720, 900], // Deep research polling schedule (seconds)
        STUCK_THRESHOLD_REGULAR: 60000, // Consider stuck after 1 min (regular)
        STUCK_THRESHOLD_DEEP: 120000, // Consider stuck after 2 min (deep)
    },
    BROWSER: {
        MAX_BUFFER_SIZE: 10 * 1024 * 1024, // 10MB buffer for curl operations
    },
};
/**
 * Browser automation for DeepWiki website interactions
 *
 * This class handles all browser automation tasks for interacting with deepwiki.com,
 * including asking questions, going deeper on analyses, and sending follow-ups.
 * It uses Playwright for cross-platform browser automation with support for
 * Chrome on macOS, Linux, and Windows.
 *
 * @example
 * const automator = new DeepwikiAutomator();
 * const result = await automator.askQuestion({
 *   repoUrl: 'facebook/react',
 *   question: 'How does the reconciler work?',
 *   useDeepResearch: false,
 *   headless: true
 * });
 */
export class DeepwikiAutomator {
    browser = null;
    page = null;
    answerPage = null;
    static cachedExecutablePath = null;
    /**
     * Format seconds into human-readable time string
     *
     * @param seconds - Number of seconds to format
     * @returns Formatted time string (e.g., "45s", "2m30s", "5m")
     *
     * @example
     * formatTime(45)   // => "45s"
     * formatTime(150)  // => "2m30s"
     * formatTime(300)  // => "5m"
     */
    formatTime(seconds) {
        if (seconds < 60)
            return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs ? `${mins}m${secs}s` : `${mins}m`;
    }
    /**
     * Submit a question to DeepWiki and get AI-generated answer
     *
     * This method automates the process of:
     * 1. Opening the DeepWiki page for the repository
     * 2. Submitting the question through the web interface
     * 3. Optionally enabling deep research mode
     * 4. Polling the API until the response is complete
     * 5. Extracting and returning the answer with references
     *
     * @param options - Question options including repo, question text, and settings
     * @returns Promise resolving to response with answer, references, and query ID
     * @throws {Error} If browser automation fails or question cannot be submitted
     *
     * @example
     * const result = await automator.askQuestion({
     *   repoUrl: 'facebook/react',
     *   question: 'How does reconciliation work?',
     *   useDeepResearch: false,
     *   headless: true
     * });
     * console.log(result.answer);
     * console.log(result.queryId);
     */
    async askQuestion(options) {
        const { repoUrl, question, useDeepResearch = false, headless = true, timeout = useDeepResearch ? 900000 : 300000 // Not used directly, but kept for compatibility
         } = options;
        try {
            // Initialize browser
            await this.initBrowser(headless);
            // Navigate to the repository page
            const repoPath = this.extractRepoPath(repoUrl);
            await this.page.goto(`https://deepwiki.com/${repoPath}`, {
                waitUntil: 'networkidle'
            });
            // Wait for question form and fill it
            await this.page.waitForSelector('form textarea', { timeout: CONFIG.TIMEOUTS.SELECTOR_WAIT });
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.PAGE_READY); // Ensure form is ready
            const textarea = await this.page.locator('form textarea');
            await textarea.fill(question);
            // Set deep research toggle if requested
            if (useDeepResearch) {
                await this.enableDeepResearch();
            }
            // Submit the question by pressing Enter
            await textarea.press('Enter');
            // Wait for new tab and extract query ID
            const newPage = await this.page.context().waitForEvent('page', { timeout: CONFIG.TIMEOUTS.PAGE_LOAD });
            await newPage.waitForLoadState('domcontentloaded');
            const newUrl = newPage.url();
            const queryId = this.extractQueryId(newUrl);
            if (!queryId) {
                throw new Error('Failed to extract query ID from URL: ' + newUrl);
            }
            console.log(`Query submitted. ID: ${queryId}`);
            console.log(`URL: ${newUrl}`);
            // Set localStorage for future follow-ups on this query
            await newPage.evaluate((queryId) => {
                const storage = globalThis.localStorage;
                storage.setItem('user_query_history', JSON.stringify([{
                        "id": queryId,
                        "timestamp": new Date().toISOString()
                    }]));
            }, queryId);
            // In headed mode, keep the page open for debugging
            if (!headless) {
                console.log('Running in headed mode - keeping answer tab open for debugging');
                this.answerPage = newPage; // Store reference for later
            }
            else {
                // Only close in headless mode
                await newPage.close();
            }
            // Wait a bit before trying to fetch the API response
            console.log(`Waiting for query to be initialized (${useDeepResearch ? 'deep research' : 'regular'} mode)...`);
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.INITIAL_API_WAIT); // Initial wait
            // Fetch the API response (with schedule-based polling)
            const apiResponse = await this.fetchApiResponse(queryId, useDeepResearch);
            return {
                success: true,
                queryId,
                ...apiResponse
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            // Only cleanup in headless mode
            if (headless) {
                await this.cleanup();
            }
            else {
                console.log('\n🖥️  Browser and answer tab kept open for debugging.');
                console.log('   Close manually when done.');
            }
        }
    }
    /**
     * Execute "Go Deeper" functionality on an existing query
     *
     * This method navigates to an existing query and clicks the "Go deeper" button
     * to get more detailed analysis. A new query is created with deeper insights,
     * and a new query ID is returned.
     *
     * The "Go Deeper" operation always uses deep research mode and takes several minutes.
     *
     * @param options - Options including the query ID to go deeper on
     * @returns Promise resolving to response with deeper analysis and new query ID
     * @throws {Error} If browser automation fails or "Go deeper" button not found
     * @throws {Error} If the original query ID is invalid
     *
     * @example
     * const deeperResult = await automator.goDeeper({
     *   queryId: 'query-12345',
     *   headless: true
     * });
     * console.log(deeperResult.queryId); // New query ID for the deeper analysis
     */
    async goDeeper(options) {
        const { queryId, headless = true } = options;
        try {
            // Initialize browser
            await this.initBrowser(headless);
            // Navigate to the existing query page
            const queryUrl = this.constructQueryUrl(queryId);
            await this.page.goto(queryUrl, {
                waitUntil: 'networkidle'
            });
            // Wait for the "Go deeper" button and click it
            await this.page.waitForSelector('button:has-text("Go deeper")', { timeout: CONFIG.TIMEOUTS.SELECTOR_WAIT });
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.PAGE_READY); // Ensure page is ready
            // Click the "Go deeper" button
            await this.page.click('button:has-text("Go deeper")');
            // Wait for new tab with deeper analysis
            const newPage = await this.page.context().waitForEvent('page', { timeout: CONFIG.TIMEOUTS.PAGE_LOAD });
            await newPage.waitForLoadState('domcontentloaded');
            const newUrl = newPage.url();
            const newQueryId = this.extractQueryId(newUrl);
            if (!newQueryId) {
                throw new Error('Failed to extract new query ID from Go Deeper URL: ' + newUrl);
            }
            console.log(`Go Deeper initiated. New Query ID: ${newQueryId}`);
            console.log(`URL: ${newUrl}`);
            // In headed mode, keep the page open for debugging
            if (!headless) {
                console.log('Running in headed mode - keeping deeper analysis tab open for debugging');
                this.answerPage = newPage; // Store reference for later
            }
            else {
                // Only close in headless mode
                await newPage.close();
            }
            // Wait for the deeper analysis to initialize
            console.log(`Waiting for deeper analysis to initialize...`);
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.INITIAL_API_WAIT); // Initial wait
            // Fetch the API response for the new deeper query (always uses deep research)
            const apiResponse = await this.fetchApiResponse(newQueryId, true);
            return {
                success: true,
                queryId: newQueryId,
                ...apiResponse
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred during Go Deeper'
            };
        }
        finally {
            // Only cleanup in headless mode
            if (headless) {
                await this.cleanup();
            }
            else {
                console.log('\n🖥️  Browser and deeper analysis tab kept open for debugging.');
                console.log('   Close manually when done.');
            }
        }
    }
    /**
     * Send a follow-up question to an existing query
     *
     * This method adds a follow-up question to an existing conversation.
     * The response includes the full conversation history with all queries
     * and responses. The same query ID is maintained for the conversation.
     *
     * Follow-ups can optionally use deep research mode for more thorough analysis.
     *
     * @param options - Options including query ID, follow-up question, and settings
     * @returns Promise resolving to response with full conversation history
     * @throws {Error} If browser automation fails or query page not accessible
     * @throws {Error} If the query ID is invalid
     *
     * @example
     * const followUpResult = await automator.sendFollowUp({
     *   queryId: 'query-12345',
     *   followUpQuestion: 'Can you explain the error handling?',
     *   useDeepResearch: false,
     *   headless: true
     * });
     * // Same queryId, but response includes full conversation
     */
    async sendFollowUp(options) {
        const { queryId, followUpQuestion, useDeepResearch = false, headless = true } = options;
        try {
            // Initialize browser
            await this.initBrowser(headless);
            // Set localStorage to enable follow-up UI
            await this.page.addInitScript((queryId) => {
                const storage = globalThis.localStorage;
                storage.setItem('user_query_history', JSON.stringify([{
                        "id": queryId,
                        "timestamp": new Date().toISOString()
                    }]));
            }, queryId);
            // Navigate to the existing query page
            const queryUrl = this.constructQueryUrl(queryId);
            await this.page.goto(queryUrl, {
                waitUntil: 'networkidle'
            });
            // Wait for follow-up input field (should be similar to original question form)
            await this.page.waitForSelector('form textarea', { timeout: CONFIG.TIMEOUTS.SELECTOR_WAIT });
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.PAGE_READY); // Ensure page is ready
            // Fill in the follow-up question
            const textarea = await this.page.locator('form textarea');
            await textarea.fill(followUpQuestion);
            // Set deep research toggle if requested for follow-up
            if (useDeepResearch) {
                await this.enableDeepResearch();
            }
            // Submit the follow-up question
            await textarea.press('Enter');
            // Wait for response to be processed (stay on same page for follow-ups)
            console.log(`Follow-up submitted for query: ${queryId}`);
            console.log(`Follow-up question: ${followUpQuestion}`);
            console.log(`Mode: ${useDeepResearch ? 'Deep Research' : 'Regular'}`);
            // Wait for response to be added to the conversation
            console.log(`Waiting for follow-up to be processed...`);
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.INITIAL_API_WAIT); // Wait for follow-up processing
            // Fetch the updated API response with full conversation
            const apiResponse = await this.fetchApiResponse(queryId, useDeepResearch);
            return {
                success: true,
                queryId, // Keep same query ID for follow-ups
                ...apiResponse
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred during follow-up'
            };
        }
        finally {
            // Only cleanup in headless mode
            if (headless) {
                await this.cleanup();
            }
            else {
                console.log('\n🖥️  Browser kept open for debugging follow-up.');
                console.log('   Close manually when done.');
            }
        }
    }
    constructQueryUrl(queryId) {
        // Construct the URL for an existing query
        // Format: https://deepwiki.com/search/{queryId}
        return `https://deepwiki.com/search/${queryId}`;
    }
    async findChromiumExecutable() {
        const { readdirSync, existsSync } = await import('fs');
        const { join } = await import('path');
        const { homedir, platform } = await import('os');
        // Determine cache directory based on platform
        let cacheDir;
        switch (platform()) {
            case 'darwin': // macOS
                cacheDir = join(homedir(), 'Library', 'Caches', 'ms-playwright');
                break;
            case 'win32': // Windows
                cacheDir = join(homedir(), 'AppData', 'Local', 'ms-playwright');
                break;
            case 'linux': // Linux
            default:
                cacheDir = join(homedir(), '.cache', 'ms-playwright');
                break;
        }
        try {
            // Get all chromium directories and sort to get the latest version
            const entries = readdirSync(cacheDir);
            const chromiumDirs = entries
                .filter(entry => entry.startsWith('chromium-') && !entry.includes('headless'))
                .sort((a, b) => {
                const versionA = parseInt(a.split('-')[1]);
                const versionB = parseInt(b.split('-')[1]);
                return versionB - versionA; // Sort descending to get latest first
            });
            if (chromiumDirs.length > 0) {
                const latestChromium = chromiumDirs[0];
                let chromiumPath;
                // Platform-specific executable paths
                switch (platform()) {
                    case 'darwin': // macOS
                        chromiumPath = join(cacheDir, latestChromium, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
                        break;
                    case 'win32': // Windows
                        chromiumPath = join(cacheDir, latestChromium, 'chrome-win', 'chrome.exe');
                        break;
                    case 'linux': // Linux
                    default:
                        chromiumPath = join(cacheDir, latestChromium, 'chrome-linux', 'chrome');
                        break;
                }
                if (existsSync(chromiumPath)) {
                    // Cache the path for future use
                    DeepwikiAutomator.cachedExecutablePath = chromiumPath;
                    console.error(`Using Playwright Chromium: ${latestChromium} on ${platform()} (cached for future use)`);
                    return chromiumPath;
                }
            }
        }
        catch (error) {
            console.error('Error finding Playwright browsers:', error);
        }
        return undefined;
    }
    async initBrowser(headless) {
        // Prevent Playwright from downloading browsers
        process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
        let executablePath = DeepwikiAutomator.cachedExecutablePath || undefined;
        // Only do expensive filesystem operations if we don't have a cached path
        if (!executablePath) {
            executablePath = await this.findChromiumExecutable();
        }
        if (!executablePath) {
            throw new Error('No Chromium browser found in Playwright cache. Please run: npx playwright install chromium');
        }
        this.browser = await chromium.launch({
            headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath,
            // Prevent Playwright from downloading browsers
            downloadsPath: undefined,
            // Skip browser installation check
            ignoreDefaultArgs: ['--disable-dev-shm-usage']
        });
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        this.page = await context.newPage();
    }
    extractRepoPath(repoUrl) {
        // Handle different URL formats
        if (repoUrl.includes('deepwiki.com/')) {
            return repoUrl.split('deepwiki.com/')[1];
        }
        if (repoUrl.includes('github.com/')) {
            return repoUrl.split('github.com/')[1];
        }
        // Assume it's already in owner/repo format
        return repoUrl;
    }
    extractQueryId(url) {
        // Extract query ID from URL like:
        // https://deepwiki.com/search/can-it-fetch-api-responses_03d17174-ecbc-4604-82c0-debf4ef765b7
        const match = url.match(/search\/([^/]+)$/);
        return match ? match[1] : null;
    }
    async enableDeepResearch() {
        const toggleContainer = await this.page.waitForSelector('#useDeep');
        // Check if already enabled
        const isEnabled = await toggleContainer.evaluate(el => {
            const toggle = el.querySelector('[data-state]');
            return toggle?.getAttribute('data-state') === 'checked';
        });
        if (!isEnabled) {
            await toggleContainer.click();
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.FORM_READY);
        }
    }
    /**
     * Parse custom polling schedule from environment variable
     * @param envVar - Environment variable value
     * @param defaultSchedule - Default schedule to use if parsing fails
     * @returns Sorted array of polling intervals in seconds
     */
    parseCustomPollSchedule(envVar, defaultSchedule) {
        if (!envVar || envVar.trim() === '')
            return defaultSchedule;
        try {
            const parsed = envVar.split(',').map(s => {
                const seconds = parseInt(s.trim(), 10);
                if (isNaN(seconds) || seconds <= 0) {
                    throw new Error(`Invalid interval: ${s}`);
                }
                return seconds;
            });
            if (parsed.length === 0)
                return defaultSchedule;
            // Sort in ascending order
            return parsed.sort((a, b) => a - b);
        }
        catch (error) {
            console.error(`Warning: Failed to parse custom poll intervals from environment variable. Using defaults.`);
            console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return defaultSchedule;
        }
    }
    /**
     * Wait until the next scheduled API check time
     * @param startTime - Timestamp when polling started
     * @param scheduleIndex - Current index in the polling schedule
     * @param pollSchedule - Array of polling intervals in seconds
     */
    async waitForNextScheduledCheck(startTime, scheduleIndex, pollSchedule) {
        const nextCheckTime = startTime + (pollSchedule[scheduleIndex] * 1000);
        const currentTime = Date.now();
        if (currentTime < nextCheckTime) {
            const waitTime = nextCheckTime - currentTime;
            const waitSeconds = Math.round(waitTime / 1000);
            const targetDisplay = this.formatTime(pollSchedule[scheduleIndex]);
            console.log(`\n⏳ Next check at ${targetDisplay} mark (waiting ${waitSeconds}s)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    /**
     * Check API for query progress
     * @param apiUrl - API endpoint URL
     * @returns API response with query data
     */
    async checkApiProgress(apiUrl) {
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`API responded with ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    /**
     * Detect and log changes in query state or response
     * @param lastQuery - Current query state
     * @param lastState - Previous state
     * @param lastResponseLength - Previous response length
     * @param lastChangeTime - Time of last change
     * @returns Updated tracking values
     */
    detectProgressChanges(lastQuery, lastState, lastResponseLength, lastChangeTime) {
        const currentResponseLength = lastQuery.response?.length || 0;
        // Detect changes
        const stateChanged = lastQuery.state !== lastState;
        const responseGrew = currentResponseLength > lastResponseLength;
        let newChangeTime = lastChangeTime;
        let newState = lastState;
        let newLength = lastResponseLength;
        if (stateChanged || responseGrew) {
            newChangeTime = Date.now();
            if (stateChanged) {
                console.log(`📊 Query state changed: ${lastState || 'initial'} → ${lastQuery.state}`);
                newState = lastQuery.state;
            }
            if (responseGrew) {
                console.log(`📈 Response growing: ${lastResponseLength} → ${currentResponseLength} items`);
            }
            newLength = currentResponseLength;
        }
        return { newState, newLength, newChangeTime };
    }
    /**
     * Check if query appears stuck and log warning
     * @param lastQuery - Current query state
     * @param lastChangeTime - Time of last detected change
     * @param stuckThreshold - Threshold in ms to consider stuck
     * @param currentResponseLength - Current response item count
     */
    checkIfStuck(lastQuery, lastChangeTime, stuckThreshold, currentResponseLength) {
        const timeSinceChange = Date.now() - lastChangeTime;
        if (timeSinceChange > stuckThreshold && lastQuery.state === 'pending') {
            const stuckTime = Math.round(timeSinceChange / 1000);
            const stuckDisplay = this.formatTime(stuckTime);
            console.log(`⚠️  Warning: No changes detected for ${stuckDisplay}`);
            console.log(`   State: ${lastQuery.state}, Response items: ${currentResponseLength}`);
        }
    }
    async fetchApiResponse(queryId, useDeepResearch) {
        const apiUrl = `https://api.devin.ai/ada/query/${queryId}`;
        const startTime = Date.now();
        // Get polling schedules (default or custom from environment)
        const defaultRegularSchedule = [...CONFIG.POLLING.REGULAR_MODE];
        const defaultDeepSchedule = [...CONFIG.POLLING.DEEP_MODE];
        const pollSchedule = useDeepResearch
            ? this.parseCustomPollSchedule(process.env.DEEPWIKI_POLL_INTERVALS_DEEP, defaultDeepSchedule)
            : this.parseCustomPollSchedule(process.env.DEEPWIKI_POLL_INTERVALS_REGULAR, defaultRegularSchedule);
        const stuckThreshold = useDeepResearch
            ? CONFIG.POLLING.STUCK_THRESHOLD_DEEP
            : CONFIG.POLLING.STUCK_THRESHOLD_REGULAR;
        let scheduleIndex = 0;
        let lastState = '';
        let lastResponseLength = 0;
        let lastChangeTime = Date.now();
        let attempts = 0;
        console.log(`\n🔄 Starting to poll API at: ${apiUrl}`);
        console.log(`⏰ Mode: ${useDeepResearch ? 'Deep Research' : 'Regular'}`);
        console.log(`📅 Check schedule: ${pollSchedule.map(s => this.formatTime(s)).join(' → ')}`);
        while (scheduleIndex < pollSchedule.length) {
            // Wait until the next scheduled check time
            await this.waitForNextScheduledCheck(startTime, scheduleIndex, pollSchedule);
            attempts++;
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const elapsedDisplay = this.formatTime(elapsed);
            console.log(`\n⏱️  Checking API (attempt ${attempts} at ${elapsedDisplay})...`);
            try {
                const jsonResponse = await this.checkApiProgress(apiUrl);
                // Check if the response has the expected structure
                if (jsonResponse.queries && Array.isArray(jsonResponse.queries) && jsonResponse.queries.length > 0) {
                    // Check the last query for state (most recent in conversation)
                    const lastQuery = jsonResponse.queries[jsonResponse.queries.length - 1];
                    const currentResponseLength = lastQuery.response?.length || 0;
                    // Detect and log progress changes
                    const changes = this.detectProgressChanges(lastQuery, lastState, lastResponseLength, lastChangeTime);
                    lastState = changes.newState;
                    lastResponseLength = changes.newLength;
                    lastChangeTime = changes.newChangeTime;
                    // Check if query appears stuck
                    this.checkIfStuck(lastQuery, lastChangeTime, stuckThreshold, currentResponseLength);
                    // Handle completion states
                    if (lastQuery.state === 'done' || lastQuery.state === 'complete') {
                        const totalTime = Math.round((Date.now() - startTime) / 1000);
                        const totalDisplay = this.formatTime(totalTime);
                        console.log('\n✅ Query processing completed!');
                        console.log(`   Final response items: ${currentResponseLength}`);
                        console.log(`   Total conversation queries: ${jsonResponse.queries.length}`);
                        console.log(`   Total time: ${totalDisplay}`);
                        return this.extractDataFromAllQueries(jsonResponse.queries);
                    }
                    else if (lastQuery.state === 'error' || lastQuery.error) {
                        throw new Error(`Query failed: ${lastQuery.error || 'Unknown error'}`);
                    }
                    else if (lastQuery.state === 'pending') {
                        console.log(`⏳ Still processing... (${currentResponseLength} items so far)`);
                    }
                    else {
                        console.log(`⚠️  Unknown state: ${lastQuery.state}`);
                    }
                }
                else {
                    // Response doesn't have expected structure
                    console.log('⚠️  Unexpected response structure');
                }
            }
            catch (error) {
                if (error instanceof Error && error.message.includes('404')) {
                    console.log('🔍 Query not ready yet (404). This is normal, especially for deep research.');
                    console.log('   Will retry at next scheduled time...');
                }
                else {
                    throw error;
                }
            }
            // Move to next scheduled check
            scheduleIndex++;
        }
        // All scheduled checks exhausted
        const elapsedTotal = Math.round((Date.now() - startTime) / 1000);
        const elapsedDisplay = this.formatTime(elapsedTotal);
        console.log(`\n⏱️  All scheduled checks completed after ${elapsedDisplay} (${attempts} attempts)`);
        console.log(`   Last state: ${lastState || 'unknown'}`);
        console.log(`   Response items collected: ${lastResponseLength}`);
        throw new Error(`Query did not complete within scheduled checks (${useDeepResearch ? 'deep research' : 'regular'} mode).`);
    }
    extractDataFromAllQueries(queries) {
        let fullAnswer = '';
        const allReferences = [];
        const allStats = {};
        // Process all queries in the conversation
        for (const query of queries) {
            const responseArray = query.response || [];
            let queryAnswer = '';
            // Process all items in this query's response array
            for (const item of responseArray) {
                if (!item || !item.type)
                    continue;
                switch (item.type) {
                    case 'chunk':
                        if (item.data && typeof item.data === 'string') {
                            queryAnswer += item.data;
                        }
                        break;
                    case 'reference':
                        if (item.data) {
                            allReferences.push({
                                file_path: item.data.file_path || '',
                                range_start: item.data.range_start || 0,
                                range_end: item.data.range_end || 0
                            });
                        }
                        break;
                    case 'stats':
                        if (item.data?.key && typeof item.data.value === 'number') {
                            allStats[item.data.key] = item.data.value;
                        }
                        break;
                    case 'file_contents':
                        // Some responses include file contents as references
                        if (item.data && Array.isArray(item.data) && item.data.length >= 2) {
                            // data[0] is repo, data[1] is file path
                            allReferences.push({
                                file_path: `${item.data[0]}/${item.data[1]}`,
                                range_start: 0,
                                range_end: 0
                            });
                        }
                        break;
                }
            }
            // Add this query's answer to the full conversation
            if (queryAnswer.trim()) {
                if (fullAnswer)
                    fullAnswer += '\n\n---\n\n'; // Separate different queries
                fullAnswer += queryAnswer.trim();
            }
        }
        return {
            answer: fullAnswer.trim() || undefined,
            references: allReferences.length > 0 ? allReferences : undefined,
            stats: Object.keys(allStats).length > 0 ? allStats : undefined,
            rawResponse: queries // Return all queries as raw response
        };
    }
    async cleanup() {
        if (this.answerPage) {
            await this.answerPage.close();
            this.answerPage = null;
        }
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
//# sourceMappingURL=deepwiki-automator.js.map