import { getChunksBySectionPath } from '@/lib/mongodb/conversations'
import { RetrievedChunkSchema } from '@/types/langgraph'
import type {
  HandbookGraphStateType,
  PartialHandbookState,
} from '@/lib/langgraph/state'

/**
 * Section Reconstructor Node
 *
 * Reconstructs complete sections from partial chunks by fetching all chunks
 * belonging to the same section_path from MongoDB and merging them in order.
 *
 * @param state - Current graph state
 * @returns Partial state with reconstructed sections in retrievedChunks
 */
export async function reconstructSections(
  state: HandbookGraphStateType
): Promise<PartialHandbookState> {
  try {
    const { retrievedChunks } = state

    // Validate input
    if (!retrievedChunks || retrievedChunks.length === 0) {
      console.log('[reconstructSections] No chunks to reconstruct')
      return {
        retrievedChunks: [],
      }
    }

    console.log(
      `[reconstructSections] Reconstructing sections from ${retrievedChunks.length} chunks`
    )

    // Group chunks by section_path
    // Use a Map to track unique section paths and their chunks
    const sectionMap = new Map<string, typeof retrievedChunks>()

    for (const chunk of retrievedChunks) {
      const sectionPath = chunk.section_path
      if (!sectionMap.has(sectionPath)) {
        sectionMap.set(sectionPath, [])
      }
      sectionMap.get(sectionPath)!.push(chunk)
    }

    console.log(
      `[reconstructSections] Found ${sectionMap.size} unique sections to reconstruct`
    )

    // Reconstruct each section
    const reconstructedChunks: typeof retrievedChunks = []

    for (const [sectionPath, chunks] of sectionMap.entries()) {
      try {
        console.log(
          `[reconstructSections] Processing section: "${sectionPath}"`
        )
        console.log(
          `[reconstructSections] Found ${chunks.length} retrieved chunk(s) for this section`
        )

        // Log original retrieved chunks for this section
        chunks.forEach((chunk, idx) => {
          console.log(
            `[reconstructSections] Original chunk ${idx + 1}/${chunks.length}:`
          )
          console.log(`  - Pinecone ID: ${chunk.pinecone_id}`)
          console.log(
            `  - Content preview (first 200 chars): ${chunk.content.substring(
              0,
              200
            )}...`
          )
          console.log(`  - Content length: ${chunk.content.length} characters`)
          console.log(
            `  - Similarity score: ${chunk.similarity_score.toFixed(3)}`
          )
        })

        // Fetch all chunks for this section from MongoDB
        const allSectionChunks = await getChunksBySectionPath(sectionPath)

        if (allSectionChunks.length === 0) {
          console.warn(
            `[reconstructSections] No chunks found in MongoDB for section: ${sectionPath}`
          )
          // Fallback: use the original chunks if MongoDB query fails
          reconstructedChunks.push(...chunks)
          continue
        }

        console.log(
          `[reconstructSections] Found ${allSectionChunks.length} total chunk(s) in MongoDB for section "${sectionPath}"`
        )

        // Sort by chunk_index if available, otherwise keep MongoDB order
        const sortedChunks = allSectionChunks.sort((a, b) => {
          const aIndex = a.chunk_index ?? 0
          const bIndex = b.chunk_index ?? 0
          return aIndex - bIndex
        })

        // Log each chunk that will be merged
        console.log(
          `[reconstructSections] Merging ${sortedChunks.length} chunks in order:`
        )
        sortedChunks.forEach((chunk, idx) => {
          const chunkContent = chunk.content || ''
          const preview = chunkContent.substring(0, 150).trim()
          console.log(
            `  Chunk ${idx + 1}/${sortedChunks.length} (index: ${
              chunk.chunk_index ?? 'N/A'
            }):`
          )
          console.log(
            `    - Content preview: ${preview}${
              chunkContent.length > 150 ? '...' : ''
            }`
          )
          console.log(`    - Content length: ${chunkContent.length} characters`)
        })

        // Merge chunk contents with double newline separator
        const mergedContent = sortedChunks
          .map((chunk) => chunk.content || '')
          .filter((content) => content.trim().length > 0)
          .join('\n\n')

        if (mergedContent.trim().length === 0) {
          console.warn(
            `[reconstructSections] Empty merged content for section: ${sectionPath}`
          )
          // Fallback: use original chunks
          reconstructedChunks.push(...chunks)
          continue
        }

        // Log the merged result
        console.log(
          `[reconstructSections] Merged content for "${sectionPath}":`
        )
        console.log(`  - Total chunks merged: ${sortedChunks.length}`)
        console.log(
          `  - Merged content length: ${mergedContent.length} characters`
        )
        console.log(
          `  - Merged content preview (first 300 chars): ${mergedContent.substring(
            0,
            300
          )}...`
        )
        console.log(
          `  - Merged content preview (last 200 chars): ...${mergedContent.substring(
            Math.max(0, mergedContent.length - 200)
          )}`
        )

        // Use the highest similarity_score from original retrieved chunks for this section
        const maxSimilarityScore = Math.max(
          ...chunks.map((c) => c.similarity_score)
        )

        // Use the first chunk's metadata as representative
        const representativeChunk = chunks[0]

        // Build reconstructed chunk
        const reconstructedChunk = {
          pinecone_id: representativeChunk.pinecone_id, // Keep first chunk's ID
          content: mergedContent,
          section_path: representativeChunk.section_path,
          precise_section: representativeChunk.precise_section,
          section_type: representativeChunk.section_type,
          stakeholder_groups: representativeChunk.stakeholder_groups,
          approval_authority: representativeChunk.approval_authority,
          similarity_score: maxSimilarityScore,
          relevance_score: representativeChunk.relevance_score,
          doc_id: representativeChunk.doc_id,
        }

        // Validate with Zod schema
        const validatedChunk = RetrievedChunkSchema.parse(reconstructedChunk)
        reconstructedChunks.push(validatedChunk)

        console.log(
          `[reconstructSections] ✓ Successfully reconstructed section "${sectionPath}":`
        )
        console.log(`  - Original chunks: ${chunks.length}`)
        console.log(`  - Total chunks merged: ${sortedChunks.length}`)
        console.log(
          `  - Final content length: ${mergedContent.length} characters`
        )
        console.log(`  - Similarity score: ${maxSimilarityScore.toFixed(3)}`)
        console.log(`  - Final pinecone_id: ${representativeChunk.pinecone_id}`)
      } catch (error) {
        console.error(
          `[reconstructSections] Error reconstructing section "${sectionPath}":`,
          error
        )
        // Fallback: use original chunks if reconstruction fails
        reconstructedChunks.push(...chunks)
      }
    }

    console.log('[reconstructSections] Section reconstruction complete:', {
      originalChunks: retrievedChunks.length,
      reconstructedChunks: reconstructedChunks.length,
      uniqueSections: sectionMap.size,
    })

    return {
      retrievedChunks: reconstructedChunks,
    }
  } catch (error) {
    console.error('[reconstructSections] Error:', error)
    return {
      error: `Failed to reconstruct sections: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}
