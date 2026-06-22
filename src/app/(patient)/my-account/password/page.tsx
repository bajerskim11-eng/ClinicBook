"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z
  .object({
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(8, "At least 8 characters"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof schema>

export default function PasswordPage() {
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })
    if (error) {
      toast.error("Failed to update password", {
        description: error.message,
      })
    } else {
      toast.success("Password updated successfully")
      reset()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-sm space-y-5">
      <h2 className="text-foreground font-semibold">Change password</h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border-border bg-card space-y-4 rounded-xl border p-5 shadow-sm"
      >
        <div className="space-y-1">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              {...register("newPassword")}
              type={show ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.newPassword ? (
            <p className="text-destructive text-xs">{errors.newPassword.message}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            {...register("confirmPassword")}
            type={show ? "text" : "password"}
            placeholder="Repeat your new password"
            autoComplete="new-password"
          />
          {errors.confirmPassword ? (
            <p className="text-destructive text-xs">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  )
}
