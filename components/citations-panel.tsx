'use client'

import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { BookOpen } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'
import type { CitationsPanelProps, CitationDetail } from './citations/types'
import { CitationCard } from './citations/citation-card'
import { EmptyState } from './citations/empty-state'
import { CitationDialog } from './citations/citation-dialog'

export function CitationsPanel({
  citations,
  focusedCitation,
  onCitationClick,
}: CitationsPanelProps) {
  const citationRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null)
  const [selectedDetails, setSelectedDetails] = useState<
    CitationDetail | undefined
  >()

  useEffect(() => {
    if (focusedCitation && citationRefs.current[focusedCitation]) {
      citationRefs.current[focusedCitation]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [focusedCitation])

  const handleCitationClick = (citationId: string) => {
    const citation = citations.find((c) => c.pinecone_id === citationId)
    if (citation) {
      setSelectedDetails({
        number: citation.number,
        section_path: citation.section_path,
        precise_section: citation.precise_section,
        content_preview: citation.content_preview,
        content: citation.content, // Include full content for dialog display
      })
      setSelectedCitation(`${citation.precise_section}`)
    }
    onCitationClick(citationId)
  }

  if (!citations || citations.length === 0) {
    return (
      <Card className="h-full border-border/40 p-6">
        <EmptyState />
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full border-border/40 flex flex-col">
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Sources</h3>
            {citations.some((citation) => citation.precise_section) && (
              <span className="ml-auto text-xs text-muted-foreground">
                {citations.length}{' '}
                {citations.length === 1 ? 'citation' : 'citations'}
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {citations.some((citation) => citation.precise_section) &&
              citations.map((citation, idx) => {
                const isFocused = focusedCitation === citation.pinecone_id
                const citationDetail = {
                  number: citation.number,
                  section_path: citation.section_path,
                  precise_section: citation.precise_section,
                  content_preview: citation.content_preview,
                  content: citation.content, // Include full content
                }
                return (
                  <div key={citation.pinecone_id} className="space-y-2">
                    <CitationCard
                      citation={citationDetail}
                      isFocused={isFocused}
                      onClick={() => handleCitationClick(citation.pinecone_id)}
                      cardRef={(el) =>
                        (citationRefs.current[citation.pinecone_id] = el)
                      }
                    />
                    {idx < citations.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                )
              })}
          </div>
        </ScrollArea>
      </Card>
      <CitationDialog
        isOpen={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
        citation={selectedCitation || ''}
        details={selectedDetails}
      />
    </>
  )
}
