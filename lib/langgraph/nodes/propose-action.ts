import { ChatOpenAI } from '@langchain/openai'
import { HANDBOOK_CONFIG, SYSTEM_PROMPTS } from '@/lib/langgraph/config'
import { ActionProposalSchema } from '@/types/langgraph'
import { retrieveVectors } from './retrieve-vectors'
import { reconstructSections } from './reconstruct-sections'
import { formatCitations } from './format-citations'
import { embedQuery } from './embed-query'
import { analyzeQuery } from './analyze-query'
import type {
  HandbookGraphStateType,
  PartialHandbookState,
} from '@/lib/langgraph/state'

/**
 * Action Proposal Node
 *
 * Analyzes conversation history, retrieves relevant handbook sections,
 * and proposes 1-3 concrete, actionable courses with supporting citations.
 *
 * @param state - Current graph state with messageHistory
 * @returns Partial state with actionProposal and citations
 */
export async function proposeAction(
  state: HandbookGraphStateType
): Promise<PartialHandbookState> {
  try {
    const { messageHistory } = state

    // Validate input - need conversation history
    if (!messageHistory || messageHistory.length === 0) {
      return {
        error:
          'Cannot propose actions without conversation history. Please have a conversation first.',
        actionProposal: {
          actions: [],
          summary: 'No conversation history available.',
        },
      }
    }

    console.log(
      `[proposeAction] Analyzing conversation with ${messageHistory.length} messages`
    )

    // Build conversation history context
    const conversationHistory = messageHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    // Extract key themes from conversation for retrieval
    // Use last user message or synthesize from conversation
    const lastUserMessage = messageHistory
      .slice()
      .reverse()
      .find((msg) => msg.role === 'user')

    const queryForRetrieval =
      lastUserMessage?.content ||
      conversationHistory.substring(0, 200) // Fallback to first 200 chars

    console.log('[proposeAction] Using query for retrieval:', queryForRetrieval)

    // Create a temporary state for retrieval pipeline
    // We need to analyze the query first, then embed it, then retrieve
    const tempStateForAnalysis: HandbookGraphStateType = {
      ...state,
      currentQuery: queryForRetrieval,
      analyzedQuery: null,
    }

    // Step 1: Analyze the query
    const analysisResult = await analyzeQuery(tempStateForAnalysis)
    if (analysisResult.error || !analysisResult.analyzedQuery) {
      console.warn('[proposeAction] Failed to analyze query, continuing anyway')
      // Continue with empty chunks - LLM can still propose actions
    }

    const stateWithAnalysis: HandbookGraphStateType = {
      ...state,
      ...analysisResult,
      currentQuery: queryForRetrieval,
    }

    // Step 2: Embed the query
    const embeddingResult = await embedQuery(stateWithAnalysis)
    if (embeddingResult.error || !embeddingResult.analyzedQuery?.embedding) {
      console.warn('[proposeAction] Failed to embed query, continuing anyway')
      // Continue with empty chunks - LLM can still propose actions
    }

    const stateWithEmbedding: HandbookGraphStateType = {
      ...stateWithAnalysis,
      ...embeddingResult,
      currentQuery: queryForRetrieval,
    }

    // Step 3: Retrieve relevant chunks
    let retrievedChunks = []
    if (stateWithEmbedding.analyzedQuery?.embedding) {
      const retrievalResult = await retrieveVectors(stateWithEmbedding)
      if (!retrievalResult.error && retrievalResult.retrievedChunks) {
        retrievedChunks = retrievalResult.retrievedChunks

        // Step 4: Reconstruct sections
        const stateWithChunks: HandbookGraphStateType = {
          ...stateWithEmbedding,
          retrievedChunks,
        }
        const reconstructionResult = await reconstructSections(stateWithChunks)
        if (
          !reconstructionResult.error &&
          reconstructionResult.retrievedChunks
        ) {
          retrievedChunks = reconstructionResult.retrievedChunks
        }
      }
    }

    console.log(
      `[proposeAction] Retrieved ${retrievedChunks.length} chunks for action proposal`
    )

    // Build handbook context from retrieved chunks
    const handbookContext =
      retrievedChunks.length > 0
        ? retrievedChunks
            .map((chunk, idx) => {
              return `[${idx + 1}] Section: ${chunk.section_path}\nContent: ${chunk.content}`
            })
            .join('\n\n')
        : 'No specific handbook sections retrieved. Base actions on general handbook knowledge if applicable.'

    // Initialize LLM with structured output
    const llm = new ChatOpenAI({
      modelName: HANDBOOK_CONFIG.models.chat,
      temperature: 0.4, // Slightly higher for creative action proposals
      maxTokens: 2000,
      apiKey: process.env.OPENAI_API_KEY,
    }).withStructuredOutput(ActionProposalSchema)

    // Construct action proposal prompt
    const prompt = SYSTEM_PROMPTS.actionProposal(
      conversationHistory,
      handbookContext
    )

    console.log('[proposeAction] Generating action proposals with LLM')

    // Call LLM for structured action proposal
    const proposal = await llm.invoke(prompt)

    // Validate response
    const validatedProposal = ActionProposalSchema.parse(proposal)

    console.log(
      `[proposeAction] Generated ${validatedProposal.actions.length} action(s)`
    )

    // Format citations for the actions
    // We need to map citation numbers to actual citation objects
    let citations: typeof state.citations = []
    if (retrievedChunks.length > 0) {
      const stateForCitations: HandbookGraphStateType = {
        ...state,
        retrievedChunks,
        currentQuery: queryForRetrieval,
      }
      const citationsResult = await formatCitations(stateForCitations)
      if (citationsResult.citations) {
        citations = citationsResult.citations
      }
    }

    // Format the action proposal as a readable answer string
    const formattedAnswer = formatActionProposalAsAnswer(
      validatedProposal,
      citations
    )

    console.log('[proposeAction] Action proposal complete:', {
      actionCount: validatedProposal.actions.length,
      citationCount: citations.length,
    })

    return {
      actionProposal: validatedProposal,
      citations,
      synthesizedAnswer: formattedAnswer, // Also set as answer for display
    }
  } catch (error) {
    console.error('[proposeAction] Error:', error)
    return {
      error: `Failed to propose actions: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      actionProposal: {
        actions: [],
        summary: 'An error occurred while generating action proposals.',
      },
    }
  }
}

/**
 * Format action proposal as a readable answer string
 * This is used for display in the chat interface
 */
function formatActionProposalAsAnswer(
  proposal: { actions: Array<{ title: string; description: string; steps?: string[]; supporting_citations: number[] }>; summary?: string },
  citations: Array<{ number: number }>
): string {
  if (proposal.actions.length === 0) {
    return (
      proposal.summary ||
      "Based on our conversation, I don't have enough information to propose specific actions. Please ask more specific questions about policies or procedures you'd like to follow."
    )
  }

  let answer = ''

  if (proposal.summary) {
    answer += `${proposal.summary}\n\n`
  }

  answer += '**Proposed Actions:**\n\n'

  proposal.actions.forEach((action, idx) => {
    answer += `${idx + 1}. **${action.title}**\n`
    answer += `${action.description}\n`

    if (action.steps && action.steps.length > 0) {
      answer += '\n   Steps:\n'
      action.steps.forEach((step, stepIdx) => {
        answer += `   ${stepIdx + 1}. ${step}\n`
      })
    }

    if (action.supporting_citations.length > 0) {
      const citationRefs = action.supporting_citations
        .map((num) => `[${num}]`)
        .join(', ')
      answer += `\n   References: ${citationRefs}\n`
    }

    answer += '\n'
  })

  return answer.trim()
}

