import { createClient } from "@/lib/supabase/server"
import { Receipt } from "lucide-react"
import { ReceiptCard } from "./_components/ReceiptCard"

export default async function ReceiptsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, services(name, price_cents), practitioners(name), clinics(name, address)")
    .eq("patient_id", account?.patient_id ?? "")
    .eq("status", "completed")
    .order("start_datetime", { ascending: false })

  const list = appointments ?? []

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">Receipts</h2>

      {!list.length ? (
        <div className="bg-card text-muted-foreground rounded-xl border p-8 text-center">
          <Receipt className="mx-auto mb-2 size-8 opacity-50" />
          <p>No receipts yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((appt) => {
            const svc = appt.services as {
              name?: string
              price_cents?: number
            } | null
            const pract = appt.practitioners as { name?: string } | null
            const clin = appt.clinics as { name?: string } | null
            return (
              <ReceiptCard
                key={appt.id}
                appointmentId={appt.id}
                serviceName={svc?.name ?? "Service"}
                practitionerName={pract?.name ?? ""}
                startDatetime={appt.start_datetime}
                clinicName={clin?.name ?? ""}
                priceCents={svc?.price_cents ?? 0}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
