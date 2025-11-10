"use client"

import { useState, useEffect } from "react"
import { CitationsPanel } from "@/components/citations-panel"
import { Card } from "@/components/ui/card"
import type { Citation } from "@/types/langgraph"
import type { Message } from "@/components/chat/types"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home as HomeIcon, Sparkles, Layout } from "lucide-react"

// Mock citations data
const mockCitations: Citation[] = [
  {
    number: 1,
    section_path: "Academic > Policies > Faculty Appointments",
    precise_section: "Faculty Appointments",
    content_preview: "Faculty appointments are made through a rigorous process involving department review, dean approval, and provost confirmation. The process typically takes 4-6 weeks from initial application to final offer.",
    content: "Faculty appointments are made through a rigorous process involving department review, dean approval, and provost confirmation. The process typically takes 4-6 weeks from initial application to final offer. All appointments must comply with institutional policies regarding academic qualifications, teaching experience, and research credentials. The department chair initiates the process by submitting a recommendation to the dean, who reviews the candidate's qualifications and department needs. Upon dean approval, the recommendation proceeds to the provost's office for final confirmation. Candidates receive written notification of their appointment status within 10 business days of the provost's decision.",
    pinecone_id: "mock-citation-1",
    similarity_score: 0.92,
    stakeholder_groups: ["Faculty", "Department Chairs", "Deans"],
    approval_authority: "Provost",
    section_type: "Policy",
  },
  {
    number: 2,
    section_path: "Academic > Policies > Faculty Appointments > Tenure Track",
    precise_section: "Tenure Track Appointments",
    content_preview: "Tenure track positions require a terminal degree in the field, demonstrated teaching excellence, and a record of scholarly activity. The tenure review process begins in the sixth year of appointment.",
    content: "Tenure track positions require a terminal degree in the field, demonstrated teaching excellence, and a record of scholarly activity. The tenure review process begins in the sixth year of appointment. Candidates must submit a comprehensive portfolio documenting their teaching effectiveness, research contributions, and service to the institution. The portfolio is reviewed by a committee of tenured faculty members, who provide recommendations to the department chair and dean. External letters of evaluation from recognized experts in the candidate's field are also required. The final decision rests with the provost, who considers the committee's recommendation, department needs, and institutional priorities.",
    pinecone_id: "mock-citation-2",
    similarity_score: 0.88,
    stakeholder_groups: ["Tenure Track Faculty", "Department Chairs"],
    approval_authority: "Provost",
    section_type: "Policy",
  },
  {
    number: 3,
    section_path: "Academic > Procedures > Hiring Process",
    precise_section: "Hiring Process",
    content_preview: "The hiring process includes posting the position, reviewing applications, conducting interviews, and extending offers. All positions must be posted for a minimum of 30 days before interviews can begin.",
    content: "The hiring process includes posting the position, reviewing applications, conducting interviews, and extending offers. All positions must be posted for a minimum of 30 days before interviews can begin. The search committee, composed of faculty members and department representatives, reviews all applications and selects candidates for initial screening interviews. Selected candidates are invited for campus visits, which include teaching demonstrations, research presentations, and meetings with faculty, students, and administrators. Following the campus visits, the search committee makes a recommendation to the department chair, who forwards the recommendation to the dean. Once approved, the dean's office extends the formal offer, including details about salary, benefits, start date, and any special conditions of employment.",
    pinecone_id: "mock-citation-3",
    similarity_score: 0.85,
    stakeholder_groups: ["Faculty", "Search Committees", "HR"],
    approval_authority: "Dean",
    section_type: "Procedure",
  },
]

// Mock messages
const mockMessages: Message[] = [
  {
    role: "user",
    content: "What is the process for faculty appointments?",
  },
  {
    role: "assistant",
    content: "Faculty appointments follow a structured process that typically takes 4-6 weeks from application to final offer. The process involves several key steps:\n\n1. **Department Review**: The department chair initiates the process by submitting a recommendation based on the candidate's qualifications and department needs.\n\n2. **Dean Approval**: The dean reviews the candidate's qualifications, teaching experience, and research credentials before approving the recommendation.\n\n3. **Provost Confirmation**: The recommendation proceeds to the provost's office for final confirmation and institutional alignment.\n\n4. **Notification**: Candidates receive written notification of their appointment status within 10 business days of the provost's decision.\n\nAll appointments must comply with institutional policies regarding academic qualifications, and positions must be posted for a minimum of 30 days before interviews can begin. For tenure track positions specifically, candidates must have a terminal degree, demonstrated teaching excellence, and a record of scholarly activity.",
    citations: mockCitations,
  },
]

// Mock ChatWindow component that displays static messages
function MockChatWindow({
  onCitationsUpdate,
  onCitationClick,
  focusedCitation,
}: {
  onCitationsUpdate: (citations: Citation[]) => void
  onCitationClick: (citation: string) => void
  focusedCitation: string | null
}) {
  // Set citations on mount
  useEffect(() => {
    onCitationsUpdate(mockCitations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card className="flex flex-col h-full border-border/40">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6 pb-4">
          {mockMessages.map((message, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary">
                  <span className="text-primary-foreground text-sm font-medium">
                    AI
                  </span>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                {message.citations &&
                  message.citations.some(
                    (citation) => citation.precise_section
                  ) && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-xs font-medium mb-2 opacity-70">
                        Sources:
                      </p>
                      <ul className="space-y-1">
                        {message.citations.map((citation, idx) => (
                          <li
                            key={citation.pinecone_id || idx}
                            className="text-xs opacity-70 cursor-pointer hover:opacity-100 hover:underline transition-opacity"
                            onClick={() => onCitationClick(citation.pinecone_id)}
                          >
                            • {citation.precise_section}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-secondary-foreground text-sm font-medium">
                    You
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/40 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="italic">Mock UI - Input disabled for ideation</span>
        </div>
      </div>
    </Card>
  )
}

export default function UIIdeationPage() {
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
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            GCTS Handbook Assistant - UI Ideation
          </h1>
          <p className="text-muted-foreground text-base">
            Mock interface for UI development. All data is static and no
            functionality is connected.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-7xl pb-8 flex-1 flex gap-6 min-h-0">
        <div className="flex-1 min-h-0">
          <MockChatWindow
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

