-- Clinic branding columns, demo-data flag, onboarding tracking, and a
-- forced-password-change flag for the seeded demo admin.
--
-- Never edit the already-shipped 20250621120000 seed migration — this file
-- only ALTERs/UPDATEs what it created.

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#0d9488',
  ADD COLUMN IF NOT EXISTS font_family text,
  ADD COLUMN IF NOT EXISTS is_demo_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;

ALTER TABLE public.clinics
  DROP CONSTRAINT IF EXISTS clinics_primary_color_format;

ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_primary_color_format
  CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$');

UPDATE public.clinics
SET is_demo_data = true
WHERE slug = 'demo-clinic';

-- Tighten clinics_auth_update: previously any authenticated user (including
-- practitioner/patient portal accounts) could write to this table. Branding
-- fields raise the stakes, so require an admin role in the JWT.
DROP POLICY IF EXISTS clinics_auth_update ON public.clinics;

CREATE POLICY clinics_auth_update ON public.clinics
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Force the seeded demo admin to change their password before reaching the
-- dashboard. Real admins created later should set this flag themselves at
-- creation time (documented in the /setup wizard and README).
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"must_change_password":true}'::jsonb
WHERE email = 'admin@harbourviewwellness.demo';
