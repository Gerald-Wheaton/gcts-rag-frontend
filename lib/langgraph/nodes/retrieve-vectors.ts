import { getPineconeIndex } from '@/lib/pinecone';
import { getChunksByPineconeIds } from '@/lib/mongodb/conversations';
import { HANDBOOK_CONFIG } from '@/lib/langgraph/config';
import { RetrievedChunkSchema } from '@/types/langgraph';
import type { HandbookGraphStateType, PartialHandbookState } from '@/lib/langgraph/state';

/**
 * Vector Retriever Node
 * 
 * Queries Pinecone for semantically similar chunks and fetches full content from MongoDB
 * 
 * @param state - Current graph state
 * @returns Partial state with retrievedChunks
 */
export async function retrieveVectors(state: HandbookGraphStateType): Promise<PartialHandbookState> {
  try {
    const { analyzedQuery } = state;

    // Validate input
    if (!analyzedQuery || !analyzedQuery.embedding) {
      return {
        error: 'No embedding available for retrieval',
      };
    }

    console.log('[retrieveVectors] Starting vector search');

    // Get Pinecone index
    const index = await getPineconeIndex();

    // Build metadata filter if applicable
    const filter: Record<string, any> = {};
    
    if (analyzedQuery.implicitFilters.section_type) {
      filter.section_type = analyzedQuery.implicitFilters.section_type;
      console.log('[retrieveVectors] Applying section_type filter:', filter.section_type);
    }

    if (analyzedQuery.implicitFilters.stakeholder_groups && 
        analyzedQuery.implicitFilters.stakeholder_groups.length > 0) {
      // Pinecone metadata filtering for arrays
      filter.stakeholder_groups = { $in: analyzedQuery.implicitFilters.stakeholder_groups };
      console.log('[retrieveVectors] Applying stakeholder_groups filter:', analyzedQuery.implicitFilters.stakeholder_groups);
    }

    // Query Pinecone
    const queryRequest: any = {
      vector: analyzedQuery.embedding,
      topK: HANDBOOK_CONFIG.retrieval.topK,
      includeMetadata: true,
    };

    // Only add filter if it has properties
    if (Object.keys(filter).length > 0) {
      queryRequest.filter = filter;
    }

    // Add namespace if configured
    if (HANDBOOK_CONFIG.pinecone.namespace) {
      queryRequest.namespace = HANDBOOK_CONFIG.pinecone.namespace;
    }

    const queryResponse = await index.query(queryRequest);

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log('[retrieveVectors] No matches found');
      return {
        retrievedChunks: [],
      };
    }

    console.log(`[retrieveVectors] Found ${queryResponse.matches.length} matches from Pinecone`);

    // Filter by minimum similarity threshold
    const relevantMatches = queryResponse.matches.filter(
      match => match.score && match.score >= HANDBOOK_CONFIG.retrieval.minSimilarity
    );

    if (relevantMatches.length === 0) {
      console.log('[retrieveVectors] No matches above similarity threshold');
      return {
        retrievedChunks: [],
      };
    }

    console.log(`[retrieveVectors] ${relevantMatches.length} matches above threshold`);

    // Extract Pinecone IDs
    const pineconeIds = relevantMatches.map(match => match.id);

    // Fetch full content from MongoDB
    const mongoChunks = await getChunksByPineconeIds(pineconeIds);

    if (mongoChunks.length === 0) {
      console.warn('[retrieveVectors] No chunks found in MongoDB for Pinecone IDs');
      return {
        retrievedChunks: [],
      };
    }

    console.log(`[retrieveVectors] Retrieved ${mongoChunks.length} chunks from MongoDB`);

    // Merge Pinecone scores with MongoDB content
    const retrievedChunks = relevantMatches
      .map(match => {
        const mongoChunk = mongoChunks.find(chunk => chunk.pinecone_id === match.id);
        
        if (!mongoChunk) {
          console.warn(`[retrieveVectors] No MongoDB chunk for Pinecone ID: ${match.id}`);
          return null;
        }

        // Build retrieved chunk with all metadata
        return {
          pinecone_id: match.id,
          content: mongoChunk.content || '',
          section_path: mongoChunk.section_path || 'Unknown Section',
          section_type: mongoChunk.section_type || 'unknown',
          stakeholder_groups: mongoChunk.stakeholder_groups || [],
          approval_authority: mongoChunk.approval_authority || 'unknown',
          similarity_score: match.score || 0,
          doc_id: mongoChunk.doc_id,
        };
      })
      .filter((chunk): chunk is NonNullable<typeof chunk> => chunk !== null);

    // Validate chunks with Zod
    const validatedChunks = retrievedChunks.map(chunk => 
      RetrievedChunkSchema.parse(chunk)
    );

    console.log('[retrieveVectors] Retrieval complete:', {
      totalChunks: validatedChunks.length,
      avgSimilarity: validatedChunks.reduce((sum, c) => sum + c.similarity_score, 0) / validatedChunks.length,
    });

    return {
      retrievedChunks: validatedChunks,
    };
  } catch (error) {
    console.error('[retrieveVectors] Error:', error);
    return {
      error: `Failed to retrieve vectors: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

