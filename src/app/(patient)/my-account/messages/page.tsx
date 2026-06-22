"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type MessageRow = {
  id: string
  sender: string
  body: string
  created_at: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [patientId, setPatientId] = useState<string | null>(null)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: account } = await supabase
        .from("patient_accounts")
        .select("patient_id, clinic_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!account?.patient_id || cancelled) return
      setPatientId(account.patient_id)
      setClinicId(account.clinic_id)

      const { data } = await supabase
        .from("messages")
        .select("id, sender, body, created_at")
        .eq("patient_id", account.patient_id)
        .order("created_at")

      if (!cancelled) setMessages((data as MessageRow[]) ?? [])

      await supabase
        .from("messages")
        .update({ read: true })
        .eq("patient_id", account.patient_id)
        .eq("sender", "clinic")
        .eq("read", false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = useCallback(async () => {
    const text = newMessage.trim()
    if (!text || !patientId || !clinicId) return
    setSending(true)
    const { data } = await supabase
      .from("messages")
      .insert({
        patient_id: patientId,
        clinic_id: clinicId,
        sender: "patient",
        body: text,
      })
      .select("id, sender, body, created_at")
      .single()
    if (data) setMessages((prev) => [...prev, data as MessageRow])
    setNewMessage("")
    setSending(false)
  }, [newMessage, patientId, clinicId, supabase])

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">Messages</h2>
      <div
        className="bg-card flex flex-col rounded-xl border"
        style={{ height: "500px" }}
      >
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-muted-foreground pt-8 text-center text-sm">
              No messages yet. Send a message to the clinic.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === "patient"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <p>{msg.body}</p>
                <p
                  className={`mt-1 text-xs ${
                    msg.sender === "patient"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(new Date(msg.created_at), "h:mm a")}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 border-t p-3">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <Button
            type="button"
            onClick={() => void send()}
            disabled={sending || !newMessage.trim()}
            size="icon"
            className="self-end"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
