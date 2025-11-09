import { HANDBOOK_CONFIG } from '@/lib/langgraph/config'
import { Citation, CitationSchema } from '@/types/langgraph'
import type {
  HandbookGraphStateType,
  PartialHandbookState,
} from '@/lib/langgraph/state'

/**
 * Citation Formatter Node
 *
 * Formats retrieved chunks as citations for frontend display
 * Numbers citations and creates previews
 *
 * @param state - Current graph state
 * @returns Partial state with formatted citations
 */
export async function formatCitations(
  state: HandbookGraphStateType
): Promise<PartialHandbookState> {
  try {
    const { retrievedChunks, synthesizedAnswer } = state

    // Validate input
    if (!retrievedChunks || retrievedChunks.length === 0) {
      console.log('[formatCitations] No chunks to format as citations')
      return {
        citations: [],
      }
    }

    console.log(
      `[formatCitations] Formatting ${retrievedChunks.length} citations`
    )

    // Create citations from chunks
    const citations: Citation[] = retrievedChunks.map((chunk, idx) => {
      // Create content preview (truncate to configured length)
      const preview =
        chunk.content.length > HANDBOOK_CONFIG.citations.previewLength
          ? chunk.content
              .substring(0, HANDBOOK_CONFIG.citations.previewLength)
              .trim() + '...'
          : chunk.content

      // Build base citation
      const citation: Citation = {
        number: idx + 1,
        section_path: chunk.section_path,
        precise_section: chunk.precise_section,
        content_preview: preview,
        pinecone_id: chunk.pinecone_id,
        similarity_score: chunk.similarity_score,
      }

      // Add optional metadata based on config
      if (HANDBOOK_CONFIG.citations.includeMetadata.stakeholder_groups) {
        citation.stakeholder_groups = chunk.stakeholder_groups
      }

      if (HANDBOOK_CONFIG.citations.includeMetadata.approval_authority) {
        citation.approval_authority = chunk.approval_authority
      }

      if (HANDBOOK_CONFIG.citations.includeMetadata.section_type) {
        citation.section_type = chunk.section_type
      }

      return citation
    })

    // Validate citations with Zod
    const validatedCitations = citations.map((citation) =>
      CitationSchema.parse(citation)
    )

    // If we have a synthesized answer, we could analyze which citations are actually referenced
    // For now, we'll return all citations in order
    // Future enhancement: parse [1], [2], etc. from answer and reorder/filter citations

    console.log('[formatCitations] Citations formatted successfully:', {
      count: validatedCitations.length,
      includesMetadata: HANDBOOK_CONFIG.citations.includeMetadata,
    })

    return {
      citations: validatedCitations,
    }
  } catch (error) {
    console.error('[formatCitations] Error:', error)
    return {
      error: `Failed to format citations: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}

/**
 * Helper function to extract citation numbers from answer text
 * Finds patterns like [1], [2], etc.
 *
 * @param answer - The synthesized answer text
 * @returns Array of citation numbers found in the answer
 */
export function extractCitationNumbers(answer: string): number[] {
  const pattern = /\[(\d+)\]/g
  const matches = answer.matchAll(pattern)
  const numbers = new Set<number>()

  for (const match of matches) {
    const num = parseInt(match[1], 10)
    if (!isNaN(num)) {
      numbers.add(num)
    }
  }

  return Array.from(numbers).sort((a, b) => a - b)
}

/**
 * Filter and reorder citations based on what's referenced in the answer
 *
 * @param citations - All available citations
 * @param answer - The synthesized answer text
 * @returns Filtered and reordered citations
 */
export function filterCitationsByAnswer(
  citations: Citation[],
  answer: string
): Citation[] {
  const referencedNumbers = extractCitationNumbers(answer)

  if (referencedNumbers.length === 0) {
    // If no citations referenced, return all
    return citations
  }

  // Filter to only referenced citations
  const referencedCitations = citations.filter((citation) =>
    referencedNumbers.includes(citation.number)
  )

  return referencedCitations
}
