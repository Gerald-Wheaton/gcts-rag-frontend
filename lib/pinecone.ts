import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

export default pinecone;

export async function getPineconeIndex(indexName?: string) {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('Please add your Pinecone API key to .env.local');
  }

  const name = indexName || process.env.PINECONE_INDEX_NAME;

  if (!name) {
    throw new Error('Please add your Pinecone index name to .env.local');
  }

  // If PINECONE_HOST is provided, use it (useful for custom endpoints)
  if (process.env.PINECONE_HOST) {
    return pinecone.index(name, process.env.PINECONE_HOST);
  }

  return pinecone.index(name);
}
