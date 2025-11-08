import { Collection, Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import {
  ConversationDocument,
  ConversationMessage,
  ConversationDocumentSchema,
} from '@/types/langgraph';
import { HANDBOOK_CONFIG } from '@/lib/langgraph/config';

/**
 * Get the conversations collection from MongoDB
 */
export async function getConversationsCollection(): Promise<Collection<ConversationDocument>> {
  const db: Db = await getDatabase();
  return db.collection<ConversationDocument>(HANDBOOK_CONFIG.collections.conversations);
}

/**
 * Create indexes for the conversations collection
 * Should be called on app initialization
 */
export async function createConversationIndexes(): Promise<void> {
  const collection = await getConversationsCollection();
  
  await collection.createIndexes([
    { key: { conversationId: 1 }, unique: true },
    { key: { userId: 1 } },
    { key: { lastAccessedAt: -1 } }, // For sorting by recent activity
    { key: { createdAt: -1 } }, // For sorting by creation date
  ]);
}

/**
 * Create a new conversation
 */
export async function createConversation(params: {
  conversationId: string;
  userId?: string;
  title: string;
  initialMessage?: ConversationMessage;
}): Promise<ConversationDocument> {
  const collection = await getConversationsCollection();
  
  const now = new Date();
  const conversation: ConversationDocument = {
    conversationId: params.conversationId,
    userId: params.userId || 'anonymous',
    title: params.title,
    messages: params.initialMessage ? [params.initialMessage] : [],
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
  };

  // Validate with Zod schema
  const validated = ConversationDocumentSchema.parse(conversation);

  await collection.insertOne(validated as any);
  
  return validated;
}

/**
 * Get a conversation by ID
 */
export async function getConversation(conversationId: string): Promise<ConversationDocument | null> {
  const collection = await getConversationsCollection();
  
  const conversation = await collection.findOne({ conversationId });
  
  if (conversation) {
    // Update last accessed time
    await collection.updateOne(
      { conversationId },
      { $set: { lastAccessedAt: new Date() } }
    );
  }
  
  return conversation;
}

/**
 * List conversations for a user
 */
export async function listConversations(params: {
  userId?: string;
  limit?: number;
  skip?: number;
}): Promise<ConversationDocument[]> {
  const collection = await getConversationsCollection();
  
  const query = params.userId ? { userId: params.userId } : {};
  
  const conversations = await collection
    .find(query)
    .sort({ lastAccessedAt: -1 })
    .limit(params.limit || 50)
    .skip(params.skip || 0)
    .toArray();
  
  return conversations;
}

/**
 * Add a message to a conversation
 */
export async function addMessageToConversation(
  conversationId: string,
  message: ConversationMessage
): Promise<void> {
  const collection = await getConversationsCollection();
  
  const now = new Date();
  
  await collection.updateOne(
    { conversationId },
    {
      $push: { messages: message },
      $set: {
        updatedAt: now,
        lastAccessedAt: now,
      },
    }
  );
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const collection = await getConversationsCollection();
  
  await collection.updateOne(
    { conversationId },
    {
      $set: {
        title,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const collection = await getConversationsCollection();
  
  const result = await collection.deleteOne({ conversationId });
  
  return result.deletedCount > 0;
}

/**
 * Get conversation count for a user
 */
export async function getConversationCount(userId?: string): Promise<number> {
  const collection = await getConversationsCollection();
  
  const query = userId ? { userId } : {};
  
  return collection.countDocuments(query);
}

/**
 * Delete old conversations (cleanup utility)
 */
export async function deleteOldConversations(daysOld: number): Promise<number> {
  const collection = await getConversationsCollection();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await collection.deleteMany({
    lastAccessedAt: { $lt: cutoffDate },
  });
  
  return result.deletedCount;
}

/**
 * Get the chunks collection for handbook content
 */
export async function getHandbookChunksCollection(): Promise<Collection> {
  const db: Db = await getDatabase();
  return db.collection(HANDBOOK_CONFIG.collections.handbookChunks);
}

/**
 * Get chunk content by Pinecone IDs
 */
export async function getChunksByPineconeIds(pineconeIds: string[]): Promise<any[]> {
  const collection = await getHandbookChunksCollection();
  
  const chunks = await collection
    .find({
      pinecone_id: { $in: pineconeIds },
    })
    .toArray();
  
  return chunks;
}

