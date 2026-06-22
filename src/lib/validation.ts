import { z } from "zod"

/** Canonical form for patient/auth emails: trim + lowercase (RFC 5321 local-part case-insensitivity). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Optional text: empty input becomes undefined (for DB null / omit). */
export function zodOptionalText(max: number): z.ZodType<string | undefined> {
  return z.preprocess(
    emptyToUndef,
    z.string().trim().max(max).optional()
  ) as z.ZodType<string | undefined>
}

export const zodEmail = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform(normalizeEmail)

export const zodPersonName = z
  .string()
  .trim()
  .min(1, "Required")
  .max(80, "Too long")

const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v

export const zodOptionalPhone: z.ZodType<string | undefined> = z.preprocess(
  emptyToUndef,
  z.string().trim().max(40).optional()
) as z.ZodType<string | undefined>

export const zodBookingNotes: z.ZodType<string | undefined> = z.preprocess(
  emptyToUndef,
  z.string().trim().max(2000).optional()
) as z.ZodType<string | undefined>

export const bookRequestSchema = z.object({
  holdId: z.string().uuid("Invalid hold"),
  sessionToken: z.string().min(1, "Missing session"),
  firstName: zodPersonName,
  lastName: zodPersonName,
  email: zodEmail,
  phone: zodOptionalPhone,
  notes: zodBookingNotes,
  // Honeypot: hidden from real users via CSS; bots that fill every field trip this.
  honeypot: z.string().optional(),
})

export const adminCreateAppointmentSchema = z.object({
  clinicId: z.string().uuid(),
  practitionerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startDatetime: z.string().min(1),
  endDatetime: z.string().min(1),
  patientFirstName: zodPersonName,
  patientLastName: zodPersonName,
  patientEmail: zodEmail,
  patientPhone: zodOptionalPhone,
  notes: zodBookingNotes,
})

export const practitionerPortalAccessSchema = z.object({
  practitionerId: z.string().uuid(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const practitionerPortalProfileSchema = z.object({
  bio: zodOptionalText(4000),
  avatar_url: zodOptionalText(2048),
  title: zodOptionalText(120),
  designation: zodOptionalText(200),
  registration_no: zodOptionalText(80),
  years_experience: z
    .union([
      z.coerce.number().int().min(0).max(80),
      z.null(),
    ])
    .optional(),
  languages: z.array(z.string().trim().max(40)).max(20).optional().nullable(),
  specialties: z.array(z.string().trim().max(120)).max(30).optional().nullable(),
  education: z
    .array(
      z.object({
        degree: z.string().trim().max(200),
        institution: z.string().trim().max(200),
        year: z.coerce.number().int().min(1950).max(2100).optional(),
      })
    )
    .max(20)
    .optional()
    .nullable(),
  certifications: z
    .array(
      z.object({
        name: z.string().trim().max(200),
        issuer: z.string().trim().max(200),
        year: z.coerce.number().int().min(1950).max(2100).optional(),
      })
    )
    .max(30)
    .optional()
    .nullable(),
  approach: zodOptionalText(4000),
  profile_visible: z.boolean().optional(),
  booking_link_label: zodOptionalText(120),
  header_image_url: zodOptionalText(2048),
})

export const practitionerAcceptsBookingsSchema = z.object({
  acceptsOnlineBookings: z.boolean(),
})

export const practitionerAppointmentStatusSchema = z.object({
  status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
})
