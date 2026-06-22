import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PatientSidebar } from "./_components/PatientSidebar"
import { SignOutButton } from "./_components/SignOutButton"

export default async function PatientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/patient-login")

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("*, patients(*), clinics(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!account) {
    redirect("/auth/patient-login?error=no_account")
  }

  const patient = account.patients as {
    first_name?: string
    last_name?: string
    preferred_name?: string | null
  } | null
  const clinic = account.clinics as {
    name?: string
    slug?: string
    logo_url?: string | null
  } | null

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {clinic?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinic.logo_url}
                alt={clinic.name ?? "Clinic"}
                className="size-8 rounded object-cover"
              />
            ) : null}
            <span className="text-sm font-semibold">{clinic?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            {clinic?.slug ? (
              <Link
                href={`/book/${clinic.slug}`}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Book another appointment
              </Link>
            ) : null}
            <SignOutButton clinicSlug={clinic?.slug ?? null} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">Welcome back,</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {patient?.preferred_name || patient?.first_name}{" "}
            {patient?.last_name}
          </h1>
        </div>

        <div className="flex gap-6">
          <PatientSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
