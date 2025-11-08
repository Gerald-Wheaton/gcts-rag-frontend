import { ChatOpenAI } from '@langchain/openai';
import { HANDBOOK_CONFIG, SYSTEM_PROMPTS } from '@/lib/langgraph/config';
import { QueryAnalysisOutputSchema } from '@/types/langgraph';
import type { HandbookGraphStateType, PartialHandbookState } from '@/lib/langgraph/state';

/**
 * Query Analyzer Node
 * 
 * Analyzes the user query to:
 * - Extract intent and entities
 * - Detect ambiguity
 * - Infer implicit metadata filters
 * - Assess confidence in understanding
 * 
 * @param state - Current graph state
 * @returns Partial state with analyzedQuery, requiresClarification
 */
export async function analyzeQuery(state: HandbookGraphStateType): Promise<PartialHandbookState> {
  try {
    const { currentQuery, messageHistory } = state;

    // Validate input
    if (!currentQuery || currentQuery.trim() === '') {
      return {
        error: 'Query is empty',
        requiresClarification: true,
      };
    }

    // Build context from message history
    const conversationContext = messageHistory.length > 0
      ? messageHistory
          .slice(-5) // Last 5 messages for context
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n')
      : '';

    // Initialize LLM with structured output
    const llm = new ChatOpenAI({
      modelName: HANDBOOK_CONFIG.models.chat,
      temperature: 0.2, // Low temperature for consistent analysis
      apiKey: process.env.OPENAI_API_KEY,
    }).withStructuredOutput(QueryAnalysisOutputSchema);

    // Construct analysis prompt
    const prompt = `${SYSTEM_PROMPTS.queryAnalysis}

${conversationContext ? `Recent conversation context:\n${conversationContext}\n` : ''}

User query to analyze: "${currentQuery}"

Analyze this query and provide:
1. The user's intent
2. Key entities mentioned
3. Implicit section_type filter (if clear from context)
4. Implicit stakeholder_groups (if clear from context)
5. Confidence score (0-1)
6. Whether clarification is needed
7. If clarification needed, explain why`;

    // Call LLM for structured analysis
    const analysis = await llm.invoke(prompt);

    // Validate response
    const validatedAnalysis = QueryAnalysisOutputSchema.parse(analysis);

    // Determine if clarification is required
    const requiresClarification =
      validatedAnalysis.requires_clarification ||
      validatedAnalysis.confidence < HANDBOOK_CONFIG.ambiguity.confidenceThreshold;

    // Build AnalyzedQuery object
    const analyzedQuery = {
      intent: validatedAnalysis.intent,
      entities: validatedAnalysis.entities,
      implicitFilters: {
        section_type: validatedAnalysis.section_type || undefined,
        stakeholder_groups: validatedAnalysis.stakeholder_groups || undefined,
      },
      confidence: validatedAnalysis.confidence,
      requiresClarification,
      clarificationReason: validatedAnalysis.clarification_reason || undefined,
    };

    console.log('[analyzeQuery] Analysis complete:', {
      intent: analyzedQuery.intent,
      confidence: analyzedQuery.confidence,
      requiresClarification,
    });

    return {
      analyzedQuery,
      requiresClarification,
    };
  } catch (error) {
    console.error('[analyzeQuery] Error:', error);
    return {
      error: `Failed to analyze query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requiresClarification: false,
    };
  }
}

