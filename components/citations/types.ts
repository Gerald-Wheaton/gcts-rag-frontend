import type { Citation } from '@/types/langgraph'

export interface CitationsPanelProps {
  citations: Citation[]
  focusedCitation: string | null
  onCitationClick: (citationId: string) => void
}

export interface CitationDetail {
  number: number
  section_path: string
  precise_section: string
  content_preview: string
}
