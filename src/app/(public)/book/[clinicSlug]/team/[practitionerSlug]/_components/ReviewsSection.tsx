"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ReviewsSection({
  practitionerId,
  reviews,
  avgRating,
}: {
  practitionerId: string
  reviews: { rating: number; body: string | null; created_at: string }[]
  avgRating: number | null
}) {
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submitReview() {
    if (rating < 1) {
      toast.error("Please choose a star rating")
      return
    }
    setSubmitting(true)
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitionerId,
        rating,
        body: body.trim() || undefined,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      toast.error("Could not submit review", {
        description: data.error ?? "Try again later.",
      })
      return
    }
    toast.success("Thanks for your feedback", {
      description:
        "Your review will appear after the clinic approves it (usually within a few days).",
    })
    setShowForm(false)
    setRating(0)
    setBody("")
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-foreground font-semibold">Patient reviews</h2>
        {!showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Leave a review
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border-border bg-muted/30 mb-6 space-y-4 rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">
            Share your experience. Reviews are moderated before they appear publicly.
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="p-0.5"
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} stars`}
              >
                <Star
                  className={`size-7 ${
                    n <= (hovered || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Optional comments (max 1000 characters)"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => void submitReview()}
            >
              {submitting ? "Submitting…" : "Submit review"}
            </Button>
          </div>
        </div>
      )}

      {avgRating != null && reviews.length > 0 && (
        <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
          <span className="text-foreground font-medium">{avgRating.toFixed(1)}</span>
          <span>·</span>
          <span>
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">No published reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r, i) => (
            <div
              key={`${r.created_at}-${i}`}
              className="border-border border-b pb-4 last:border-0"
            >
              <div className="mb-1 flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-3.5 ${
                        n <= r.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/25"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(r.created_at), "MMM d, yyyy")}
                </span>
              </div>
              {r.body ? <p className="text-muted-foreground text-sm">{r.body}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
