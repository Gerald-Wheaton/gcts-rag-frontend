'use client'

import { cn } from '@/lib/utils'
import type { Message } from './types'

interface ChatMessageProps {
  message: Message
  isActionMessage: boolean
  onCitationClick: (citation: string) => void
}

export function ChatMessage({
  message,
  isActionMessage,
  onCitationClick,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex gap-3',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            isActionMessage
              ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
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
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-lg',
          isActionMessage &&
            'p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
            isActionMessage && 'bg-background'
          )}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
          {message.citations && message.citations.length > 0 && (
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
