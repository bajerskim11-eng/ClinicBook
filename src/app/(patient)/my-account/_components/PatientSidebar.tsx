"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  MessageSquare,
  Receipt,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navGroups: {
  label: string
  items: { href: string; label: string; icon: typeof CalendarDays }[]
}[] = [
  {
    label: "Appointments",
    items: [
      {
        href: "/my-account/appointments",
        label: "Upcoming appointments",
        icon: CalendarDays,
      },
      {
        href: "/my-account/appointments/history",
        label: "Appointment history",
        icon: Clock,
      },
    ],
  },
  {
    label: "My account",
    items: [
      { href: "/my-account/messages", label: "Messages", icon: MessageSquare },
      {
        href: "/my-account/intake-forms",
        label: "Intake forms",
        icon: ClipboardList,
      },
      { href: "/my-account/documents", label: "Documents", icon: FileText },
      {
        href: "/my-account/contact-info",
        label: "Contact info",
        icon: User,
      },
      { href: "/my-account/receipts", label: "Receipts", icon: Receipt },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        href: "/my-account/notifications",
        label: "Notifications",
        icon: Bell,
      },
      { href: "/my-account/password", label: "Password", icon: Lock },
    ],
  },
]

export function PatientSidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden w-52 shrink-0 md:block">
      <nav className="space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    pathname === href
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
