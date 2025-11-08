# LangGraph RAG System - Implementation Guide

## Overview

This document describes the complete implementation of the LangGraph-orchestrated RAG system for the GCTS Faculty Handbook. The system allows users to ask questions about the handbook and receive accurate, cited answers with full conversation memory.

## System Architecture

### Core Components

1. **LangGraph Pipeline** - Multi-node workflow for query processing
2. **Vector Search** - Pinecone for semantic search (3072-dim embeddings)
3. **Document Store** - MongoDB for conversation history and chunk content
4. **LLM Integration** - OpenAI for query analysis, reranking, and synthesis
5. **Streaming API** - Server-Sent Events for real-time responses

### Data Flow

```
User Query
    ↓
Query Analysis (detect ambiguity, extract intent)
    ↓
[Clarification needed?] → Yes → Request Clarification → End
    ↓ No
Generate Embedding (text-embedding-3-large, 3072 dims)
    ↓
Retrieve Vectors (Pinecone + MongoDB)
    ↓
Rerank Chunks (LLM-based relevance scoring)
    ↓
Synthesize Answer (GPT-4, with streaming)
    ↓
Format Citations
    ↓
Return to User
```

## File Structure

```
lib/
  langgraph/
    config.ts                    # System configuration and prompts
    state.ts                     # Graph state definition
    graph.ts                     # LangGraph workflow (kept for reference)
    graph-simple.ts              # Simplified pipeline implementation (USED)
    edges.ts                     # Routing logic
    nodes/
      analyzeQuery.ts            # Query analysis with ambiguity detection
      embedQuery.ts              # Vector embedding generation
      retrieveVectors.ts         # Pinecone + MongoDB retrieval
      rerankChunks.ts            # LLM-based relevance scoring
      synthesizeAnswer.ts        # Answer generation with streaming
      formatCitations.ts         # Citation formatting
      requestClarification.ts    # Clarification request generation
  mongodb/
    conversations.ts             # Conversation CRUD operations
  mongodb.ts                     # MongoDB connection
  pinecone.ts                    # Pinecone client setup
  openai.ts                      # OpenAI client setup
types/
  langgraph.ts                   # Type definitions and Zod schemas
  index.ts                       # General types
app/
  api/
    handbook/
      query/route.ts             # Main query endpoint (POST /api/handbook/query)
      conversations/
        route.ts                 # List/create conversations
        [id]/route.ts            # Get/update/delete conversation
__tests__/                       # Unit and integration tests
.cursorrules                     # Development guidelines
```

## Configuration

### Environment Variables

Create `.env.local` with the following:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_HOST=your_pinecone_host  # Optional
PINECONE_INDEX_NAME=your_index_name
PINECONE_NAMESPACE=faculty-handbook-v1  # Optional
```

### System Configuration

Edit `lib/langgraph/config.ts` to adjust:

- **Retrieval Settings**: Number of chunks, similarity thresholds
- **Citation Format**: What metadata to include
- **Ambiguity Detection**: Confidence thresholds
- **Model Selection**: GPT-4 variants, temperature settings
- **Retry Logic**: Rate limit handling

Key configuration options:

```typescript
export const HANDBOOK_CONFIG = {
  retrieval: {
    topK: 7,              // Chunks to retrieve
    rerankTopK: 5,        // Chunks after reranking
    minSimilarity: 0.7,   // Minimum similarity score
  },
  citations: {
    previewLength: 150,   // Character length for previews
    includeMetadata: {    // What to show in citations
      stakeholder_groups: true,
      approval_authority: true,
      section_type: true,
    },
  },
  ambiguity: {
    confidenceThreshold: 0.7,  // Below this = ambiguous
  },
  models: {
    embedding: 'text-embedding-3-large',
    chat: 'gpt-4-turbo-preview',
    temperature: 0.3,     // Lower for factual accuracy
  },
};
```

## MongoDB Setup

### Required Collections

1. **conversations** - Stores conversation history
2. **handbook_chunks** - Stores handbook content with metadata

### Conversations Schema

```typescript
{
  _id: ObjectId,
  conversationId: string,        // UUID
  userId: string,                // For future auth
  title: string,                 // Auto-generated
  messages: [
    {
      role: 'user' | 'assistant' | 'system',
      content: string,
      timestamp: Date,
      citations: [...],          // Only for assistant messages
    }
  ],
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date,
}
```

### Handbook Chunks Schema

```typescript
{
  _id: ObjectId,
  pinecone_id: string,           // SHA-256 hash
  doc_id: string,                // 'faculty-handbook'
  content: string,               // Full chunk text
  section_path: string,          // 'Academic > Policies'
  section_type: string,          // 'policies', 'procedures', etc.
  stakeholder_groups: string[],  // ['faculty', 'students']
  approval_authority: string,    // 'dean', 'president', etc.
}
```

### Create Indexes

Run on application startup:

```typescript
import { createConversationIndexes } from '@/lib/mongodb/conversations';

await createConversationIndexes();
```

## Pinecone Setup

### Index Configuration

- **Dimension**: 3072 (text-embedding-3-large)
- **Metric**: cosine
- **Spec**: Serverless (recommended)

### Metadata Fields

Each vector in Pinecone includes:

```json
{
  "doc_id": "faculty-handbook",
  "section_path": "Academic > Policies",
  "section_type": "policies",
  "stakeholder_groups": "students,faculty",
  "approval_authority": "dean",
  "content_preview": "First 500 characters..."
}
```

## API Endpoints

### POST /api/handbook/query

Main query endpoint with streaming support.

**Request:**
```json
{
  "query": "What is the grading policy?",
  "conversationId": "optional-uuid"  // Omit for new conversation
}
```

**Response (Server-Sent Events):**

```
data: {"type":"conversationId","data":{"conversationId":"uuid"}}

data: {"type":"answer","data":{"content":"According","conversationId":"uuid"}}
data: {"type":"answer","data":{"content":" to","conversationId":"uuid"}}
data: {"type":"answer","data":{"content":" the","conversationId":"uuid"}}
...

data: {"type":"citation","data":{"number":1,"section_path":"Academic > Grading","content_preview":"...","pinecone_id":"id","similarity_score":0.95}}

data: {"type":"done","data":{"conversationId":"uuid"}}
```

**Stream Event Types:**

- `conversationId` - Conversation ID (first event)
- `answer` - Streamed answer chunks
- `citation` - Citation information
- `clarification` - Clarification request (if query is ambiguous)
- `error` - Error message
- `done` - Stream complete

### GET /api/handbook/conversations

List all conversations.

**Query Parameters:**
- `userId` (optional) - Filter by user
- `limit` (default: 50, max: 100) - Results per page
- `skip` (default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [...],
    "total": 42,
    "limit": 50,
    "skip": 0
  }
}
```

### GET /api/handbook/conversations/:id

Get specific conversation.

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "title": "Grading Policy Questions",
    "messages": [...],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:10:00.000Z"
  }
}
```

### PATCH /api/handbook/conversations/:id

Update conversation title.

**Request:**
```json
{
  "title": "New Title"
}
```

### DELETE /api/handbook/conversations/:id

Delete a conversation.

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "deleted": true
  }
}
```

## Usage Examples

### JavaScript/TypeScript Client

```typescript
async function askHandbook(query: string, conversationId?: string) {
  const response = await fetch('/api/handbook/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, conversationId }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error('No reader');

  let conversationId = '';
  let fullAnswer = '';
  const citations = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const data = JSON.parse(line.slice(6));

      switch (data.type) {
        case 'conversationId':
          conversationId = data.data.conversationId;
          break;
        case 'answer':
          fullAnswer += data.data.content;
          console.log(data.data.content); // Stream to UI
          break;
        case 'citation':
          citations.push(data.data);
          break;
        case 'clarification':
          console.log('Clarification needed:', data.data.question);
          break;
        case 'error':
          console.error('Error:', data.data.message);
          break;
        case 'done':
          console.log('Complete');
          break;
      }
    }
  }

  return { conversationId, answer: fullAnswer, citations };
}

// Usage
const result = await askHandbook('What is the grading policy?');
console.log('Answer:', result.answer);
console.log('Citations:', result.citations);

// Follow-up question in same conversation
const followUp = await askHandbook(
  'What about late submissions?',
  result.conversationId
);
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/handbook/query \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the grading policy?"}' \
  -N  # Enable streaming
```

## Key Features

### 1. Conversation Memory

- Full conversation history maintained in MongoDB
- Context from previous messages included in query analysis
- Automatic conversation title generation
- Multi-conversation support (like ChatGPT)

### 2. Ambiguity Detection

Queries are analyzed for:
- Vague or unclear intent
- Missing context
- Multiple possible interpretations
- Low confidence scores (< 0.7)

When ambiguous, the system requests clarification with suggested options.

### 3. Semantic Search

- **Embedding Model**: text-embedding-3-large (3072 dimensions)
- **Top-K Retrieval**: 7 chunks from Pinecone
- **Metadata Filtering**: Auto-determined section_type and stakeholder_groups
- **Minimum Similarity**: 0.7 threshold

### 4. LLM-Based Reranking

After initial retrieval, chunks are reranked using GPT-4 for:
- Better relevance to specific query
- Context-aware scoring (0-10 scale)
- Top 5 chunks kept for synthesis

### 5. Citation Management

Each citation includes:
- Section path in handbook
- Content preview (150 characters)
- Pinecone ID for full lookup
- Similarity score
- Optional metadata (stakeholder groups, approval authority, section type)

Citations are numbered [1], [2], etc. and referenced inline in answers.

### 6. Streaming Responses

- Real-time answer streaming via Server-Sent Events
- Better user experience for long answers
- Reduced perceived latency
- Citations sent after answer completes

### 7. Error Handling

- Comprehensive try-catch blocks in all nodes
- Graceful fallbacks (e.g., reranking failures don't stop pipeline)
- Descriptive error messages
- Retry logic for rate limits (exponential backoff)

## Testing

### Run Tests

```bash
# Install test dependencies first
bun add -d vitest @vitest/ui

# Run all tests
bun test

# Run with UI
bun test:ui

# Run specific test
bun test __tests__/lib/langgraph/edges.test.ts
```

### Test Coverage

Current test files:
- `__tests__/lib/langgraph/edges.test.ts` - Routing logic
- `__tests__/lib/langgraph/nodes/formatCitations.test.ts` - Citation formatting
- `__tests__/types/validation.test.ts` - Zod schema validation

See `__tests__/README.md` for detailed testing guide.

## Development Guidelines

See `.cursorrules` for complete development guidelines including:
- Node development patterns
- Error handling requirements
- Type safety practices
- LLM call best practices
- Testing strategies

## Troubleshooting

### Common Issues

1. **"No chunks found" errors**
   - Verify Pinecone index exists and has data
   - Check PINECONE_INDEX_NAME in .env.local
   - Verify namespace matches data

2. **"Failed to generate embedding" errors**
   - Check OPENAI_API_KEY is valid
   - Verify API quota/rate limits
   - Check network connectivity

3. **MongoDB connection errors**
   - Verify MONGODB_URI is correct
   - Check network access to MongoDB
   - Ensure database exists

4. **Streaming not working**
   - Ensure client supports Server-Sent Events
   - Check Content-Type header is set correctly
   - Verify no proxy buffering responses

### Debug Logging

All nodes log their progress:

```typescript
console.log('[nodeName] Starting...');
console.log('[nodeName] Result:', { ... });
console.error('[nodeName] Error:', error);
```

Check server logs for detailed execution flow.

## Performance Optimization

### Current Performance

- Query analysis: ~1-2 seconds
- Embedding generation: ~0.5-1 second
- Vector retrieval: ~0.5-1 second
- Reranking: ~2-3 seconds (if needed)
- Answer synthesis: ~5-10 seconds (streaming)

**Total**: ~10-15 seconds for complete pipeline

### Optimization Strategies

1. **Skip reranking for few chunks** (< 4 chunks)
2. **Cache embeddings** for common queries
3. **Batch operations** where possible
4. **Use streaming** to reduce perceived latency
5. **Adjust topK** based on query complexity
6. **Consider gpt-4o** for faster synthesis

## Future Enhancements

### Planned Features

1. **Query Expansion** - Generate related queries for better retrieval
2. **Source Validation** - Cross-reference chunks for consistency
3. **Follow-up Suggestions** - Suggest related questions
4. **Intent Classification** - Tailor strategy per query type (factual, procedural, etc.)
5. **Feedback Loop** - Learn from user ratings
6. **User Authentication** - Personalized conversations
7. **Advanced Filtering** - Let users specify section types, stakeholder groups
8. **Multi-modal Support** - Handle images, tables in handbook
9. **Export Conversations** - PDF, Markdown export
10. **Analytics Dashboard** - Track usage, popular questions, accuracy

### Scalability Considerations

- **Rate Limiting**: Implement API rate limits
- **Caching**: Redis for frequent queries
- **Load Balancing**: Multiple API instances
- **Database Sharding**: For large conversation volumes
- **CDN**: For static assets
- **Monitoring**: APM, error tracking (Sentry, DataDog)

## Support

For issues or questions:
1. Check this guide
2. Review `.cursorrules`
3. Check `__tests__/README.md` for testing
4. Review code comments in node files
5. Consult LangChain/LangGraph documentation

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)
- [LangChain JS Docs](https://js.langchain.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Next.js Documentation](https://nextjs.org/docs)

