import { BookingDataLoader } from "./_components/BookingDataLoader"

type Props = {
  params: Promise<{ clinicSlug: string }>
  searchParams: Promise<{ practitioner?: string; service?: string; embed?: string }>
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { clinicSlug } = await params
  const sp = await searchParams
  return (
    <BookingDataLoader
      clinicSlug={clinicSlug}
      preSelectedPractitionerId={sp.practitioner}
      preSelectedServiceId={sp.service}
      embed={sp.embed === "1"}
    />
  )
}
