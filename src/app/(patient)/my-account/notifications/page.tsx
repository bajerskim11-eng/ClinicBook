"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type Prefs = {
  notif_email_reminders: boolean
  notif_reminder_timing: string
  notif_confirmations: boolean
  notif_marketing: boolean
}

const defaultPrefs: Prefs = {
  notif_email_reminders: true,
  notif_reminder_timing: "24h",
  notif_confirmations: true,
  notif_marketing: true,
}

export default function NotificationsPage() {
  const [patientId, setPatientId] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data: account } = await supabase
      .from("patient_accounts")
      .select("patient_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!account?.patient_id) {
      setLoading(false)
      return
    }
    setPatientId(account.patient_id)
    const { data: patient } = await supabase
      .from("patients")
      .select(
        "notif_email_reminders, notif_reminder_timing, notif_confirmations, notif_marketing"
      )
      .eq("id", account.patient_id)
      .single()
    if (patient) {
      setPrefs({
        notif_email_reminders: patient.notif_email_reminders ?? true,
        notif_reminder_timing: patient.notif_reminder_timing ?? "24h",
        notif_confirmations: patient.notif_confirmations ?? true,
        notif_marketing: patient.notif_marketing ?? true,
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function save() {
    if (!patientId) return
    setSaving(true)
    const { error } = await supabase
      .from("patients")
      .update({
        notif_email_reminders: prefs.notif_email_reminders,
        notif_reminder_timing: prefs.notif_reminder_timing,
        notif_confirmations: prefs.notif_confirmations,
        notif_marketing: prefs.notif_marketing,
      })
      .eq("id", patientId)
    if (error) {
      toast.error("Could not save preferences", { description: error.message })
    } else {
      toast.success("Notification preferences saved")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-foreground font-semibold">Notifications and reminders</h2>

      <div className="bg-card divide-y rounded-xl border">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Appointment reminders</p>
              <p className="text-muted-foreground text-xs">
                Email before upcoming appointments
              </p>
            </div>
            <Switch
              checked={prefs.notif_email_reminders}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, notif_email_reminders: v }))
              }
            />
          </div>
          {prefs.notif_email_reminders ? (
            <div className="flex flex-wrap items-center gap-3">
              <Label className="text-muted-foreground shrink-0 text-xs">
                Remind me
              </Label>
              <Select
                value={prefs.notif_reminder_timing}
                onValueChange={(v) =>
                  setPrefs((p) => ({
                    ...p,
                    notif_reminder_timing: v ?? "24h",
                  }))
                }
              >
                <SelectTrigger className="h-8 w-56 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour before</SelectItem>
                  <SelectItem value="2h">2 hours before</SelectItem>
                  <SelectItem value="24h">24 hours before</SelectItem>
                  <SelectItem value="both">Both 24h and 1h before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium">Booking confirmations</p>
            <p className="text-muted-foreground text-xs">
              Email when an appointment is booked or cancelled
            </p>
          </div>
          <Switch
            checked={prefs.notif_confirmations}
            onCheckedChange={(v) =>
              setPrefs((p) => ({ ...p, notif_confirmations: v }))
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium">News and promotions</p>
            <p className="text-muted-foreground text-xs">
              Clinic updates and offers
            </p>
          </div>
          <Switch
            checked={prefs.notif_marketing}
            onCheckedChange={(v) =>
              setPrefs((p) => ({ ...p, notif_marketing: v }))
            }
          />
        </div>
      </div>

      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save preferences"
        )}
      </Button>
    </div>
  )
}
