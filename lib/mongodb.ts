import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || ''

// MongoDB connection options
// For development with SSL issues, you may need to set tlsAllowInvalidCertificates: true
const options = {
  retryWrites: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  // Uncomment the lines below if you're having SSL/TLS issues in development
  // tls: true,
  // tlsAllowInvalidCertificates: true,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the connection
  // across hot reloads in Next.js
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, create a new client
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDatabase(dbName?: string): Promise<Db> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MongoDB URI to .env.local')
  }
  
  try {
    const client = await clientPromise
    
    // Extract database name from URI if not provided
    let databaseName = dbName
    if (!databaseName) {
      // Parse database name from connection string
      // Format: mongodb+srv://...host.net/databaseName?params
      const uriWithoutParams = process.env.MONGODB_URI.split('?')[0]
      const uriParts = uriWithoutParams.split('/')
      
      // Database name is the last part after the last '/'
      // If URI ends with '/', there's no database name
      if (uriParts.length > 0 && uriParts[uriParts.length - 1] && uriParts[uriParts.length - 1].length > 0) {
        databaseName = uriParts[uriParts.length - 1]
        // Validate database name (MongoDB doesn't allow '.' in database names)
        if (databaseName.includes('.')) {
          databaseName = 'handbook' // Default if invalid
        }
      } else {
        // Default to 'handbook' if not in URI
        databaseName = 'handbook'
      }
    }
    
    const db = client.db(databaseName)
    console.log('[MongoDB] Using database:', databaseName)
    return db
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error)
    console.error('[MongoDB] URI format:', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'))
    throw error
  }
}
