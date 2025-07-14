import { Dot } from "lucide-react"
import "./typing-indicator.css"

export function TypingIndicator() {
  return (
    <div className="justify-left flex space-x-1">
      <div className="rounded-lg bg-muted p-2">
        <div className="flex -space-x-2">
          <Dot className="h-4 w-4 animate-typing-dot-bounce" />
          <Dot className="h-4 w-4 animate-typing-dot-bounce" style={{ animationDelay: "150ms" }} />
          <Dot className="h-4 w-4 animate-typing-dot-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  )
}
