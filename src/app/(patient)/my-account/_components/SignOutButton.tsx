"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function SignOutButton({ clinicSlug }: { clinicSlug?: string | null }) {
  const supabase = createClient()
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await supabase.auth.signOut()
        const nextUrl = clinicSlug
          ? `/auth/patient-login?clinicSlug=${encodeURIComponent(clinicSlug)}`
          : "/auth/patient-login"
        router.push(nextUrl)
      }}
      className="text-muted-foreground hover:text-foreground text-sm"
    >
      Sign out
    </button>
  )
}
