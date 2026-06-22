"use client"

import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function HoldTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: string
  onExpire: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    const tick = () => {
      const diff = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000
      )
      if (diff <= 0) {
        setSecondsLeft(0)
        onExpire()
        return false
      }
      setSecondsLeft(diff)
      return true
    }
    if (!tick()) return
    const interval = setInterval(() => {
      if (!tick()) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isUrgent = secondsLeft < 120

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
        isUrgent
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-800 dark:text-amber-200"
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>
        This time is held for{" "}
        <strong>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </strong>
      </span>
    </div>
  )
}
