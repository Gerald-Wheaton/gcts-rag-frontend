"use client"

import { useState } from "react"
import { ChatWindow } from "@/components/chat-window"
import { CitationsPanel } from "@/components/citations-panel"
import type { Citation } from "@/types/langgraph"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home as HomeIcon, Sparkles, Layout } from "lucide-react"

export default function Home() {
  const [selectedCitations, setSelectedCitations] = useState<Citation[]>([])
  const [focusedCitation, setFocusedCitation] = useState<string | null>(null)
  const pathname = usePathname()

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl pt-8 pb-6 flex-shrink-0">
        {/* Navigation */}
        <div className="mb-6 flex items-center gap-4">
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <HomeIcon className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/ui-ideation"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/ui-ideation"
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              UI Ideation
            </Link>
            <Link
              href="/storyboard"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/storyboard"
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Layout className="h-4 w-4" />
              Storyboard
            </Link>
          </nav>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">GCTS Handbook Assistant</h1>
          <p className="text-muted-foreground text-base">
            Ask questions about the faculty handbook and get answers + solutions with citations.
          </p>
        </div>
      </div>
      {/* </CHANGE> */}

      <div className="container mx-auto px-6 max-w-7xl pb-8 flex-1 flex gap-6 min-h-0">
        <div className="flex-1 min-h-0">
          <ChatWindow
            onCitationsUpdate={setSelectedCitations}
            onCitationClick={setFocusedCitation}
            focusedCitation={focusedCitation}
          />
        </div>
        <div className="w-80 min-h-0">
          <CitationsPanel
            citations={selectedCitations}
            focusedCitation={focusedCitation}
            onCitationClick={setFocusedCitation}
          />
        </div>
      </div>
    </div>
  )
}
