import { getPineconeIndex } from '@/lib/pinecone'
import { getChunksByPineconeIds } from '@/lib/mongodb/conversations'
import { HANDBOOK_CONFIG } from '@/lib/langgraph/config'
import { RetrievedChunkSchema } from '@/types/langgraph'
import type {
  HandbookGraphStateType,
  PartialHandbookState,
} from '@/lib/langgraph/state'

/**
 * Vector Retriever Node
 *
 * Queries Pinecone for semantically similar chunks and fetches full content from MongoDB
 *
 * @param state - Current graph state
 * @returns Partial state with retrievedChunks
 */
export async function retrieveVectors(
  state: HandbookGraphStateType
): Promise<PartialHandbookState> {
  try {
    const { analyzedQuery } = state

    // Validate input
    if (!analyzedQuery || !analyzedQuery.embedding) {
      return {
        error: 'No embedding available for retrieval',
      }
    }

    console.log('[retrieveVectors] Starting vector search')
    console.log(
      '[retrieveVectors] Using namespace:',
      HANDBOOK_CONFIG.pinecone.namespace || '(default/none)'
    )
    console.log('[retrieveVectors] TopK:', HANDBOOK_CONFIG.retrieval.topK)
    console.log(
      '[retrieveVectors] Min similarity:',
      HANDBOOK_CONFIG.retrieval.minSimilarity
    )

    // Get Pinecone index (with namespace if configured)
    const index = await getPineconeIndex(
      undefined,
      HANDBOOK_CONFIG.pinecone.namespace || undefined
    )

    // Build metadata filter if applicable
    const filter: Record<string, any> = {}

    // TEMPORARILY DISABLED: Metadata filters are too restrictive and excluding good matches.
    // The query analyzer auto-applies filters (section_type, stakeholder_groups) but these
    // often reduce the search space too much, resulting in low similarity scores (< 0.5).
    // Disabling to search across ALL chunks and find the best semantic matches.
    // TODO: Re-enable after tuning filter logic or lowering similarity threshold further.

    // if (analyzedQuery.implicitFilters.section_type) {
    //   filter.section_type = analyzedQuery.implicitFilters.section_type
    //   console.log(
    //     '[retrieveVectors] Applying section_type filter:',
    //     filter.section_type
    //   )
    // }

    // if (
    //   analyzedQuery.implicitFilters.stakeholder_groups &&
    //   analyzedQuery.implicitFilters.stakeholder_groups.length > 0
    // ) {
    //   // Pinecone metadata filtering for arrays
    //   filter.stakeholder_groups = {
    //     $in: analyzedQuery.implicitFilters.stakeholder_groups,
    //   }
    //   console.log(
    //     '[retrieveVectors] Applying stakeholder_groups filter:',
    //     analyzedQuery.implicitFilters.stakeholder_groups
    //   )
    // }

    // Query Pinecone
    const queryRequest: any = {
      vector: analyzedQuery.embedding,
      topK: HANDBOOK_CONFIG.retrieval.topK,
      includeMetadata: true,
    }

    // Only add filter if it has properties
    if (Object.keys(filter).length > 0) {
      queryRequest.filter = filter
    }

    const queryResponse = await index.query(queryRequest)

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log('[retrieveVectors] No matches found')
      return {
        retrievedChunks: [],
      }
    }

    console.log(
      `[retrieveVectors] Found ${queryResponse.matches.length} matches from Pinecone`
    )

    // Log top match scores for debugging
    if (queryResponse.matches.length > 0) {
      const topScores = queryResponse.matches
        .slice(0, 3)
        .map((m) => m.score?.toFixed(3))
      console.log('[retrieveVectors] Top 3 similarity scores:', topScores)
    }

    // Filter by minimum similarity threshold
    const relevantMatches = queryResponse.matches.filter(
      (match) =>
        match.score && match.score >= HANDBOOK_CONFIG.retrieval.minSimilarity
    )

    if (relevantMatches.length === 0) {
      console.log('[retrieveVectors] No matches above similarity threshold')
      console.log(
        '[retrieveVectors] Threshold is:',
        HANDBOOK_CONFIG.retrieval.minSimilarity
      )
      console.log('[retrieveVectors] Consider lowering minSimilarity in config')
      return {
        retrievedChunks: [],
      }
    }

    console.log(
      `[retrieveVectors] ${relevantMatches.length} matches above threshold`
    )

    // Extract Pinecone IDs
    const pineconeIds = relevantMatches.map((match) => match.id)
    console.log(
      '[retrieveVectors] Searching MongoDB for Pinecone IDs:',
      pineconeIds
    )

    // Fetch full content from MongoDB
    const mongoChunks = await getChunksByPineconeIds(pineconeIds)

    if (mongoChunks.length === 0) {
      console.warn(
        '[retrieveVectors] No chunks found in MongoDB for Pinecone IDs:',
        pineconeIds
      )
      console.warn(
        '[retrieveVectors] Check if these IDs exist in your MongoDB collection'
      )
      console.warn(
        '[retrieveVectors] Collection name:',
        HANDBOOK_CONFIG.collections.handbookChunks
      )
      return {
        retrievedChunks: [],
      }
    }

    console.log(
      `[retrieveVectors] Retrieved ${mongoChunks.length} chunks from MongoDB`
    )

    // Merge Pinecone scores with MongoDB content
    const retrievedChunks = relevantMatches
      .map((match) => {
        const mongoChunk = mongoChunks.find(
          (chunk) => chunk.pinecone_id === match.id
        )

        if (!mongoChunk) {
          console.warn(
            `[retrieveVectors] No MongoDB chunk for Pinecone ID: ${match.id}`
          )
          return null
        }

        // Build retrieved chunk with all metadata
        // Convert section_path from array to string if needed
        let sectionPath: string
        let preciseSection: string
        if (Array.isArray(mongoChunk.section_path)) {
          sectionPath = mongoChunk.section_path.join(' > ')
          // Extract the last element as precise_section
          preciseSection =
            mongoChunk.section_path.length > 0
              ? mongoChunk.section_path[mongoChunk.section_path.length - 1]
              : sectionPath
        } else if (typeof mongoChunk.section_path === 'string') {
          sectionPath = mongoChunk.section_path
          // If already a string, use it as precise_section (fallback)
          preciseSection = sectionPath
        } else {
          sectionPath = 'Unknown Section'
          preciseSection = 'Unknown Section'
        }

        return {
          pinecone_id: match.id,
          content: mongoChunk.content || '',
          section_path: sectionPath,
          precise_section: preciseSection,
          section_type: mongoChunk.section_type || 'unknown',
          stakeholder_groups: mongoChunk.stakeholder_groups || [],
          approval_authority: mongoChunk.approval_authority || 'unknown',
          similarity_score: match.score || 0,
          doc_id: mongoChunk.doc_id,
        }
      })
      .filter((chunk): chunk is NonNullable<typeof chunk> => chunk !== null)

    // Validate chunks with Zod
    const validatedChunks = retrievedChunks.map((chunk) =>
      RetrievedChunkSchema.parse(chunk)
    )

    console.log('[retrieveVectors] Retrieval complete:', {
      totalChunks: validatedChunks.length,
      avgSimilarity:
        validatedChunks.reduce((sum, c) => sum + c.similarity_score, 0) /
        validatedChunks.length,
    })

    return {
      retrievedChunks: validatedChunks,
    }
  } catch (error) {
    console.error('[retrieveVectors] Error:', error)
    return {
      error: `Failed to retrieve vectors: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}
