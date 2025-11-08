# GCTS Handbook Frontend

A Next.js application built with TypeScript, featuring AI-powered capabilities using OpenAI and LangGraph, vector storage with Pinecone, and MongoDB for data persistence.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) with App Router and TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4
- **UI Components**: [shadcn/ui](https://ui.shadcn.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Validation**: [Zod](https://zod.dev)
- **AI/LLM**:
  - [OpenAI](https://openai.com) API
  - [LangChain](https://js.langchain.com) & [LangGraph](https://langchain-ai.github.io/langgraphjs/)
- **Database**: [MongoDB](https://www.mongodb.com)
- **Vector Store**: [Pinecone](https://www.pinecone.io)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- MongoDB instance (local or Atlas)
- Pinecone account and index
- OpenAI API key

### Installation

1. Clone the repository and install dependencies:

```bash
bun install
```

2. Copy the environment variables file and fill in your credentials:

```bash
cp .env.example .env.local
```

3. Update `.env.local` with your actual API keys and connection strings:

```env
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=your_mongodb_connection_string
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_HOST=your_pinecone_host_url
PINECONE_INDEX_NAME=your_pinecone_index_name
```

### Running the Development Server

```bash
bun run dev
# or simply
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── chat/         # Chat endpoint example
│   │   └── health/       # Health check endpoint
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility libraries
│   ├── mongodb.ts        # MongoDB connection
│   ├── openai.ts         # OpenAI client setup
│   ├── pinecone.ts       # Pinecone client setup
│   ├── langgraph.ts      # LangGraph utilities
│   └── utils.ts          # Helper functions
├── types/                # TypeScript type definitions
│   └── index.ts          # Common types and schemas
├── public/               # Static assets
└── .env.example          # Environment variables template
```

## API Routes

### Health Check
```
GET /api/health
```
Returns the API health status.

### Chat
```
POST /api/chat
Body: { message: string, conversationId?: string }
```
Sends a message to the AI assistant and returns a response.

## Available Scripts

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun start` - Start production server
- `bun run lint` - Run ESLint

## Adding shadcn/ui Components

To add new UI components from shadcn/ui:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
# etc.
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [LangChain Documentation](https://js.langchain.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Pinecone Documentation](https://docs.pinecone.io)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
