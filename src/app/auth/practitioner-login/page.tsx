import { Suspense } from "react"
import { PractitionerLoginClient } from "./PractitionerLoginClient"

export default function PractitionerLoginPage() {
  return (
    <Suspense fallback={<div className="bg-muted/30 min-h-screen" />}>
      <PractitionerLoginClient />
    </Suspense>
  )
}
