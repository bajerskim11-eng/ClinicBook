import { Suspense } from "react"
import { PatientLoginClient } from "./PatientLoginClient"

export default function PatientLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <PatientLoginClient />
    </Suspense>
  )
}
