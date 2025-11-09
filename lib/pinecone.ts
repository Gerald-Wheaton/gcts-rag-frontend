import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

export default pinecone;

export async function getPineconeIndex(indexName?: string, namespace?: string) {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('Please add your Pinecone API key to .env.local');
  }

  const name = indexName || process.env.PINECONE_INDEX_NAME;

  if (!name) {
    throw new Error('Please add your Pinecone index name to .env.local');
  }

  // Get the base index
  let index;
  if (process.env.PINECONE_HOST) {
    index = pinecone.index(name, process.env.PINECONE_HOST);
  } else {
    index = pinecone.index(name);
  }

  // If namespace is provided, return the namespaced index
  if (namespace) {
    return index.namespace(namespace);
  }

  return index;
}
