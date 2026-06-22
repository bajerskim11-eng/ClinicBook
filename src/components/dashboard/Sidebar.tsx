"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Briefcase,
  UserCog,
  Clock,
  Settings,
  LogOut,
  BarChart3,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/appointments", label: "Appointments", icon: ClipboardList },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/services", label: "Services", icon: Briefcase },
  { href: "/dashboard/practitioners", label: "Practitioners", icon: UserCog },
  { href: "/dashboard/schedule", label: "Schedule", icon: Clock },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <aside className="border-border bg-background flex w-64 shrink-0 flex-col border-r">
      <div className="border-border border-b p-6">
        <h1 className="text-primary text-lg font-bold">ClinicBook</h1>
        <p className="text-muted-foreground mt-0.5 text-xs">Admin dashboard</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
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

      <div className="border-border border-t p-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
