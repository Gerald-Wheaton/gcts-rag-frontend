export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-medium text-foreground">Faculty Handbook Assistant</h1>
        <p className="text-muted-foreground text-balance">
          Ask me anything about faculty policies, procedures, and guidelines.
        </p>
      </div>
    </div>
  )
}
