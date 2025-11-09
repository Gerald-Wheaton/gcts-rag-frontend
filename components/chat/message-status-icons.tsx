'use client'

import { Bookmark, Flame } from 'lucide-react'

import { Button } from '@/components/ui/button'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2 items-center ml-1">
        {/* Bookmark icon - shows on hover or when bookmarked */}
        <div
          className={`transition-all duration-1000 ease-in-out ${
            isBookmarked
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-75 -translate-y-2 pointer-events-none h-0 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:h-auto'
          }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`w-7 h-7 rounded-md border transition-colors ${
                  isBookmarked
                    ? 'bg-orange-500/10 border-orange-500 text-orange-500 hover:bg-orange-500/20 hover:text-orange-500'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground'
                }`}
                onClick={onBookmarkClick}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${
                    isBookmarked ? 'fill-orange-500' : ''
                  }`}
                />
              </Button>
            </TooltipTrigger>

            <TooltipContent side="right" className="z-50">
              <p>Bookmark</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Flame icon - shows on hover or when saved as answer */}
        <div
          className={`transition-all duration-1000 ease-in-out delay-100 ${
            isSavedAsAnswer
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-75 -translate-y-2 pointer-events-none h-0 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:h-auto'
          }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`w-7 h-7 rounded-md border transition-colors ${
                  isSavedAsAnswer
                    ? 'bg-purple-500/10 border-purple-500 text-purple-500 hover:bg-purple-500/20 hover:text-purple-500'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground'
                }`}
                onClick={onSaveAsAnswerClick}
              >
                <Flame
                  className={`h-3.5 w-3.5 ${
                    isSavedAsAnswer ? 'fill-purple-500' : ''
                  }`}
                />
              </Button>
            </TooltipTrigger>

            <TooltipContent side="right" className="z-50">
              <p>Save as Answer</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
