'use client'

import { cn } from '@/lib/utils'
import type { Message } from './types'
import { MessageStatusIcons } from './message-status-icons'

interface ChatMessageProps {
  message: Message
  isActionMessage: boolean
  onCitationClick: (citation: string) => void
  onBookmark?: () => void
  onSaveAsAnswer?: () => void
}

export function ChatMessage({
  message,
  isActionMessage,
  onCitationClick,
  onBookmark,
  onSaveAsAnswer,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex gap-3 group',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              isActionMessage
                ? 'bg-linear-to-r from-purple-500 via-pink-500 to-orange-500'
                : 'bg-primary'
            )}
          >
            <span
              className={cn(
                'text-sm font-medium',
                isActionMessage ? 'text-white' : 'text-primary-foreground'
              )}
            >
              AI
            </span>
          </div>
          <MessageStatusIcons
            isBookmarked={message.isBookmarked || false}
            isSavedAsAnswer={message.isSavedAsAnswer || false}
            onBookmarkClick={onBookmark}
            onSaveAsAnswerClick={onSaveAsAnswer}
          />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-lg relative',
          isActionMessage &&
            'p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-3 relative',
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
            isActionMessage && 'bg-background'
          )}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
          {message.citations &&
            message.citations.some((citation) => citation.precise_section) && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <p className="text-xs font-medium mb-2 opacity-70">Sources:</p>
                <ul className="space-y-1">
                  {message.citations.map((citation, idx) => (
                    <li
                      key={citation.pinecone_id || idx}
                      className="text-xs opacity-70 cursor-pointer hover:opacity-100 hover:underline transition-opacity"
                      onClick={() => onCitationClick(citation.pinecone_id)}
                    >
                      • [{citation.number}] {citation.precise_section}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </div>
      {message.role === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-secondary-foreground text-sm font-medium">
            You
          </span>
        </div>
      )}
    </div>
  )
}
