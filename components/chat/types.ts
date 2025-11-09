import type { Citation } from '@/types/langgraph'

export interface Message {
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
}

export interface ChatWindowProps {
  onCitationsUpdate: (citations: Citation[]) => void
  onCitationClick: (citation: string) => void
  focusedCitation: string | null
}
