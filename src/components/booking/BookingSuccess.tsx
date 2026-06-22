import Link from "next/link"
import { CheckCircle, Mail } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Clinic } from "@/types"

export function BookingSuccess({
  appointmentId,
  clinic,
}: {
  appointmentId: string
  clinic: Clinic
}) {
  return (
    <div className="space-y-4 py-8 text-center">
      <div className="flex justify-center">
        <CheckCircle className="text-green-600 size-16" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">
        Booking confirmed
      </h2>
      <p className="text-muted-foreground text-sm">
        {clinic.name} — a confirmation email is on its way if email is
        configured.
      </p>
      <div className="bg-muted/50 text-muted-foreground space-y-2 rounded-lg p-4 text-sm">
        <div className="flex items-center justify-center gap-2">
          <Mail className="size-4" />
          <span>Confirmation email sent</span>
        </div>
        <p className="text-muted-foreground/80 text-xs">
          Ref: {appointmentId.slice(0, 8).toUpperCase()}
        </p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        {clinic.slug ? (
          <Link
            href={`/book/${clinic.slug}`}
            className={cn(buttonVariants({ variant: "default", size: "lg" }))}
          >
            Book another appointment
          </Link>
        ) : null}
        <Link
          href={`/booking/${appointmentId}`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          View or manage booking
        </Link>
        <Link
          href="/my-account/appointments"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
        >
          Go to my account
        </Link>
      </div>
    </div>
  )
}
