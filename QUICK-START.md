# Quick Start Guide

## What Changed

Your UI has been completely replaced with the v0-designed components and integrated with your real backend API.

## Running the Application

```bash
# Install dependencies (if needed)
bun install

# Start development server
bun dev

# Build for production
bun run build
```

## Using the Application

### Chat Interface

1. Type your question in the input box at the bottom
2. Press `Enter` to send (or click the arrow button)
3. Watch the response stream in real-time
4. Citations appear in the right sidebar as they're received

### Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `Cmd/Ctrl + Shift + P` - Propose action (only available after first message)

### Propose Action Feature

After you've had a conversation, click the sparkle button (or use the keyboard shortcut) to ask the AI to propose a concrete action plan based on your conversation.

## Component Structure

```
app/
├── page.tsx                    # Main page
├── actions.ts                  # Server actions (now just types)
└── api/
    └── handbook/
        └── query/
            └── route.ts        # API endpoint (unchanged)

components/
├── chat-window.tsx            # Main chat interface
├── citations-panel.tsx        # Citations sidebar
├── chat/                      # Chat subcomponents
│   ├── chat-input.tsx
│   ├── chat-message.tsx
│   ├── empty-state.tsx
│   ├── loading-indicator.tsx
│   └── types.ts
├── citations/                 # Citation subcomponents
│   ├── citation-card.tsx
│   ├── empty-state.tsx
│   └── types.ts
└── ui/                        # shadcn UI components
    └── [various primitives]
```

## API Integration

The chat window now directly calls `/api/handbook/query` which:

- Uses your existing LangGraph RAG pipeline
- Streams responses using Server-Sent Events (SSE)
- Manages conversation history in MongoDB
- Returns citations from Pinecone

## Troubleshooting

### Environment Variables

Make sure these are set in `.env.local`:

```
OPENAI_API_KEY=your_key
PINECONE_API_KEY=your_key
PINECONE_INDEX=your_index
MONGODB_URI=your_uri
```

### Common Issues

**Citations not showing:**

- Check that Pinecone is returning metadata
- Verify `section_path` field exists in vector metadata

**Streaming not working:**

- Ensure `/api/handbook/query` endpoint is accessible
- Check browser console for fetch errors

**Styling issues:**

- Run `bun install` to ensure all dependencies are installed
- Clear Next.js cache: `rm -rf .next`

## Next Steps

1. **Test the application** - Try various queries to ensure everything works
2. **Review citations** - Verify citation data displays correctly
3. **Customize styling** - Adjust Tailwind classes in components as needed
4. **Add features** - See UI-MIGRATION-SUMMARY.md for enhancement ideas

## Documentation

- `UI-MIGRATION-SUMMARY.md` - Detailed changes made
- `README.md` - Full project documentation
- `IMPLEMENTATION-GUIDE.md` - Implementation details
- `NODE-FLOW-GUIDE.md` - LangGraph node flow

## Need Help?

Check the following files for context:

- API route: `app/api/handbook/query/route.ts`
- Chat logic: `components/chat-window.tsx`
- LangGraph setup: `lib/langgraph/`
