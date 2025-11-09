import { BookOpen } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <BookOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-2">Citations</h3>
      <p className="text-xs text-muted-foreground text-balance">
        Citations from the faculty handbook will appear here when you ask a question.
      </p>
    </div>
  )
}
