import { z } from "zod";

/** Query params for GET /api/availability (Phase 2) */
export const availabilityQuerySchema = z
  .object({
    practitionerId: z.string().uuid(),
    serviceId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .or(
    z.object({
      practitionerId: z.string().uuid(),
      serviceId: z.string().uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    })
  );

export const holdCreateSchema = z.object({
  practitionerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startDatetime: z.string().min(1),
  sessionToken: z.string().min(1),
});

export const bookSchema = z.object({
  holdId: z.string().uuid(),
  sessionToken: z.string().min(1),
  clinicId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
