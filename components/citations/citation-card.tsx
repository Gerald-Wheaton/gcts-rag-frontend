'use client'

import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CitationDetail } from './types'

interface CitationCardProps {
  citation: CitationDetail
  isFocused: boolean
  onClick: () => void
  cardRef: (el: HTMLDivElement | null) => void
}

export function CitationCard({
  citation,
  isFocused,
  onClick,
  cardRef,
}: CitationCardProps) {
  return (
    <div
      ref={cardRef}
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-all border border-transparent',
        'hover:bg-muted/50',
        isFocused && 'border-green-500 bg-green-500/10'
      )}
      onClick={onClick}
    >
      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="text-xs font-medium leading-relaxed">
          {citation.precise_section}
        </p>
        {citation.content_preview && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {citation.content_preview}
          </p>
        )}
      </div>
    </div>
  )
}
