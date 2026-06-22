"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const router = useRouter()

  async function cancel() {
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
    setOpen(false)
    if (res.ok) {
      setCancelled(true)
      toast.success("Appointment cancelled")
      router.refresh()
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      toast.error("Could not cancel", {
        description: data.error ?? "Try again.",
      })
    }
    setLoading(false)
  }

  if (cancelled) {
    return (
      <span className="text-muted-foreground text-xs font-medium">Cancelled</span>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        Cancel
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel appointment?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This cannot be undone. Are you sure you want to cancel?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              onClick={cancel}
              disabled={loading}
            >
              {loading ? "Cancelling…" : "Yes, cancel it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
