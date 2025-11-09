# LangGraph Node Flow Guide

This document provides a detailed explanation of each graph node, the information passed between nodes, and how they are orchestrated when a user asks a question about the faculty handbook.

## Table of Contents

1. [Overview](#overview)
2. [Graph State](#graph-state)
3. [Node-by-Node Breakdown](#node-by-node-breakdown)
4. [Orchestration Flow](#orchestration-flow)
5. [Example Walkthrough](#example-walkthrough)

---

## Overview

The LangGraph RAG system processes user queries through a series of specialized nodes. Each node:

- Receives the complete graph state
- Performs a specific task
- Returns partial state updates (only the fields it modified)
- Never mutates the state directly

The nodes are orchestrated in `lib/langgraph/graph-simple.ts` in a linear pipeline with conditional branching.

---

## Graph State

The graph state (`HandbookGraphStateType`) is the single source of truth that flows through all nodes. It contains:

```typescript
{
  conversationId: string,              // UUID for the conversation
  messageHistory: ConversationMessage[], // Previous messages (user + assistant)
  currentQuery: string,                // The current user question
  analyzedQuery: AnalyzedQuery | null, // Parsed query with intent & metadata
  retrievedChunks: RetrievedChunk[],   // Relevant handbook chunks
  synthesizedAnswer: string | null,    // Generated answer
  citations: Citation[],               // Formatted citations
  error: string | null,                // Error message if any step fails
  requiresClarification: boolean,      // Whether query is ambiguous
  clarificationRequest: string | null  // Clarification question for user
}
```

### State Updates

- **Reducer Pattern**: Arrays like `messageHistory` use a concat reducer (new items are appended)
- **Replacement Pattern**: Single values are replaced when updated
- **Immutability**: Nodes return new values; they never modify the input state

---

## Node-by-Node Breakdown

### 1. Analyze Query Node

**File**: `lib/langgraph/nodes/analyze-query.ts`

**Purpose**: Understand the user's query, detect ambiguity, and extract metadata for targeted retrieval.

**Input State**:

```typescript
{
  currentQuery: string,        // The user's question
  messageHistory: Message[],   // Previous conversation context
}
```

**What It Does**:

1. Sends query + conversation history to GPT-4
2. Uses LLM with structured output (Zod schema validation)
3. Analyzes for:
   - **Intent**: What the user wants to know
   - **Entities**: Key terms extracted (e.g., "grading", "policy")
   - **Implicit Filters**: Determines section_type and stakeholder_groups
   - **Confidence Score**: 0-1 scale (< 0.7 = ambiguous)
   - **Ambiguity Detection**: Too vague, multiple interpretations, missing context

**Output State**:

```typescript
{
  analyzedQuery: {
    intent: string,
    entities: string[],
    implicitFilters: {
      section_type?: string,           // e.g., "policies"
      stakeholder_groups?: string[],   // e.g., ["faculty", "students"]
    },
    confidence: number,
    requiresClarification: boolean,
    clarificationReason?: string,
  },
  requiresClarification: boolean,
}
```

**Example**:

```typescript
// Input: "What's the grading policy?"
// Output:
{
  analyzedQuery: {
    intent: "Find information about grading policies",
    entities: ["grading", "policy"],
    implicitFilters: {
      section_type: "policies",
      stakeholder_groups: ["faculty", "students"],
    },
    confidence: 0.95,
    requiresClarification: false,
  },
  requiresClarification: false,
}
```

**LLM Details**:

- Model: `gpt-4-turbo-preview`
- Temperature: `0.2` (low for consistency)
- Prompt: `SYSTEM_PROMPTS.queryAnalysis` from config

---

### 2. Request Clarification Node

**File**: `lib/langgraph/nodes/request-clarification.ts`

**Purpose**: Generate a helpful clarification question when the query is ambiguous.

**When Executed**: Only if `requiresClarification === true` after query analysis.

**Input State**:

```typescript
{
  currentQuery: string,
  analyzedQuery: {
    requiresClarification: true,
    clarificationReason: string,
    confidence: number,
  },
}
```

**What It Does**:

1. Takes the ambiguous query and reason
2. Uses GPT-4 to generate a user-friendly clarification question
3. Provides options when multiple interpretations exist

**Output State**:

```typescript
{
  clarificationRequest: string,      // Question to ask user
  requiresClarification: true,       // Keeps flag set
}
```

**Example**:

```typescript
// Input: "What's the deadline?"
// Output:
{
  clarificationRequest: "I'd be happy to help! Which deadline are you asking about?\n\n1. Assignment submission deadline\n2. Grade submission deadline for faculty\n3. Registration deadline\n4. Graduation application deadline",
}
```

**Flow After This Node**: Pipeline ends. User must provide more context and start a new query.

---

### 3. Embed Query Node

**File**: `lib/langgraph/nodes/embed-query.ts`

**Purpose**: Convert the query into a vector embedding for semantic search.

**Input State**:

```typescript
{
  currentQuery: string,
  analyzedQuery: AnalyzedQuery,
  messageHistory: Message[],
}
```

**What It Does**:

1. Constructs embedding text from query + recent conversation context
2. Calls OpenAI embeddings API with `text-embedding-3-large`
3. Generates 3072-dimensional vector
4. Implements retry logic for rate limits (exponential backoff)

**Output State**:

```typescript
{
  analyzedQuery: {
    ...previousAnalyzedQuery,
    embedding: number[],  // 3072-dim vector
  },
}
```

**Technical Details**:

- Model: `text-embedding-3-large`
- Dimensions: 3072
- Includes last 2 user messages for context
- Retry logic: 3 attempts with 1s, 2s, 4s delays

**Example**:

```typescript
// Input: "What's the grading policy?"
// Output:
{
  analyzedQuery: {
    // ... previous fields ...
    embedding: [0.012, -0.034, 0.156, ...], // 3072 numbers
  },
}
```

---

### 4. Retrieve Vectors Node

**File**: `lib/langgraph/nodes/retrieve-vectors.ts`

**Purpose**: Find relevant handbook chunks using semantic search (Pinecone) and fetch full content (MongoDB).

**Input State**:

```typescript
{
  analyzedQuery: {
    embedding: number[],
    implicitFilters: {
      section_type?: string,
      stakeholder_groups?: string[],
    },
  },
}
```

**What It Does**:

1. **Query Pinecone**:

   - Sends embedding vector
   - Applies metadata filters (section_type, stakeholder_groups) if determined
   - Retrieves top K chunks (default: 7)
   - Gets similarity scores (cosine similarity)
   - Filters by minimum similarity threshold (0.7)

2. **Fetch from MongoDB**:

   - Uses Pinecone IDs to get full chunk content
   - Chunks include: content, section_path, metadata

3. **Merge Results**:
   - Combines Pinecone scores with MongoDB content
   - Returns structured RetrievedChunk objects

**Output State**:

```typescript
{
  retrievedChunks: [
    {
      pinecone_id: string,
      content: string,              // Full chunk text
      section_path: string,         // e.g., "Academic > Grading"
      section_type: string,
      stakeholder_groups: string[],
      approval_authority: string,
      similarity_score: number,     // 0-1 from Pinecone
      doc_id: string,
    },
    // ... more chunks
  ],
}
```

**Configuration**:

- `topK`: 7 chunks
- `minSimilarity`: 0.7
- `namespace`: From environment variable
- Metadata filters: Auto-applied based on query analysis

**Example**:

```typescript
// Retrieves 5 chunks about grading policy
{
  retrievedChunks: [
    {
      pinecone_id: "abc123",
      content: "Grading Scale: A (90-100), B (80-89)...",
      section_path: "Academic > Grading Policies",
      section_type: "policies",
      stakeholder_groups: ["faculty", "students"],
      approval_authority: "dean",
      similarity_score: 0.94,
    },
    // ... 4 more chunks
  ],
}
```

---

### 5. Rerank Chunks Node

**File**: `lib/langgraph/nodes/rerank-chunks.ts`

**Purpose**: Use LLM to score and reorder chunks by relevance to the specific query.

**When Executed**: Only if more than 3 chunks were retrieved.

**Input State**:

```typescript
{
  retrievedChunks: RetrievedChunk[],  // 4+ chunks
  currentQuery: string,
  analyzedQuery: AnalyzedQuery,
}
```

**What It Does**:

1. Sends query + chunk previews (first 300 chars) to GPT-4
2. LLM scores each chunk 0-10 for relevance
3. Re-sorts chunks by relevance score
4. Keeps top K chunks (default: 5)

**Why Reranking?**

- Pinecone returns chunks by vector similarity
- Vector similarity ≠ always perfect semantic match
- LLM can understand nuanced relevance better
- Example: "late submission policy" vs "submission deadline"

**Output State**:

```typescript
{
  retrievedChunks: [
    {
      // ... same fields as before ...
      relevance_score: number,  // 0-10 from LLM
    },
    // ... sorted by relevance_score
  ],
}
```

**LLM Details**:

- Model: `gpt-4-turbo-preview`
- Temperature: `0.1` (very low for consistent scoring)
- Structured output with Zod validation

**Example**:

```typescript
// Before: 7 chunks sorted by similarity
// After: Top 5 chunks sorted by relevance
;[
  { content: '...', similarity_score: 0.92, relevance_score: 9.5 },
  { content: '...', similarity_score: 0.89, relevance_score: 8.7 },
  { content: '...', similarity_score: 0.94, relevance_score: 8.2 }, // Was #1 by similarity
  { content: '...', similarity_score: 0.87, relevance_score: 7.8 },
  { content: '...', similarity_score: 0.85, relevance_score: 7.3 },
]
```

**Error Handling**: If reranking fails, pipeline continues with original chunks (graceful degradation).

---

### 6. Synthesize Answer Node

**File**: `lib/langgraph/nodes/synthesize-answer.ts`

**Purpose**: Generate a natural language answer from retrieved chunks using GPT-4.

**Input State**:

```typescript
{
  retrievedChunks: RetrievedChunk[],
  currentQuery: string,
  analyzedQuery: AnalyzedQuery,
  messageHistory: Message[],
}
```

**What It Does**:

1. **Constructs Context**:

   - Formats chunks as "[1] Section: ... Content: ..."
   - Includes full chunk content

2. **Builds Conversation Context**:

   - Last 8 messages (4 exchanges) for continuity
   - Helps with follow-up questions

3. **Sends to GPT-4**:

   - System prompt emphasizes: cite sources, stay factual, admit limitations
   - Includes context + conversation history + current query
   - Streams response back in real-time (if using streaming version)

4. **Enforces Citation Format**:
   - Prompt requires inline citations [1], [2], etc.
   - Numbers correspond to chunk indices

**Output State**:

```typescript
{
  synthesizedAnswer: string,  // The generated answer with citations
}
```

**Two Versions**:

1. **`synthesizeAnswer`**: Returns complete answer (for non-streaming use)
2. **`synthesizeAnswerStreaming`**: Streams chunks via callback (used by API)

**LLM Details**:

- Model: `gpt-4-turbo-preview` or `gpt-4o`
- Temperature: `0.3` (balanced for accuracy with some natural variation)
- Max Tokens: `2000`
- Streaming: Enabled for better UX

**Example**:

```typescript
// Input: 5 chunks about grading policy
// Output:
{
  synthesizedAnswer: "According to the handbook [1], the grading scale at GCTS is as follows:\n\nA: 90-100% (Excellent)\nB: 80-89% (Good)\nC: 70-79% (Satisfactory)\n\nLate submission policies [2] state that assignments submitted after the deadline will receive a 10% deduction per day...",
}
```

**Prompt Structure**:

```
System: You are an expert assistant for the GCTS Faculty Handbook...

Context from handbook:
[1] Section: Academic > Grading
Content: [full chunk]

[2] Section: Academic > Policies
Content: [full chunk]

Conversation history:
User: [previous question]
Assistant: [previous answer]

User question: [current query]

Instructions:
- Answer based ONLY on provided context
- Include inline citations [1], [2]
- ...
```

---

### 7. Format Citations Node

**File**: `lib/langgraph/nodes/format-citations.ts`

**Purpose**: Structure citations for frontend display with metadata.

**Input State**:

```typescript
{
  retrievedChunks: RetrievedChunk[],
  synthesizedAnswer: string,
}
```

**What It Does**:

1. Converts each chunk into a Citation object
2. Numbers citations [1], [2], [3], etc.
3. Creates content previews (truncates to 150 chars)
4. Includes metadata based on config:
   - Section path (always)
   - Content preview (always)
   - Pinecone ID (always, for lookups)
   - Similarity score (always)
   - Optional: stakeholder_groups, approval_authority, section_type

**Output State**:

```typescript
{
  citations: [
    {
      number: 1,
      section_path: "Academic > Grading Policies",
      content_preview: "Grading Scale: A (90-100), B (80-89), C (70-79). All assignments must be submitted by the deadline to receive full credit...",
      pinecone_id: "abc123",
      similarity_score: 0.94,
      stakeholder_groups: ["faculty", "students"],
      approval_authority: "dean",
      section_type: "policies",
    },
    // ... more citations
  ],
}
```

**Configuration**:

- Preview length: 150 characters (configurable in `HANDBOOK_CONFIG`)
- Metadata inclusion: Toggle in config
- Citation numbers match inline references in answer

**Helper Functions**:

1. **`extractCitationNumbers(answer)`**: Finds [1], [2] in answer text
2. **`filterCitationsByAnswer(citations, answer)`**: Returns only referenced citations

---

## Orchestration Flow

The nodes are orchestrated in `lib/langgraph/graph-simple.ts` using a linear pipeline with conditional branching.

### Complete Flow Diagram

```
┌─────────────────────────┐
│   User Submits Query    │
│   + Conversation ID     │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│  1. Analyze Query       │
│  - Extract intent       │
│  - Detect ambiguity     │
│  - Infer filters        │
└───────────┬─────────────┘
            │
      ┌─────┴─────┐
      │ Ambiguous? │
      └─────┬─────┘
            │
     ┌──────┴──────┐
     │ Yes         │ No
     ↓             ↓
┌────────────┐  ┌────────────────────┐
│ Request    │  │ 2. Embed Query     │
│ Clarify    │  │ - Generate vector  │
│ → END      │  │ - 3072 dims        │
└────────────┘  └─────────┬──────────┘
                          │
                          ↓
                ┌─────────────────────┐
                │ 3. Retrieve Vectors │
                │ - Query Pinecone    │
                │ - Fetch from Mongo  │
                └─────────┬───────────┘
                          │
                    ┌─────┴─────┐
                    │ > 3 chunks?│
                    └─────┬─────┘
                          │
                   ┌──────┴──────┐
                   │ Yes         │ No
                   ↓             ↓
          ┌────────────────┐  (skip)
          │ 4. Rerank      │    │
          │ - LLM scoring  │    │
          │ - Keep top 5   │    │
          └────────┬───────┘    │
                   └──────┬──────┘
                          │
                          ↓
                ┌──────────────────────┐
                │ 5. Synthesize Answer │
                │ - Build context      │
                │ - GPT-4 generation   │
                │ - Stream response    │
                └──────────┬───────────┘
                           │
                           ↓
                ┌──────────────────────┐
                │ 6. Format Citations  │
                │ - Number citations   │
                │ - Create previews    │
                │ - Add metadata       │
                └──────────┬───────────┘
                           │
                           ↓
                ┌──────────────────────┐
                │  Save to MongoDB     │
                │  - User message      │
                │  - Assistant message │
                │  - Citations         │
                └──────────┬───────────┘
                           │
                           ↓
                ┌──────────────────────┐
                │  Stream to Client    │
                │  - Answer chunks     │
                │  - Citations         │
                │  - Done signal       │
                └──────────────────────┘
```

### State Transformations

Here's how the state evolves through the pipeline:

**Initial State** (from API):

```typescript
{
  conversationId: "uuid-123",
  currentQuery: "What is the grading policy?",
  messageHistory: [...previous messages...],
  analyzedQuery: null,
  retrievedChunks: [],
  synthesizedAnswer: null,
  citations: [],
  error: null,
  requiresClarification: false,
  clarificationRequest: null,
}
```

**After Analyze Query**:

```typescript
{
  ...initialState,
  analyzedQuery: {
    intent: "Find grading policy information",
    entities: ["grading", "policy"],
    implicitFilters: { section_type: "policies" },
    confidence: 0.95,
    requiresClarification: false,
  },
}
```

**After Embed Query**:

```typescript
{
  ...previousState,
  analyzedQuery: {
    ...previousAnalyzedQuery,
    embedding: [0.012, -0.034, ...], // 3072 numbers
  },
}
```

**After Retrieve Vectors**:

```typescript
{
  ...previousState,
  retrievedChunks: [
    { pinecone_id: "abc", content: "...", similarity_score: 0.94, ... },
    { pinecone_id: "def", content: "...", similarity_score: 0.89, ... },
    // ... 5 more chunks
  ],
}
```

**After Rerank** (if >3 chunks):

```typescript
{
  ...previousState,
  retrievedChunks: [
    { ...chunk1, relevance_score: 9.5 },
    { ...chunk2, relevance_score: 8.7 },
    // ... top 5 by relevance
  ],
}
```

**After Synthesize Answer**:

```typescript
{
  ...previousState,
  synthesizedAnswer: "According to the handbook [1], the grading scale...",
}
```

**Final State** (after Format Citations):

```typescript
{
  ...previousState,
  citations: [
    {
      number: 1,
      section_path: "Academic > Grading",
      content_preview: "Grading Scale: A (90-100)...",
      pinecone_id: "abc",
      similarity_score: 0.94,
      // ... metadata
    },
    // ... more citations
  ],
}
```

---

## Example Walkthrough

Let's trace a real example: **"Can I submit assignments late?"**

### Step 1: Analyze Query

**Input**:

- Query: "Can I submit assignments late?"
- Message history: Empty (first question)

**Processing**:

- GPT-4 analyzes the query
- Intent: "Inquire about late submission policy"
- Entities: ["submit", "assignments", "late"]
- Filters: `section_type: "policies"`, `stakeholder_groups: ["students"]`
- Confidence: 0.88 (clear enough)
- Ambiguous: No

**Output**:

```typescript
{
  analyzedQuery: {
    intent: "Inquire about late submission policy for assignments",
    entities: ["submit", "assignments", "late"],
    implicitFilters: {
      section_type: "policies",
      stakeholder_groups: ["students"],
    },
    confidence: 0.88,
    requiresClarification: false,
  },
  requiresClarification: false,
}
```

### Step 2: Embed Query

**Input**:

- Current query text
- No conversation context (first message)

**Processing**:

- Calls OpenAI embeddings API
- Model: `text-embedding-3-large`
- Input text: "Can I submit assignments late?"

**Output**:

```typescript
{
  analyzedQuery: {
    // ... previous fields ...
    embedding: [0.0234, -0.0145, 0.0289, ..., 0.0167], // 3072 numbers
  },
}
```

### Step 3: Retrieve Vectors

**Input**:

- Embedding vector
- Filters: `section_type: "policies"`, `stakeholder_groups: ["students"]`

**Processing**:

1. Query Pinecone with embedding + filters
2. Get 7 chunks with similarity > 0.7
3. Fetch full content from MongoDB using pinecone_ids
4. Merge results

**Output**:

```typescript
{
  retrievedChunks: [
    {
      pinecone_id: "chunk_789",
      content: "Late Submission Policy: Assignments submitted after the due date will incur a 10% deduction per day, up to a maximum of 3 days. After 3 days, the assignment will not be accepted...",
      section_path: "Academic > Policies > Late Submissions",
      section_type: "policies",
      stakeholder_groups: ["students"],
      approval_authority: "dean",
      similarity_score: 0.93,
    },
    {
      pinecone_id: "chunk_456",
      content: "Extension Requests: Students may request an extension by contacting the instructor at least 24 hours before the deadline. Extensions are granted at the instructor's discretion...",
      section_path: "Academic > Policies > Extensions",
      section_type: "policies",
      stakeholder_groups: ["students", "faculty"],
      approval_authority: "department",
      similarity_score: 0.89,
    },
    // ... 5 more chunks
  ],
}
```

### Step 4: Rerank Chunks

**Input**:

- 7 chunks
- Original query

**Processing**:

- GPT-4 scores each chunk for relevance
- Chunk 1 (Late Submission Policy): 9.5/10
- Chunk 2 (Extension Requests): 8.7/10
- Chunk 3 (Grading Scale): 4.2/10 (less relevant)
- ...
- Keeps top 5

**Output**:

```typescript
{
  retrievedChunks: [
    { ..., relevance_score: 9.5 },  // Late Submission Policy
    { ..., relevance_score: 8.7 },  // Extension Requests
    { ..., relevance_score: 7.8 },  // Academic Integrity
    { ..., relevance_score: 7.3 },  // Assignment Guidelines
    { ..., relevance_score: 6.9 },  // Grade Appeal Process
  ],
}
```

### Step 5: Synthesize Answer

**Input**:

- 5 ranked chunks
- Original query
- No conversation history

**Processing**:

- Builds context string with all chunks
- Sends to GPT-4 with synthesis prompt
- GPT-4 generates answer with citations
- Streams response back

**Output**:

```typescript
{
  synthesizedAnswer: "Yes, you can submit assignments late, but there are penalties [1]. According to the handbook:\n\n**Late Submission Policy:**\n- Assignments submitted after the due date will incur a 10% deduction per day\n- Maximum late period: 3 days\n- After 3 days, assignments will not be accepted [1]\n\n**Extension Requests:**\nIf you need more time, you can request an extension by contacting your instructor at least 24 hours before the deadline. Extensions are granted at the instructor's discretion [2].\n\nIt's recommended to submit on time whenever possible to avoid penalties.",
}
```

### Step 6: Format Citations

**Input**:

- 5 chunks
- Synthesized answer with [1], [2] references

**Processing**:

- Creates Citation objects
- Numbers them [1], [2], [3], [4], [5]
- Truncates previews to 150 chars
- Includes metadata

**Output**:

```typescript
{
  citations: [
    {
      number: 1,
      section_path: "Academic > Policies > Late Submissions",
      content_preview: "Late Submission Policy: Assignments submitted after the due date will incur a 10% deduction per day, up to a maximum of 3 days...",
      pinecone_id: "chunk_789",
      similarity_score: 0.93,
      stakeholder_groups: ["students"],
      approval_authority: "dean",
      section_type: "policies",
    },
    {
      number: 2,
      section_path: "Academic > Policies > Extensions",
      content_preview: "Extension Requests: Students may request an extension by contacting the instructor at least 24 hours before the deadline...",
      pinecone_id: "chunk_456",
      similarity_score: 0.89,
      stakeholder_groups: ["students", "faculty"],
      approval_authority: "department",
      section_type: "policies",
    },
    // ... 3 more citations
  ],
}
```

### Final Result Sent to User

**Answer** (streamed in real-time):

```
Yes, you can submit assignments late, but there are penalties [1].
According to the handbook:

**Late Submission Policy:**
- Assignments submitted after the due date will incur a 10% deduction per day
- Maximum late period: 3 days
- After 3 days, assignments will not be accepted [1]

**Extension Requests:**
If you need more time, you can request an extension by contacting your
instructor at least 24 hours before the deadline. Extensions are granted
at the instructor's discretion [2].

It's recommended to submit on time whenever possible to avoid penalties.
```

**Citations** (displayed after answer):

```
[1] Academic > Policies > Late Submissions
    "Late Submission Policy: Assignments submitted after the due date
    will incur a 10% deduction per day, up to a maximum of 3 days..."
    (Similarity: 0.93)

[2] Academic > Policies > Extensions
    "Extension Requests: Students may request an extension by contacting
    the instructor at least 24 hours before the deadline..."
    (Similarity: 0.89)

[3] ... more citations
```

---

## Error Handling

Each node can return an error in the state:

```typescript
{
  error: "Failed to retrieve vectors: Network timeout",
}
```

When an error occurs:

1. The pipeline stops immediately
2. Error is returned to the client
3. No further nodes are executed
4. Error is saved to conversation history

**Example Error Handling**:

```typescript
// In any node:
try {
  // ... processing ...
} catch (error) {
  console.error('[nodeName] Error:', error)
  return {
    error: `Failed to ${action}: ${error.message}`,
  }
}
```

---

## Performance Metrics

Typical execution times for each node:

- **Analyze Query**: 1-2 seconds
- **Embed Query**: 0.5-1 second
- **Retrieve Vectors**: 0.5-1 second (Pinecone + MongoDB)
- **Rerank Chunks**: 2-3 seconds (if needed)
- **Synthesize Answer**: 5-10 seconds (streaming)
- **Format Citations**: < 0.1 seconds

**Total**: 10-15 seconds for complete pipeline

---

## Configuration

All node behavior can be adjusted in `lib/langgraph/config.ts`:

```typescript
export const HANDBOOK_CONFIG = {
  retrieval: {
    topK: 7, // Chunks to retrieve
    rerankTopK: 5, // Chunks after reranking
    minSimilarity: 0.7, // Minimum similarity threshold
  },
  citations: {
    previewLength: 150,
    includeMetadata: {
      stakeholder_groups: true,
      approval_authority: true,
      section_type: true,
    },
  },
  ambiguity: {
    confidenceThreshold: 0.7, // Below this = request clarification
  },
  models: {
    embedding: 'text-embedding-3-large',
    chat: 'gpt-4-turbo-preview',
    temperature: 0.3,
  },
}
```

---

## Summary

The LangGraph RAG system provides a sophisticated, multi-stage approach to answering handbook questions:

1. **Intelligent Analysis**: Understands intent and detects ambiguity
2. **Semantic Search**: Finds relevant content using vector embeddings
3. **Smart Reranking**: LLM improves relevance ordering
4. **Contextual Synthesis**: Generates natural answers with conversation memory
5. **Transparent Citations**: Always shows sources with metadata

Each node is:

- ✅ **Modular**: Can be updated independently
- ✅ **Testable**: Pure functions with clear inputs/outputs
- ✅ **Observable**: Logs progress at each step
- ✅ **Resilient**: Graceful error handling and fallbacks
- ✅ **Configurable**: Behavior adjustable via config file

This architecture ensures accurate, cited, and conversational responses to handbook queries.
