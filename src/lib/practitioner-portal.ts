import { adminSupabase } from "@/lib/supabase/admin"

export type PractitionerPortalContext = {
  practitionerId: string
  clinicId: string
}

export async function getPractitionerPortalContext(
  userId: string
): Promise<PractitionerPortalContext | null> {
  const { data } = await adminSupabase
    .from("practitioner_accounts")
    .select("practitioner_id, clinic_id")
    .eq("user_id", userId)
    .maybeSingle()
  if (!data?.practitioner_id || !data?.clinic_id) return null
  return {
    practitionerId: data.practitioner_id,
    clinicId: data.clinic_id,
  }
}
