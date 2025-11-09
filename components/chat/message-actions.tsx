'use client'

import { Bookmark, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageActionsProps {
  onBookmark: () => void
  onSaveAsAnswer: () => void
  isBookmarked?: boolean
  isSaved?: boolean
}

export function MessageActions({
  onBookmark,
  onSaveAsAnswer,
  isBookmarked,
  isSaved,
}: MessageActionsProps) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${
            isBookmarked
              ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
              : ''
          }`}
          onClick={onBookmark}
          title="Bookmark"
        >
          <Bookmark className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs ${
            isSaved
              ? 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'
              : ''
          }`}
          onClick={onSaveAsAnswer}
        >
          <Flame className="h-4 w-4 mr-1" />
          Save as Answer
        </Button>
      </div>
    </div>
  )
}
