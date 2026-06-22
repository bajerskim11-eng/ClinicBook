import Link from "next/link"

const btnPrimary =
  "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
const btnOutline =
  "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"

export function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center">
      <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        Free & open source — self-hosted, no usage limits
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Clinic scheduling software you actually own
      </h1>
      <p className="max-w-xl text-balance text-muted-foreground">
        Online booking, practitioner and patient portals, automated reminders, and your own
        branding — deployed on your own Supabase project. No subscription, no per-seat fees,
        no vendor lock-in.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/book/demo-clinic" className={btnPrimary}>
          See it in action
        </Link>
        <Link href="/setup" className={btnOutline}>
          Self-host it
        </Link>
        <Link href="/auth/login" className={btnOutline}>
          Admin login
        </Link>
      </div>
    </section>
  )
}
