import { ManageAppointmentLoader } from "./_components/ManageAppointmentLoader"

type Props = { params: Promise<{ appointmentId: string }> }

export default async function ManageBookingPage({ params }: Props) {
  const { appointmentId } = await params

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="mx-auto max-w-lg px-4 py-8">
        <ManageAppointmentLoader appointmentId={appointmentId} />
      </div>
    </div>
  )
}
