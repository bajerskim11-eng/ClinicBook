-- Phase 10: practitioner portal auth link + online booking toggle

CREATE TABLE IF NOT EXISTS public.practitioner_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES public.practitioners (id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT practitioner_accounts_user_id_key UNIQUE (user_id),
  CONSTRAINT practitioner_accounts_practitioner_id_key UNIQUE (practitioner_id)
);

CREATE INDEX IF NOT EXISTS practitioner_accounts_user_id_idx ON public.practitioner_accounts (user_id);

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS accepts_online_bookings boolean NOT NULL DEFAULT true;

ALTER TABLE public.practitioner_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_accounts own select"
  ON public.practitioner_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.practitioner_accounts IS 'Links Supabase auth users to practitioners for the staff portal';
