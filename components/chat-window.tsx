'use client'

import type React from 'react'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Message, ChatWindowProps } from './chat/types'
import { ChatMessage } from './chat/chat-message'
import { LoadingIndicator } from './chat/loading-indicator'
import { EmptyState } from './chat/empty-state'
import { ChatInput } from './chat/chat-input'
import { proposeAction } from '@/app/actions'
import { toast } from 'sonner'
import type { Citation } from '@/types/langgraph'

export function ChatWindow({
  onCitationsUpdate,
  onCitationClick,
  focusedCitation,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasMessages, setHasMessages] = useState(false)
  const [actionMessageIndices, setActionMessageIndices] = useState<Set<number>>(
    new Set()
  )
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentConversationId')
    }
    return null
  })
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Helper to save conversationId to localStorage
  const saveConversationId = (id: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentConversationId', id)
    }
    setConversationId(id)
  }

  // Helper to start a new conversation
  const startNewConversation = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentConversationId')
    }
    setConversationId(null)
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        handleSubmit(e)
      }
    }
    if (e.key === 'p' && e.metaKey && e.shiftKey && hasMessages && !isLoading) {
      e.preventDefault()
      handleProposeAction()
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight
        }, 50)
      }
    }
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    const currentInput = input
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsActionLoading(false)
    setHasMessages(true)

    let fullAnswer = ''
    const citationsBuffer: Citation[] = []

    try {
      const response = await fetch('/api/handbook/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentInput,
          conversationId: conversationId || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Query failed with status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          
          try {
            const data = JSON.parse(line.slice(6))

            switch (data.type) {
              case 'conversationId':
                saveConversationId(data.data.conversationId)
                break

              case 'answer':
                fullAnswer += data.data.content
                // Update message in real-time for streaming effect
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (lastMsg?.role === 'assistant') {
                    lastMsg.content = fullAnswer
                  } else {
                    newMessages.push({
                      role: 'assistant',
                      content: fullAnswer,
                      citations: [],
                    })
                  }
                  return newMessages
                })
                break

              case 'citation':
                citationsBuffer.push(data.data)
                break

              case 'clarification':
                // Handle clarification request as a separate assistant message
                const clarificationMsg: Message = {
        role: 'assistant',
                  content: data.data.question,
                  citations: [],
                }
                setMessages((prev) => [...prev, clarificationMsg])
                break

              case 'error':
                console.error('[ChatWindow] Stream error:', data.data.message)
                toast.error(data.data.message || 'An error occurred while processing your query')
                break

              case 'done':
                // Finalize message with all citations
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (lastMsg?.role === 'assistant') {
                    lastMsg.citations = citationsBuffer
                  }
                  return newMessages
                })
                onCitationsUpdate(citationsBuffer)
                break
            }
          } catch (parseError) {
            console.error('[ChatWindow] Error parsing SSE data:', parseError)
          }
        }
      }
    } catch (error) {
      console.error('[ChatWindow] Error in handleSubmit:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to connect to the handbook assistant'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleProposeAction = async () => {
    setIsLoading(true)
    setIsActionLoading(true)

    try {
      const response = await proposeAction(conversationId || undefined)
      const actionMessage: Message = {
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
      }
      setMessages((prev) => {
        const newIndex = prev.length
        setActionMessageIndices((indices) => new Set(indices).add(newIndex))
        return [...prev, actionMessage]
      })
      onCitationsUpdate(response.citations)
      
      // Update conversationId if returned
      if (response.conversationId) {
        saveConversationId(response.conversationId)
      }
    } catch (error) {
      console.error('[ChatWindow] Error fetching action proposal:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to generate action proposal'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-[calc(100vh-8rem)] border-border/40">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6 pb-4">
              {messages.map((message, i) => (
                <ChatMessage
                  key={i}
                  message={message}
                  isActionMessage={actionMessageIndices.has(i)}
                  onCitationClick={onCitationClick}
                />
              ))}
              {isLoading && (
                <LoadingIndicator
                  variant={isActionLoading ? 'action' : 'default'}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        <ChatInput
          input={input}
          isLoading={isLoading}
          hasMessages={hasMessages}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onProposeAction={handleProposeAction}
          onKeyDown={handleKeyDown}
        />
      </Card>
    </TooltipProvider>
  )
}
