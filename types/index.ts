import { z } from 'zod';

// Common types and schemas for the application

// Example User schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Example Document schema for vector storage
export const DocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Chat and citation types
export interface Citation {
  id: string;
  title: string;
  source: string;
  content: string;
  sectionPath?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  isStreaming?: boolean;
}

// LangGraph related types
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Pinecone vector types
export interface VectorMetadata {
  text: string;
  source?: string;
  category?: string;
  [key: string]: unknown;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: VectorMetadata;
}
