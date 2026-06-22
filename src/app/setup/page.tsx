import { SetupWizard } from "./_components/SetupWizard"

export const dynamic = "force-dynamic"

export default function SetupPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-8 p-6 md:p-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set up ClinicBook</h1>
        <p className="text-sm text-muted-foreground">
          This guided checklist confirms your Supabase and email configuration are wired
          up correctly. Environment variables are baked in when the app is built, so this
          page can&apos;t change them for you — it tells you exactly what to set and where.
        </p>
      </div>
      <SetupWizard />
    </div>
  )
}
