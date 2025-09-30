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
export declare function transformResponse(input: InputResponse): OutputResponse;
//# sourceMappingURL=json-transformer.d.ts.map