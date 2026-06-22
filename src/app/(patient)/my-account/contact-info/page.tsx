"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { zodEmail, zodPersonName } from "@/lib/validation"

const CANADIAN_PROVINCES = [
  "British Columbia",
  "Alberta",
  "Saskatchewan",
  "Manitoba",
  "Ontario",
  "Quebec",
  "Nova Scotia",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
  "Northwest Territories",
  "Nunavut",
  "Yukon",
]

const PHONE_PREFIXES = [
  { label: "Canada (+1)", value: "+1-ca" },
  { label: "United States (+1)", value: "+1-us" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "Ireland (+353)", value: "+353" },
  { label: "Australia (+61)", value: "+61" },
]

const schema = z.object({
  first_name: zodPersonName,
  last_name: zodPersonName,
  preferred_name: z.string().max(80).optional(),
  pronouns: z.string().max(40).optional(),
  email: zodEmail,
  phone: z.string().max(40).optional(),
  home_phone: z.string().max(40).optional(),
  work_phone: z.string().max(40).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  province: z.string().max(40).optional(),
  postal_code: z.string().max(16).optional(),
  country: z.string().max(80).optional(),
})

type FormData = z.infer<typeof schema>

export default function ContactInfoPage() {
  const [patientId, setPatientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "Canada" },
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data: account } = await supabase
        .from("patient_accounts")
        .select("patient_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!account?.patient_id || cancelled) {
        if (!cancelled) setLoading(false)
        return
      }
      setPatientId(account.patient_id)

      const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("id", account.patient_id)
        .single()

      if (patient && !cancelled) {
        reset({
          ...patient,
          country: patient.country ?? "Canada",
        } as FormData)
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [supabase, reset])

  function emptyToNull(s: string | undefined) {
    const t = s?.trim()
    return t === "" || t === undefined ? null : t
  }

  async function onSubmit(data: FormData) {
    if (!patientId) return
    setSaving(true)
    const payload = {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      preferred_name: emptyToNull(data.preferred_name),
      pronouns: emptyToNull(data.pronouns),
      email: data.email,
      phone: emptyToNull(data.phone),
      home_phone: emptyToNull(data.home_phone),
      work_phone: emptyToNull(data.work_phone),
      address: emptyToNull(data.address),
      city: emptyToNull(data.city),
      province: emptyToNull(data.province),
      postal_code: emptyToNull(data.postal_code),
      country: emptyToNull(data.country) ?? "Canada",
    }
    const { error } = await supabase
      .from("patients")
      .update(payload)
      .eq("id", patientId)
    if (error) {
      toast.error("Could not save", { description: error.message })
    } else {
      toast.success("Contact info updated")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-foreground font-semibold">Contact info</h2>

      <div className="bg-card space-y-4 rounded-xl border p-5">
        <h3 className="text-sm font-medium">Name</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>
              First name <span className="text-destructive">*</span>
            </Label>
            <Input {...register("first_name")} />
            {errors.first_name && (
              <p className="text-destructive text-xs">Required</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>
              Last name <span className="text-destructive">*</span>
            </Label>
            <Input {...register("last_name")} />
            {errors.last_name && (
              <p className="text-destructive text-xs">Required</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Preferred name (if different)</Label>
            <Input {...register("preferred_name")} />
          </div>
          <div className="space-y-1">
            <Label>Pronouns</Label>
            <Input {...register("pronouns")} placeholder="e.g. they/them" />
          </div>
        </div>
      </div>

      <div className="bg-card space-y-4 rounded-xl border p-5">
        <h3 className="text-sm font-medium">Contact</h3>
        <div className="space-y-1">
          <Label>
            Email <span className="text-destructive">*</span>
          </Label>
          <Input {...register("email")} type="email" />
          {errors.email && (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Mobile phone</Label>
          <div className="flex gap-2">
            <select className="border-input bg-background w-52 rounded-md border px-2 py-2 text-sm">
              {PHONE_PREFIXES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <Input
              {...register("phone")}
              type="tel"
              placeholder="(416) 555-0100"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Home phone</Label>
          <div className="flex gap-2">
            <select className="border-input bg-background w-52 rounded-md border px-2 py-2 text-sm">
              {PHONE_PREFIXES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <Input {...register("home_phone")} type="tel" className="flex-1" />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Work phone</Label>
          <div className="flex gap-2">
            <select className="border-input bg-background w-52 rounded-md border px-2 py-2 text-sm">
              {PHONE_PREFIXES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <Input {...register("work_phone")} type="tel" className="flex-1" />
          </div>
        </div>
      </div>

      <div className="bg-card space-y-4 rounded-xl border p-5">
        <h3 className="text-sm font-medium">Address</h3>
        <div className="space-y-1">
          <Label>Street address</Label>
          <Input {...register("address")} placeholder="123 Main Street" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>City</Label>
            <Input {...register("city")} />
          </div>
          <div className="space-y-1">
            <Label>Province</Label>
            <Controller
              control={control}
              name="province"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANADIAN_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Postal / Zip code</Label>
            <Input {...register("postal_code")} placeholder="A1A 1A1" />
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input {...register("country")} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save contact info"
        )}
      </Button>
    </form>
  )
}
