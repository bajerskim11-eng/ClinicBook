import {
  CalendarClock,
  Mail,
  Palette,
  ShieldCheck,
  UsersRound,
  Code2,
  type LucideIcon,
} from "lucide-react"

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CalendarClock,
    title: "Online booking, no account required",
    description:
      "Patients pick a service, practitioner, and time — and confirm with just their name and email.",
  },
  {
    icon: UsersRound,
    title: "Practitioner & patient portals",
    description:
      "Staff manage their own schedule and appointments; patients can view bookings, forms, and messages.",
  },
  {
    icon: Mail,
    title: "Automated email reminders",
    description: "24-hour and 1-hour confirmation and reminder emails, sent automatically.",
  },
  {
    icon: Code2,
    title: "Embed booking on your site",
    description: "Drop in a copy-paste snippet to add a \"Book Now\" button or inline iframe.",
  },
  {
    icon: Palette,
    title: "Your branding",
    description: "Logo, brand color, and font carry through the booking page and emails.",
  },
  {
    icon: ShieldCheck,
    title: "Open source & self-hosted",
    description:
      "Runs on your own Supabase project. Your patient data stays yours — fork it, audit it, extend it.",
  },
]

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6">
            <Icon className="size-6 text-primary" />
            <h3 className="mt-3 font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
