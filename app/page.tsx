"use client"

import { useState } from "react"
import { ChatWindow } from "@/components/chat-window"
import { CitationsPanel } from "@/components/citations-panel"
import type { Citation } from "@/types/langgraph"

export default function Home() {
  const [selectedCitations, setSelectedCitations] = useState<Citation[]>([])
  const [focusedCitation, setFocusedCitation] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">GCTS Handbook Assistant</h1>
          <p className="text-muted-foreground text-base">
            Ask questions about the faculty handbook and get answers + solutions with citations.
          </p>
        </div>
        {/* </CHANGE> */}

        <div className="flex gap-6">
          <div className="flex-1">
            <ChatWindow
              onCitationsUpdate={setSelectedCitations}
              onCitationClick={setFocusedCitation}
              focusedCitation={focusedCitation}
            />
          </div>
          <div className="w-80">
            <CitationsPanel
              citations={selectedCitations}
              focusedCitation={focusedCitation}
              onCitationClick={setFocusedCitation}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
