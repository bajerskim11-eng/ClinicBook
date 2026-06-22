export type Clinic = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
  timezone: string;
  created_at: string;
  primary_color: string;
  font_family: string | null;
  is_demo_data: boolean;
  onboarding_completed_at: string | null;
};

export type PractitionerEducation = {
  degree: string;
  institution: string;
  year?: number;
};

export type PractitionerCertification = {
  name: string;
  issuer: string;
  year?: number;
};

export type Practitioner = {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  color: string;
  is_active: boolean;
  accepts_online_bookings?: boolean;
  slug?: string | null;
  title?: string | null;
  designation?: string | null;
  registration_no?: string | null;
  years_experience?: number | null;
  languages?: string[] | null;
  specialties?: string[] | null;
  education?: PractitionerEducation[] | null;
  certifications?: PractitionerCertification[] | null;
  approach?: string | null;
  profile_visible?: boolean | null;
  booking_link_label?: string | null;
  header_image_url?: string | null;
};

/** From Supabase `practitioner_services(service_id)` join */
export type PractitionerWithServices = Practitioner & {
  practitioner_services: { service_id: string }[];
  practitioner_service_pricing?: {
    service_id: string;
    price_cents: number;
    label: string | null;
    duration_minutes: number | null;
  }[];
};

/** Profile + joined data for public team / admin editor */
export type PractitionerFull = PractitionerWithServices & {
  practitioner_service_pricing?: {
    service_id: string;
    price_cents: number;
    label: string | null;
    duration_minutes: number | null;
  }[];
};

export type Service = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  buffer_minutes: number;
  color: string;
  is_active: boolean;
  is_online_bookable: boolean;
};

export type Schedule = {
  id: string;
  practitioner_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export type TimeBlock = {
  id: string;
  practitioner_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
};

export type Patient = {
  id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  notif_email_reminders?: boolean | null;
  notif_reminder_timing?: "1h" | "2h" | "24h" | "both" | null;
  notif_confirmations?: boolean | null;
  notif_marketing?: boolean | null;
};

export type Appointment = {
  id: string;
  clinic_id: string;
  practitioner_id: string;
  service_id: string;
  patient_id: string;
  start_datetime: string;
  end_datetime: string;
  status:
    | "booked"
    | "confirmed"
    | "cancelled"
    | "no_show"
    | "completed";
  notes: string | null;
  created_at: string;
  reminder_24h_sent_at?: string | null;
  reminder_1h_sent_at?: string | null;
  practitioner?: Practitioner;
  service?: Service;
  patient?: Patient;
};

export type SlotHold = {
  id: string;
  practitioner_id: string;
  service_id: string;
  start_datetime: string;
  end_datetime: string;
  session_token: string;
  expires_at: string;
  created_at: string;
};

export type TimeSlot = {
  start: Date;
  end: Date;
  available: boolean;
};
