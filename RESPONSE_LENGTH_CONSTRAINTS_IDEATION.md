# Response Length Constraints - Ideation Document

## Overview

This document outlines approaches for implementing response length constraints for the chatbot, with different limits for regular Q&A answers versus action proposals.

## Current State

- **Regular Q&A**: Uses `maxTokens: 2000` in `synthesizeAnswer` and `synthesizeAnswerStreaming`
- **Action Proposals**: Uses `maxTokens: 2000` in `proposeAction` (should be longer)
- **Streaming**: Answers are streamed character-by-character via SSE
- **Display**: Answers shown in `ChatMessage` component with citations

## Design Goals

1. **Different Limits**: Action proposals should allow longer responses than Q&A
2. **Multi-layered Enforcement**: Token limits (LLM) + character limits (post-processing)
3. **Streaming Support**: Gracefully handle truncation during streaming
4. **User Feedback**: Clear indication when content is truncated
5. **Smart Truncation**: Preserve citations and structure when truncating

---

## Approach 1: Configuration-Based with Post-Processing (Recommended)

### Configuration Structure

Add to `lib/langgraph/config.ts`:

```typescript
models: {
  // ... existing config
  responseLimits: {
    // Regular Q&A answers (with citations)
    qa: {
      maxTokens: 1500,        // LLM token limit (stricter)
      maxCharacters: 2000,    // Post-processing character limit
      truncationStrategy: 'smart', // 'smart' | 'hard' | 'sentence'
    },
    // Action proposals (can be longer)
    actionProposal: {
      maxTokens: 3000,        // Higher token limit
      maxCharacters: 4000,    // Higher character limit
      truncationStrategy: 'smart',
    },
  },
}
```

### Implementation Strategy

#### 1. **LLM-Level Limits** (Prevention)

- Set `maxTokens` in LLM initialization based on answer type
- Prevents excessive generation at the source
- Different limits for `synthesizeAnswer` vs `proposeAction`

#### 2. **Post-Processing Limits** (Enforcement)

- After answer generation, check character count
- Apply smart truncation if exceeded
- Preserve citations and structure

#### 3. **Streaming Limits** (Real-time)

- Track character count as chunks arrive
- Stop streaming when limit reached
- Send truncation indicator to client

### Smart Truncation Logic

```typescript
function truncateAnswer(
  answer: string,
  maxChars: number,
  strategy: 'smart' | 'hard' | 'sentence'
): { truncated: string; wasTruncated: boolean } {
  if (answer.length <= maxChars) {
    return { truncated: answer, wasTruncated: false }
  }

  switch (strategy) {
    case 'smart':
      // Find last complete sentence before limit
      // Preserve citations [1], [2], etc.
      // Ensure we don't cut off mid-citation
      return smartTruncate(answer, maxChars)

    case 'sentence':
      // Truncate at last complete sentence
      return sentenceTruncate(answer, maxChars)

    case 'hard':
      // Hard cut at character limit
      return { truncated: answer.substring(0, maxChars), wasTruncated: true }
  }
}
```

### State Updates

Add to `lib/langgraph/state.ts`:

```typescript
synthesizedAnswer: string | null;
answerTruncated?: boolean;  // Flag indicating truncation
answerLength?: number;      // Actual length for logging
```

### User Feedback

Add truncation indicator to answer:

```typescript
const truncationMessage =
  '\n\n*[Response truncated for length. Full answer may be available upon request.]*'
```

Or in UI component:

```tsx
{
  message.answerTruncated && (
    <div className="mt-2 text-xs text-muted-foreground italic">
      Response truncated. Click to view full answer.
    </div>
  )
}
```

---

## Approach 2: Prompt-Based Constraints

### Strategy

Add explicit length instructions to system prompts:

```typescript
answerSynthesis: (context, history) => `...
- Keep your response concise and focused
- Aim for 1500-2000 characters maximum
- Prioritize clarity over completeness
...`
```

### Pros

- Simple to implement
- No code changes needed
- LLM naturally limits itself

### Cons

- Not guaranteed to work
- May still exceed limits
- Less precise control

---

## Approach 3: Token Counting with Tiktoken

### Strategy

Use `tiktoken` library to count tokens accurately:

```typescript
import { encoding_for_model } from 'tiktoken'

const encoding = encoding_for_model('gpt-4')
const tokens = encoding.encode(answer)
const tokenCount = tokens.length
```

### Pros

- Most accurate measurement
- Matches LLM's actual token usage
- Can enforce limits precisely

### Cons

- Additional dependency
- More complex implementation
- Character limits may be more intuitive for users

---

## Recommended Implementation Plan

### Phase 1: Configuration & Basic Limits

1. ✅ Add `responseLimits` config to `HANDBOOK_CONFIG`
2. ✅ Update `synthesizeAnswer` to use Q&A limits
3. ✅ Update `proposeAction` to use action proposal limits
4. ✅ Add character counting and basic truncation

### Phase 2: Smart Truncation

1. ✅ Implement smart truncation logic
2. ✅ Preserve citations when truncating
3. ✅ Handle sentence boundaries
4. ✅ Add truncation flags to state

### Phase 3: Streaming Support

1. ✅ Track character count during streaming
2. ✅ Stop streaming gracefully when limit reached
3. ✅ Send truncation indicator via SSE
4. ✅ Update UI to show truncation status

### Phase 4: User Experience

1. ✅ Add truncation indicator in UI
2. ✅ Consider "Show full answer" button
3. ✅ Log truncation events for monitoring
4. ✅ Add configurable limits (future)

---

## Implementation Details

### 1. Configuration Updates

**File**: `lib/langgraph/config.ts`

```typescript
models: {
  // ... existing
  responseLimits: {
    qa: {
      maxTokens: 1500,
      maxCharacters: 2000,
      truncationStrategy: 'smart' as const,
    },
    actionProposal: {
      maxTokens: 3000,
      maxCharacters: 4000,
      truncationStrategy: 'smart' as const,
    },
  },
}
```

### 2. Truncation Utility

**File**: `lib/langgraph/utils/truncate-answer.ts` (new)

```typescript
export interface TruncationResult {
  truncated: string
  wasTruncated: boolean
  originalLength: number
}

export function truncateAnswer(
  answer: string,
  maxChars: number,
  strategy: 'smart' | 'hard' | 'sentence' = 'smart'
): TruncationResult {
  // Implementation
}
```

### 3. Node Updates

**File**: `lib/langgraph/nodes/synthesize-answer.ts`

- Use `responseLimits.qa` for maxTokens
- Apply truncation after generation
- Set `answerTruncated` flag in state

**File**: `lib/langgraph/nodes/propose-action.ts`

- Use `responseLimits.actionProposal` for maxTokens
- Apply truncation to formatted answer
- Set `answerTruncated` flag

### 4. Streaming Updates

**File**: `lib/langgraph/nodes/synthesize-answer.ts` (streaming function)

- Track `fullAnswer.length` during streaming
- Stop streaming when `maxCharacters` reached
- Send final chunk with truncation indicator

### 5. State Type Updates

**File**: `lib/langgraph/state.ts`

```typescript
synthesizedAnswer: string | null;
answerTruncated?: boolean;
answerLength?: number;
```

### 6. UI Updates

**File**: `components/chat/chat-message.tsx`

- Display truncation indicator if `message.answerTruncated`
- Optional: "Show full answer" button

---

## Edge Cases & Considerations

### 1. **Citation Preservation**

- Never truncate mid-citation `[1]`
- Ensure all citations referenced in text are preserved
- May need to truncate earlier to preserve citations

### 2. **Markdown Formatting**

- Preserve markdown structure (headers, lists, etc.)
- Don't truncate mid-list item
- Maintain formatting integrity

### 3. **Streaming Interruption**

- Handle graceful stop during streaming
- Ensure final chunk is sent
- Client should handle incomplete streams

### 4. **Action Proposal Formatting**

- Preserve action structure (title, description, steps)
- Don't truncate mid-action
- May need to truncate at action boundary

### 5. **Performance**

- Truncation should be fast
- Avoid regex-heavy operations
- Cache truncation results if needed

---

## Metrics & Monitoring

Track:

- Frequency of truncation events
- Average answer lengths
- Truncation rate by answer type
- User feedback on truncation

---

## Future Enhancements

1. **"Continue Reading" Feature**

   - Store full answer server-side
   - Allow users to expand truncated answers
   - May require additional API endpoint

2. **User-Configurable Limits**

   - Settings page to adjust limits
   - Per-user preferences
   - Admin override capabilities

3. **Adaptive Limits**

   - Adjust limits based on query complexity
   - Longer limits for complex multi-part questions
   - Shorter limits for simple factual queries

4. **Summarization Instead of Truncation**
   - Use LLM to summarize long answers
   - Preserve key information
   - More intelligent than hard truncation

---

## Questions to Consider

1. **Character vs Token Limits**: Should we use characters (simpler) or tokens (more accurate)?

   - **Recommendation**: Start with characters, add token counting later if needed

2. **Truncation Strategy**: Smart (preserve structure) vs Hard (simple cut)?

   - **Recommendation**: Smart truncation for better UX

3. **User Feedback**: Inline message vs separate indicator?

   - **Recommendation**: Subtle inline indicator with option to expand

4. **Action Proposal Limits**: How much longer should they be?

   - **Recommendation**: 2x regular Q&A (3000 tokens, 4000 chars)

5. **Streaming Behavior**: Stop immediately or allow buffer?
   - **Recommendation**: Stop immediately to respect limits strictly

---

## Recommended Next Steps

1. **Review & Approve**: Review this ideation document
2. **Choose Approach**: Confirm Approach 1 (Configuration + Post-Processing)
3. **Set Limits**: Decide on specific character/token limits
4. **Implement Phase 1**: Basic configuration and truncation
5. **Test**: Verify truncation works correctly
6. **Iterate**: Add smart truncation and streaming support
