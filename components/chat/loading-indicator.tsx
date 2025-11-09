export function LoadingIndicator({ variant = "default" }: { variant?: "default" | "action" }) {
  const isAction = variant === "action"

  return (
    <div className="flex gap-3 justify-start">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isAction ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" : "bg-primary"
        }`}
      >
        <span className="text-primary-foreground text-sm font-medium">AI</span>
      </div>
      {isAction ? (
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-lg p-[2px]">
          <div className="bg-background rounded-lg px-4 py-3">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted rounded-lg px-4 py-3">
          <div className="flex gap-1">
            <div
              className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
