"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const step1Schema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select your gender"),
  occupation: z.string().min(1, "Occupation is required"),
  emergency_contact_name: z.string().min(2, "Emergency contact name is required"),
  emergency_contact_phone: z.string().min(7, "Valid phone number required"),
  emergency_contact_relation: z.string().min(1, "Relationship is required"),
  family_doctor: z.string().optional(),
  family_doctor_phone: z.string().optional(),
  referred_by: z.string().optional(),
})

const step2Schema = z.object({
  chief_complaint: z
    .string()
    .min(10, "Please describe your main concern (at least 10 characters)"),
  pain_location: z.string().min(3, "Please describe pain location"),
  pain_onset: z.string().min(1, "Please select onset"),
  pain_onset_cause: z.string().optional(),
  pain_scale: z.string().min(1, "Please rate your pain"),
  pain_type: z.array(z.string()).min(1, "Select at least one pain type"),
  pain_worse: z.string().optional(),
  pain_better: z.string().optional(),
  previous_treatment: z.string().min(1, "Please indicate if you've had previous treatment"),
  previous_treatment_details: z.string().optional(),
})

const step3Schema = z.object({
  surgeries: z.string().min(1, 'Required — enter "None" if no surgeries'),
  fractures: z.string().min(1, 'Required — enter "None" if none'),
  medications: z.string().min(1, 'Required — enter "None" if none'),
  allergies: z.string().min(1, 'Required — enter "None" if none'),
  conditions: z.array(z.string()),
  other_conditions: z.string().optional(),
})

const step4Schema = z.object({
  goals: z
    .string()
    .min(10, "Please describe your treatment goals (at least 10 characters)"),
  consent_treatment: z.boolean().refine((v) => v === true, {
    message: "You must consent to treatment to proceed",
  }),
  consent_privacy: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge the privacy policy",
  }),
  signature: z.string().min(2, "Please type your full name as signature"),
})

const STEPS = ["Personal info", "Current condition", "Health history", "Consent"]

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>
type Step4 = z.infer<typeof step4Schema>

const CONDITIONS = [
  "Diabetes",
  "Heart disease",
  "High blood pressure",
  "Osteoporosis",
  "Arthritis",
  "Fibromyalgia",
  "Cancer (current or past)",
  "Stroke",
  "Neurological condition",
  "Anxiety/Depression",
  "Pregnancy",
]

const PAIN_TYPES = [
  "Sharp",
  "Dull/Aching",
  "Burning",
  "Throbbing",
  "Shooting",
  "Tingling/Numbness",
  "Stiffness",
]

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = (step / total) * 100
  return (
    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
      <div
        className="bg-primary h-full transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function PhysioIntakeForm({
  form,
}: {
  form: {
    id: string
    answers: Record<string, unknown> | null
    status: string
  }
}) {
  const initial = (form.answers ?? {}) as Record<string, unknown>
  const [step, setStep] = useState(1)
  const [allData, setAllData] = useState<Record<string, unknown>>(initial)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      dob: String(initial.dob ?? ""),
      gender: String(initial.gender ?? ""),
      occupation: String(initial.occupation ?? ""),
      emergency_contact_name: String(initial.emergency_contact_name ?? ""),
      emergency_contact_phone: String(initial.emergency_contact_phone ?? ""),
      emergency_contact_relation: String(initial.emergency_contact_relation ?? ""),
      family_doctor: String(initial.family_doctor ?? ""),
      family_doctor_phone: String(initial.family_doctor_phone ?? ""),
      referred_by: String(initial.referred_by ?? ""),
    },
  })

  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      chief_complaint: String(initial.chief_complaint ?? ""),
      pain_location: String(initial.pain_location ?? ""),
      pain_onset: String(initial.pain_onset ?? ""),
      pain_onset_cause: String(initial.pain_onset_cause ?? ""),
      pain_scale: String(initial.pain_scale ?? ""),
      pain_type: Array.isArray(initial.pain_type)
        ? (initial.pain_type as string[])
        : [],
      pain_worse: String(initial.pain_worse ?? ""),
      pain_better: String(initial.pain_better ?? ""),
      previous_treatment: String(initial.previous_treatment ?? ""),
      previous_treatment_details: String(initial.previous_treatment_details ?? ""),
    },
  })

  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      surgeries: String(initial.surgeries ?? ""),
      fractures: String(initial.fractures ?? ""),
      medications: String(initial.medications ?? ""),
      allergies: String(initial.allergies ?? ""),
      conditions: Array.isArray(initial.conditions)
        ? (initial.conditions as string[])
        : [],
      other_conditions: String(initial.other_conditions ?? ""),
    },
  })

  const form4 = useForm<Step4>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      goals: String(initial.goals ?? ""),
      consent_treatment: Boolean(initial.consent_treatment),
      consent_privacy: Boolean(initial.consent_privacy),
      signature: String(initial.signature ?? ""),
    },
  })

  async function saveProgress(stepData: Record<string, unknown>, newStep: number) {
    const merged = { ...allData, ...stepData }
    setAllData(merged)
    const res = await fetch(`/api/intake-forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: merged, status: "in_progress" }),
    })
    if (!res.ok) {
      toast.error("Could not save progress")
      return
    }
    setStep(newStep)
  }

  async function handleFinalSubmit(step4Data: Step4) {
    setSubmitting(true)
    const finalAnswers = {
      ...allData,
      ...step4Data,
      submitted_at: new Date().toISOString(),
    }
    const res = await fetch(`/api/intake-forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: finalAnswers, status: "submitted" }),
    })
    if (res.ok) {
      toast.success("Form submitted", {
        description: "Your intake form has been sent to the clinic.",
      })
      router.push("/my-account/intake-forms")
    } else {
      toast.error("Could not submit form")
    }
    setSubmitting(false)
  }

  const painSelected = useWatch({
    control: form2.control,
    name: "pain_type",
    defaultValue: [],
  }) ?? []
  const condSelected = useWatch({
    control: form3.control,
    name: "conditions",
    defaultValue: [],
  }) ?? []

  function togglePainType(pt: string, checked: boolean) {
    const cur = form2.getValues("pain_type") ?? []
    form2.setValue(
      "pain_type",
      checked ? [...cur, pt] : cur.filter((p) => p !== pt),
      { shouldValidate: true }
    )
  }

  function toggleCondition(c: string, checked: boolean) {
    const cur = form3.getValues("conditions") ?? []
    form3.setValue(
      "conditions",
      checked ? [...cur, c] : cur.filter((x) => x !== c),
      { shouldValidate: true }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold">
          Physiotherapy intake form
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Complete all sections before your appointment. Progress is saved when
          you continue.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-muted-foreground flex justify-between text-xs">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={step === i + 1 ? "text-primary font-medium" : ""}
            >
              {s}
            </span>
          ))}
        </div>
        <ProgressBar step={step} total={STEPS.length} />
      </div>

      {step === 1 && (
        <form
          onSubmit={form1.handleSubmit((d) => void saveProgress(d, 2))}
          className="space-y-5"
        >
          <div className="bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground font-medium">Personal information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Date of birth <span className="text-destructive">*</span>
                </Label>
                <Input type="date" {...form1.register("dob")} />
                {form1.formState.errors.dob && (
                  <p className="text-destructive text-xs">
                    {form1.formState.errors.dob.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>
                  Gender <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={form1.control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form1.formState.errors.gender && (
                  <p className="text-destructive text-xs">
                    {form1.formState.errors.gender.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                Occupation <span className="text-destructive">*</span>
              </Label>
              <Input
                {...form1.register("occupation")}
                placeholder="e.g. Office worker, Nurse"
              />
              {form1.formState.errors.occupation && (
                <p className="text-destructive text-xs">
                  {form1.formState.errors.occupation.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Family doctor / GP (optional)</Label>
              <Input {...form1.register("family_doctor")} placeholder="Dr. Name" />
            </div>
            <div className="space-y-1">
              <Label>Family doctor phone (optional)</Label>
              <Input {...form1.register("family_doctor_phone")} type="tel" />
            </div>
            <div className="space-y-1">
              <Label>How did you hear about us? (optional)</Label>
              <Input {...form1.register("referred_by")} />
            </div>
          </div>

          <div className="bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground font-medium">
              Emergency contact <span className="text-destructive">*</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input {...form1.register("emergency_contact_name")} />
                {form1.formState.errors.emergency_contact_name && (
                  <p className="text-destructive text-xs">
                    {form1.formState.errors.emergency_contact_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Relationship</Label>
                <Input {...form1.register("emergency_contact_relation")} />
                {form1.formState.errors.emergency_contact_relation && (
                  <p className="text-destructive text-xs">
                    {form1.formState.errors.emergency_contact_relation.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Phone number</Label>
              <Input {...form1.register("emergency_contact_phone")} type="tel" />
              {form1.formState.errors.emergency_contact_phone && (
                <p className="text-destructive text-xs">
                  {form1.formState.errors.emergency_contact_phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">
              Next <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={form2.handleSubmit((d) => void saveProgress(d, 3))}
          className="space-y-5"
        >
          <div className="bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground font-medium">Current condition</h2>
            <div className="space-y-1">
              <Label>
                Main concern today <span className="text-destructive">*</span>
              </Label>
              <Textarea {...form2.register("chief_complaint")} rows={3} />
              {form2.formState.errors.chief_complaint && (
                <p className="text-destructive text-xs">
                  {form2.formState.errors.chief_complaint.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>
                Location of pain/problem <span className="text-destructive">*</span>
              </Label>
              <Input {...form2.register("pain_location")} />
              {form2.formState.errors.pain_location && (
                <p className="text-destructive text-xs">
                  {form2.formState.errors.pain_location.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  When did it start? <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={form2.control}
                  name="pain_onset"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this-week">This week</SelectItem>
                        <SelectItem value="this-month">This month</SelectItem>
                        <SelectItem value="1-3months">1–3 months ago</SelectItem>
                        <SelectItem value="3-6months">3–6 months ago</SelectItem>
                        <SelectItem value="6-12months">6–12 months ago</SelectItem>
                        <SelectItem value="over-1year">Over 1 year ago</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form2.formState.errors.pain_onset && (
                  <p className="text-destructive text-xs">
                    {form2.formState.errors.pain_onset.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>
                  Pain intensity (0–10) <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={form2.control}
                  name="pain_scale"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form2.formState.errors.pain_scale && (
                  <p className="text-destructive text-xs">
                    {form2.formState.errors.pain_scale.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>What caused it? (optional)</Label>
              <Input {...form2.register("pain_onset_cause")} />
            </div>
            <div className="space-y-2">
              <Label>
                Type of pain/sensation <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {PAIN_TYPES.map((pt) => (
                  <div key={pt} className="flex items-center gap-2">
                    <Checkbox
                      id={`pain-${pt}`}
                      checked={painSelected.includes(pt)}
                      onCheckedChange={(c) => togglePainType(pt, c === true)}
                    />
                    <label htmlFor={`pain-${pt}`} className="cursor-pointer text-sm">
                      {pt}
                    </label>
                  </div>
                ))}
              </div>
              {form2.formState.errors.pain_type && (
                <p className="text-destructive text-xs">
                  {form2.formState.errors.pain_type.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>What makes it worse? (optional)</Label>
                <Input {...form2.register("pain_worse")} />
              </div>
              <div className="space-y-1">
                <Label>What makes it better? (optional)</Label>
                <Input {...form2.register("pain_better")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                Previous treatment for this? <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form2.control}
                name="previous_treatment"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form2.formState.errors.previous_treatment && (
                <p className="text-destructive text-xs">
                  {form2.formState.errors.previous_treatment.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>If yes, describe (optional)</Label>
              <Textarea {...form2.register("previous_treatment_details")} rows={2} />
            </div>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 size-4" /> Back
            </Button>
            <Button type="submit">
              Next <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={form3.handleSubmit((d) => void saveProgress(d, 4))}
          className="space-y-5"
        >
          <div className="bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground font-medium">Health history</h2>
            <div className="space-y-1">
              <Label>
                Previous surgeries <span className="text-destructive">*</span>
              </Label>
              <Textarea {...form3.register("surgeries")} rows={2} />
              {form3.formState.errors.surgeries && (
                <p className="text-destructive text-xs">
                  {form3.formState.errors.surgeries.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>
                Fractures or injuries <span className="text-destructive">*</span>
              </Label>
              <Textarea {...form3.register("fractures")} rows={2} />
              {form3.formState.errors.fractures && (
                <p className="text-destructive text-xs">
                  {form3.formState.errors.fractures.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>
                Current medications <span className="text-destructive">*</span>
              </Label>
              <Textarea {...form3.register("medications")} rows={2} />
              {form3.formState.errors.medications && (
                <p className="text-destructive text-xs">
                  {form3.formState.errors.medications.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>
                Known allergies <span className="text-destructive">*</span>
              </Label>
              <Input {...form3.register("allergies")} />
              {form3.formState.errors.allergies && (
                <p className="text-destructive text-xs">
                  {form3.formState.errors.allergies.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Conditions (check all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITIONS.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <Checkbox
                      id={`cond-${c}`}
                      checked={condSelected.includes(c)}
                      onCheckedChange={(ch) => toggleCondition(c, ch === true)}
                    />
                    <label htmlFor={`cond-${c}`} className="cursor-pointer text-sm">
                      {c}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Other conditions (optional)</Label>
              <Textarea {...form3.register("other_conditions")} rows={2} />
            </div>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1 size-4" /> Back
            </Button>
            <Button type="submit">
              Next <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form
          onSubmit={form4.handleSubmit((d) => void handleFinalSubmit(d))}
          className="space-y-5"
        >
          <div className="bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground font-medium">Goals and consent</h2>
            <div className="space-y-1">
              <Label>
                Goals for physiotherapy <span className="text-destructive">*</span>
              </Label>
              <Textarea {...form4.register("goals")} rows={3} />
              {form4.formState.errors.goals && (
                <p className="text-destructive text-xs">
                  {form4.formState.errors.goals.message}
                </p>
              )}
            </div>
            <div className="space-y-3 pt-2">
              <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
                <Controller
                  control={form4.control}
                  name="consent_treatment"
                  render={({ field }) => (
                    <Checkbox
                      id="consent-treatment"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <div>
                  <label htmlFor="consent-treatment" className="cursor-pointer text-sm font-medium">
                    I consent to physiotherapy assessment and treatment{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  {form4.formState.errors.consent_treatment && (
                    <p className="text-destructive mt-1 text-xs">
                      {form4.formState.errors.consent_treatment.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
                <Controller
                  control={form4.control}
                  name="consent_privacy"
                  render={({ field }) => (
                    <Checkbox
                      id="consent-privacy"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <div>
                  <label htmlFor="consent-privacy" className="cursor-pointer text-sm font-medium">
                    I acknowledge the privacy policy{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  {form4.formState.errors.consent_privacy && (
                    <p className="text-destructive mt-1 text-xs">
                      {form4.formState.errors.consent_privacy.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                Electronic signature — type your full name{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input {...form4.register("signature")} placeholder="Your full legal name" />
              <p className="text-muted-foreground text-xs">
                By typing your name you electronically sign this form. Date:{" "}
                {new Date().toLocaleDateString()}
              </p>
              {form4.formState.errors.signature && (
                <p className="text-destructive text-xs">
                  {form4.formState.errors.signature.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              <ChevronLeft className="mr-1 size-4" /> Back
            </Button>
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? "Submitting…" : "Submit intake form"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
