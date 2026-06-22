"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  SlidersHorizontal,
  User,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/practitioner", label: "Overview", icon: LayoutDashboard },
  { href: "/practitioner/appointments", label: "Appointments", icon: ClipboardList },
  { href: "/practitioner/profile", label: "Profile", icon: User },
  { href: "/practitioner/availability", label: "Availability", icon: SlidersHorizontal },
]

export function PractitionerSidebar({
  practitionerName,
  clinicName,
  clinicSlug,
}: {
  practitionerName: string
  clinicName: string
  clinicSlug: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/auth/practitioner-login")
    router.refresh()
  }

  return (
    <aside className="border-border bg-background flex w-60 shrink-0 flex-col border-r">
      <div className="border-border border-b p-5">
        <h1 className="text-primary text-lg font-bold">ClinicBook</h1>
        <p className="text-muted-foreground mt-0.5 text-xs">Practitioner portal</p>
        <p className="text-foreground mt-3 text-sm font-medium">{practitionerName}</p>
        <p className="text-muted-foreground text-xs">{clinicName}</p>
        {clinicSlug ? (
          <a
            href={`/book/${clinicSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <Calendar className="size-3" />
            Public booking page
          </a>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-border border-t p-3">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
