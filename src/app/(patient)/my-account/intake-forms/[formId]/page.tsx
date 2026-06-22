import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PhysioIntakeForm } from "./_components/PhysioIntakeForm"

export default async function PatientIntakeFormPage({
  params,
}: {
  params: Promise<{ formId: string }>
}) {
  const { formId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/patient-login")

  const { data: form } = await supabase
    .from("intake_form_submissions")
    .select("*")
    .eq("id", formId)
    .maybeSingle()

  if (!form) {
    redirect("/my-account/intake-forms")
  }
  if (form.status === "submitted") {
    redirect("/my-account/intake-forms")
  }

  return <PhysioIntakeForm form={form} />
}
