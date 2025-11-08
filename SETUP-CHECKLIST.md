# Setup Checklist

Follow these steps to get the LangGraph RAG system up and running.

## Prerequisites

- [ ] Bun 1.0+ installed ([https://bun.sh](https://bun.sh))
- [ ] MongoDB instance (local or Atlas)
- [ ] Pinecone account and index created
- [ ] OpenAI API key

## 1. Environment Setup

- [ ] Copy `.env.example` to `.env.local`
- [ ] Add `OPENAI_API_KEY`
- [ ] Add `MONGODB_URI`
- [ ] Add `PINECONE_API_KEY`
- [ ] Add `PINECONE_INDEX_NAME`
- [ ] (Optional) Add `PINECONE_HOST`
- [ ] (Optional) Add `PINECONE_NAMESPACE`

## 2. Install Dependencies

```bash
bun install
```

- [ ] Dependencies installed successfully
- [ ] No dependency conflicts

## 3. Pinecone Setup

- [ ] Create Pinecone index with:
  - Dimension: **3072**
  - Metric: **cosine**
  - Spec: Serverless (recommended)
- [ ] Verify index name matches `.env.local`
- [ ] Note the namespace if using one

## 4. MongoDB Setup

- [ ] MongoDB instance running and accessible
- [ ] Connection string works
- [ ] Database created (will be auto-created on first use)

### Collections will be created automatically:
- `conversations` - Conversation history
- `handbook_chunks` - Handbook content

## 5. Data Ingestion

**Note**: You need to ingest handbook data before using the system.

Assuming you have the ingestion script from your RAG backend:

```bash
# From your RAG backend directory
python ingest.py path/to/handbook.docx --doc-id faculty-handbook --version 2024-2025
```

- [ ] Handbook data ingested to Pinecone
- [ ] Handbook chunks stored in MongoDB `handbook_chunks` collection
- [ ] Verify data exists:

```javascript
// In MongoDB shell or Compass
use your_database_name
db.handbook_chunks.countDocuments()  // Should return > 0
```

## 6. Test the Application

### Start Development Server

```bash
bun dev
```

- [ ] Server starts on [http://localhost:3000](http://localhost:3000)
- [ ] No startup errors

### Test Health Endpoint

```bash
curl http://localhost:3000/api/health
```

- [ ] Returns successful response

### Test Query Endpoint

```bash
curl -X POST http://localhost:3000/api/handbook/query \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the grading policy?"}' \
  -N
```

- [ ] Returns streaming response
- [ ] No errors in console
- [ ] Response includes citations

### Test Conversation Endpoints

```bash
# List conversations
curl http://localhost:3000/api/handbook/conversations

# Get specific conversation (use ID from previous query)
curl http://localhost:3000/api/handbook/conversations/:id
```

- [ ] Endpoints respond successfully

## 7. Verify Components

### MongoDB

```javascript
// Check indexes were created
db.conversations.getIndexes()
// Should show indexes on: conversationId, userId, lastAccessedAt, createdAt
```

- [ ] Indexes created successfully
- [ ] Conversations being saved

### Pinecone

- [ ] Queries returning results
- [ ] Similarity scores reasonable (> 0.7 for relevant results)

### OpenAI

- [ ] Embeddings generating successfully
- [ ] LLM calls working (query analysis, synthesis)
- [ ] Streaming responses working

## 8. Optional: Setup Testing

```bash
# Install test dependencies
bun add -d vitest @vitest/ui

# Run tests
bun test
```

- [ ] Test dependencies installed
- [ ] Tests passing

## 9. Configuration Review

Review and adjust in `lib/langgraph/config.ts`:

- [ ] `retrieval.topK` - Number of chunks to retrieve (default: 7)
- [ ] `retrieval.minSimilarity` - Minimum similarity threshold (default: 0.7)
- [ ] `citations.previewLength` - Citation preview length (default: 150)
- [ ] `ambiguity.confidenceThreshold` - When to request clarification (default: 0.7)
- [ ] `models.chat` - LLM model to use (default: gpt-4-turbo-preview)
- [ ] `models.temperature` - LLM temperature (default: 0.3)

## 10. Development Setup

- [ ] Review `.cursorrules` for development guidelines
- [ ] Read `IMPLEMENTATION-GUIDE.md` for architecture details
- [ ] Check `__tests__/README.md` for testing guide

## Verification Commands

### Check all environment variables are set

```bash
# In your .env.local
grep -E "OPENAI_API_KEY|MONGODB_URI|PINECONE" .env.local
```

### Test MongoDB connection

```typescript
// Create test script: test-mongo.ts
import { getDatabase } from './lib/mongodb';

async function test() {
  try {
    const db = await getDatabase();
    console.log('✓ MongoDB connected');
    const chunks = await db.collection('handbook_chunks').countDocuments();
    console.log(`✓ Found ${chunks} handbook chunks`);
  } catch (error) {
    console.error('✗ MongoDB error:', error);
  }
  process.exit(0);
}

test();
```

Run: `bun test-mongo.ts`

### Test Pinecone connection

```typescript
// Create test script: test-pinecone.ts
import { getPineconeIndex } from './lib/pinecone';

async function test() {
  try {
    const index = await getPineconeIndex();
    const stats = await index.describeIndexStats();
    console.log('✓ Pinecone connected');
    console.log('✓ Index stats:', stats);
  } catch (error) {
    console.error('✗ Pinecone error:', error);
  }
  process.exit(0);
}

test();
```

Run: `bun test-pinecone.ts`

### Test OpenAI connection

```typescript
// Create test script: test-openai.ts
import OpenAI from 'openai';

async function test() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: 'test',
    });
    
    console.log('✓ OpenAI connected');
    console.log(`✓ Embedding dimension: ${response.data[0].embedding.length}`);
  } catch (error) {
    console.error('✗ OpenAI error:', error);
  }
  process.exit(0);
}

test();
```

Run: `bun test-openai.ts`

## Troubleshooting

### Issue: MongoDB connection fails

- Verify connection string format
- Check network access (firewall, IP whitelist)
- Ensure database user has correct permissions

### Issue: Pinecone queries return no results

- Verify index name matches `.env.local`
- Check namespace is correct
- Confirm data was ingested properly
- Check embedding dimensions (should be 3072)

### Issue: OpenAI API errors

- Verify API key is valid
- Check rate limits and quotas
- Ensure sufficient credits

### Issue: No citations in responses

- Verify handbook chunks exist in MongoDB
- Check Pinecone query is returning results
- Verify `pinecone_id` field exists in MongoDB chunks
- Check minimum similarity threshold

### Issue: Streaming not working

- Ensure client supports Server-Sent Events
- Check no proxy is buffering responses
- Verify Content-Type header is correct

## Next Steps

Once everything is working:

1. **Build the Frontend UI**
   - Create chat interface
   - Handle streaming responses
   - Display citations
   - Implement conversation management

2. **Add Features**
   - User authentication
   - Conversation export
   - Query history
   - Analytics

3. **Deploy**
   - Choose hosting platform (Vercel, AWS, etc.)
   - Set up production environment variables
   - Configure monitoring and logging
   - Set up CI/CD pipeline

## Complete!

- [ ] All checks passed
- [ ] System working end-to-end
- [ ] Ready to build frontend UI

Congratulations! Your LangGraph RAG system is now set up and ready to use.

