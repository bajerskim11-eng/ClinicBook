import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PractitionerSidebar } from "./_components/PractitionerSidebar"

export default async function PractitionerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/practitioner-login")
  }

  const { data: link } = await supabase
    .from("practitioner_accounts")
    .select("practitioner_id, clinic_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!link?.practitioner_id || !link.clinic_id) {
    redirect("/auth/practitioner-login?error=no_access")
  }

  const [{ data: practitioner }, { data: clinic }] = await Promise.all([
    supabase
      .from("practitioners")
      .select("name, color")
      .eq("id", link.practitioner_id)
      .single(),
    supabase
      .from("clinics")
      .select("name, slug, logo_url")
      .eq("id", link.clinic_id)
      .single(),
  ])

  return (
    <div className="bg-background flex h-screen w-full">
      <PractitionerSidebar
        practitionerName={practitioner?.name ?? "Practitioner"}
        clinicName={clinic?.name ?? ""}
        clinicSlug={clinic?.slug ?? null}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  )
}
