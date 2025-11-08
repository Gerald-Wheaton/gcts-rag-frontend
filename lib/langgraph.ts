import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';

// Initialize the chat model (will throw error at runtime if API key is missing)
export const chatModel = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Example graph state annotation
export const GraphStateAnnotation = Annotation.Root({
  messages: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

export type GraphState = typeof GraphStateAnnotation.State;

// Helper function to create a basic graph
export function createBasicGraph() {
  const workflow = new StateGraph(GraphStateAnnotation);

  // Add nodes and edges to the workflow
  // Example: workflow.addNode('node_name', async (state) => { ... });
  // Example: workflow.addEdge('node_name', END);

  return workflow;
}

export { StateGraph, END, START, Annotation };
