# Feature TODOs

This document tracks features and improvements to be implemented in the GCTS Handbook Frontend application.

## High Priority

### 1. Context Selection for Action Proposals
**Status**: Not Started  
**Priority**: High

Currently, when a user clicks the "Propose Action" button, the entire conversation history is used as context. This can be problematic when a conversation covers multiple unrelated topics.

**Requirements**:
- After clicking the Sparkles button, allow users to select which messages/questions should be included in the action proposal context
- Options to consider:
  - Multi-select interface to choose specific messages
  - Select a single question-answer pair
  - Select a range of messages
- Only use selected context when calling the propose-action API route/node
- Update the propose-action node to accept optional message filtering

**Implementation Notes**:
- UI: Modal or dropdown that appears when Sparkles button is clicked
- Backend: Modify propose-action endpoint to accept `messageIds` or `messageRange` parameter
- Node: Filter messageHistory based on user selection before processing

---

### 2. Response Length Constraints
**Status**: Not Started  
**Priority**: High

Add constraints to prevent excessively verbose answers from the LLM.

**Requirements**:
- Set maximum token/character limits for synthesized answers
- Add configuration option for max response length
- Truncate or summarize responses that exceed limits
- Provide user feedback when response is truncated

**Implementation Notes**:
- Update `HANDBOOK_CONFIG.models.maxTokens` or add new `maxResponseLength` config
- Modify `synthesizeAnswer` node to enforce limits
- Consider adding a "Continue reading" option for long responses

---

### 3. Mobile Responsive Design
**Status**: Not Started  
**Priority**: High

Design and implement fully responsive layout for mobile devices.

**Requirements**:
- Optimize chat interface for mobile screens
- Make citations panel collapsible/hideable on mobile
- Ensure touch-friendly button sizes and interactions
- Test on various mobile screen sizes
- Consider mobile-first approach for new components

**Implementation Notes**:
- Review all components in `components/` directory
- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:` breakpoints)
- Test citations panel behavior on mobile (maybe bottom sheet or modal?)
- Ensure chat input is accessible on mobile keyboards

---

## Medium Priority

### 4. Bookmark and Save Actions
**Status**: Not Started  
**Priority**: Medium

Implement real functionality for the bookmark and flame icon buttons in message actions.

**Requirements**:
- **Bookmark**: Save/bookmark specific messages or citations for later reference
- **Save as Answer**: Save a message as a reusable answer template
- Create database schema/storage for bookmarks and saved answers
- Add UI to view/manage bookmarks and saved answers
- Persist bookmarks across sessions

**Implementation Notes**:
- Create MongoDB collections: `bookmarks` and `saved_answers`
- Add API routes: `/api/bookmarks` and `/api/saved-answers`
- Update `components/chat/message-actions.tsx` with real handlers
- Consider adding a "Bookmarks" view/page

---

### 5. Conversation History Management
**Status**: Not Started  
**Priority**: Medium

Add ability to view, manage, and save conversations.

**Requirements**:
- Create view/page to list all past conversations
- Allow users to:
  - View conversation history
  - Resume old conversations
  - Delete conversations
  - Save/bookmark conversations
  - Search conversations by title/content
- Set up proper storage/database for conversations (already exists in MongoDB, need UI)
- Add navigation to access conversation history

**Implementation Notes**:
- Create `/conversations` page/route
- Use existing MongoDB `conversations` collection
- Add API routes for conversation management (list, get, delete, update)
- Add navigation component/button to access conversations
- Consider adding conversation tags/categories

---

## Low Priority / Future Enhancements

### 6. Preserve Sources Across Messages
**Status**: Not Started  
**Priority**: Low

Within a single chat session, preserve citations from previous answers when new questions are asked.

**Requirements**:
- Keep citations from previous answers visible/accessible
- Consider condensing older citations into an accordion or collapsible section
- Allow users to scroll back and view older answers with their sources
- Maintain citation numbering consistency across messages

**Implementation Notes**:
- Update `citations-panel.tsx` to show citations from multiple messages
- Group citations by message/answer
- Add accordion UI component for older citations
- Consider adding "Show all citations" toggle
- May need to update citation numbering logic

---

## Notes

- Items will be added to this list as new features are identified
- Priority levels may change based on user feedback and requirements
- Implementation order should consider dependencies between features

