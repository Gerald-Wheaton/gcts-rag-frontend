'use client'

import { Bookmark, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageStatusIconsProps {
  isBookmarked: boolean
  isSavedAsAnswer: boolean
  onBookmarkClick?: () => void
  onSaveAsAnswerClick?: () => void
}

export function MessageStatusIcons({
  isBookmarked,
  isSavedAsAnswer,
  onBookmarkClick,
  onSaveAsAnswerClick,
}: MessageStatusIconsProps) {
  if (!isBookmarked && !isSavedAsAnswer) return null

  return (
    <div className="flex flex-col gap-2 items-center ml-1">
      {isBookmarked && (
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 p-0 hover:bg-transparent"
          onClick={onBookmarkClick}
        >
          <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
        </Button>
      )}
      {isSavedAsAnswer && (
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 p-0 hover:bg-transparent"
          onClick={onSaveAsAnswerClick}
        >
          <Flame className="h-4 w-4 text-purple-500 fill-purple-500" />
        </Button>
      )}
    </div>
  )
}

