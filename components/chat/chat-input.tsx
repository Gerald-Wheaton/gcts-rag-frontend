'use client'

import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Kbd } from '@/components/ui/kbd'
import { ArrowUp, Paperclip, Globe, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  input: string
  isLoading: boolean
  hasMessages: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onProposeAction: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export function ChatInput({
  input,
  isLoading,
  hasMessages,
  onInputChange,
  onSubmit,
  onProposeAction,
  onKeyDown,
}: ChatInputProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="p-4 border-t border-border/40">
      <TooltipProvider>
        <form onSubmit={onSubmit}>
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about faculty policies, leave, tenure, compensation..."
              className="min-h-[80px] pr-12 resize-none bg-background"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
              </Button>
              {hasMessages && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        type="button"
                        onClick={onProposeAction}
                        disabled={isLoading}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                          width: isHovered ? '152px' : '32px',
                          transition: 'width 700ms ease-in-out',
                        }}
                        className={cn(
                          'h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
                          'hover:from-purple-600 hover:via-pink-600 hover:to-orange-600',
                          'text-white text-xs font-medium shadow-md',
                          'animate-in fade-in zoom-in-95 duration-500',
                          'overflow-hidden relative',
                          isHovered ? 'px-3' : 'p-0'
                        )}
                      >
                        <Sparkles
                          className={cn(
                            'h-3 w-3 shrink-0 transition-all duration-700 ease-in-out',
                            isHovered
                              ? 'relative mr-1.5'
                              : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                          )}
                        />
                        <span
                          className={cn(
                            'whitespace-nowrap transition-all duration-700 ease-in-out',
                            isHovered ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                          )}
                        >
                          Propose Action
                        </span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1">
                      <Kbd>⌘</Kbd>
                      <span className="text-xs text-muted-foreground">+</span>
                      <Kbd>⇧</Kbd>
                      <span className="text-xs text-muted-foreground">+</span>
                      <Kbd>P</Kbd>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      type="submit"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      disabled={!input.trim() || isLoading}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <Kbd>↵</Kbd>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </form>
      </TooltipProvider>
    </div>
  )
}
