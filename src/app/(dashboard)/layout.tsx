import { redirect } from "next/navigation"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const role = String(user.app_metadata?.role ?? "").toLowerCase()
  if (role === "practitioner") redirect("/practitioner")
  if (role === "patient") redirect("/my-account?error=no_access")
  if (user.app_metadata?.must_change_password === true) redirect("/auth/first-login")

  const [{ data: portalRow }, { data: patientRow }] = await Promise.all([
    supabase
      .from("practitioner_accounts")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("patient_accounts")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ])

  if (portalRow) redirect("/practitioner")
  if (patientRow) redirect("/my-account?error=no_access")

  return (
    <div className="bg-background flex h-screen w-full">
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
