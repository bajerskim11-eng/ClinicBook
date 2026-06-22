-- Demo bootstrap: clinic row, booking graph (when missing), and auth users.
--
-- Local dev credentials (change or remove in production):
--   Admin dashboard : admin@harbourviewwellness.demo / DemoClinic123!
--   Practitioner    : sarah.chen@harbourviewwellness.demo / DemoClinic123!

INSERT INTO public.clinics (name, slug, address, phone, email, timezone)
VALUES (
  'Harbourview Wellness Clinic',
  'demo-clinic',
  '218 Queens Quay W, Suite 400, Toronto, ON M5J 2Y6',
  '(416) 555-0142',
  'hello@harbourviewwellness.demo',
  'America/Toronto'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  timezone = EXCLUDED.timezone;

-- If demo-clinic has no practitioners (e.g. UI refresh ran before the clinic existed), seed the demo graph.
INSERT INTO public.services (clinic_id, name, description, duration_minutes, price_cents, buffer_minutes, color, is_online_bookable, is_active)
SELECT c.id, v.name, v.description, v.dur, v.price, v.buf, v.col, true, true
FROM public.clinics c
CROSS JOIN (VALUES
  ('RMT massage — 60 min', 'Full-body therapeutic massage focused on tension relief.', 60, 12000, 5, '#0d9488'),
  ('Physiotherapy assessment — 45 min', 'Initial evaluation, goal-setting, and treatment plan.', 45, 15000, 5, '#2563eb'),
  ('Physiotherapy follow-up — 30 min', 'Progressive rehab and hands-on treatment.', 30, 9500, 5, '#3b82f6'),
  ('Acupuncture — 45 min', 'Traditional acupuncture for pain and stress support.', 45, 11000, 0, '#7c3aed'),
  ('Scalp & head massage — 30 min', 'Focused relief for headaches and neck tension.', 30, 7500, 5, '#db2777'),
  ('Deep tissue — 90 min', 'Intensive work on chronic tight areas.', 90, 16500, 10, '#b45309'),
  ('IMS / dry needling — 30 min', 'Intramuscular stimulation for myofascial pain.', 30, 8500, 5, '#059669'),
  ('Shockwave therapy — 20 min', 'Focused acoustic waves for tendon and soft-tissue recovery.', 20, 9000, 10, '#ca8a04'),
  ('Sports massage — 45 min', 'Pre- or post-event massage for active clients.', 45, 11500, 5, '#dc2626'),
  ('Prenatal massage — 60 min', 'Side-lying safe massage during pregnancy.', 60, 13000, 10, '#0891b2'),
  ('Initial orthotic assessment — 60 min', 'Biomechanical assessment and casting or scanning.', 60, 14000, 5, '#4f46e5'),
  ('Chiropractic adjustment — 15 min', 'Spinal and joint manual therapy visit.', 15, 6500, 5, '#65a30d')
) AS v(name, description, dur, price, buf, col)
WHERE c.slug = 'demo-clinic'
  AND NOT EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.clinic_id = c.id
  );

INSERT INTO public.practitioners (
  clinic_id, name, email, bio, color, slug, title, profile_visible, is_active
)
SELECT c.id, v.name, v.email, v.bio, v.color, v.slug, v.title, true, true
FROM public.clinics c
CROSS JOIN (VALUES
  ('Sarah Chen', 'sarah.chen@harbourviewwellness.demo', 'Registered massage therapist with a focus on stress and posture.', '#0d9488', 'sarah-chen', 'Registered Massage Therapist (RMT)'),
  ('Marcus O''Brien', 'marcus.obrien@harbourviewwellness.demo', 'Orthopedic and sports physiotherapy; return-to-play planning.', '#2563eb', 'marcus-obrien', 'Physiotherapist'),
  ('Priya Patel', 'priya.patel@harbourviewwellness.demo', 'TCM-informed acupuncture for pain and wellness.', '#7c3aed', 'priya-patel', 'Registered Acupuncturist'),
  ('Étienne Gagnon', 'etienne.gagnon@harbourviewwellness.demo', 'Gentle adjustments and exercise prescription.', '#65a30d', 'etienne-gagnon', 'Chiropractor'),
  ('Mei Wong', 'mei.wong@harbourviewwellness.demo', 'Therapeutic and relaxation massage.', '#0891b2', 'mei-wong', 'Registered Massage Therapist (RMT)'),
  ('Jordan Kowalski', 'jordan.kowalski@harbourviewwellness.demo', 'Post-surgical rehab and chronic pain management.', '#3b82f6', 'jordan-kowalski', 'Physiotherapist'),
  ('Aisha Hassan', 'aisha.hassan@harbourviewwellness.demo', 'Deep tissue and myofascial release specialist.', '#db2777', 'aisha-hassan', 'Registered Massage Therapist (RMT)'),
  ('Tyler MacDonald', 'tyler.macdonald@harbourviewwellness.demo', 'Field coverage and athletic therapy for active clients.', '#dc2626', 'tyler-macdonald', 'Certified Athletic Therapist'),
  ('Rebecca Stone', 'rebecca.stone@harbourviewwellness.demo', 'Evidence-based chiropractic and soft-tissue care.', '#4f46e5', 'rebecca-stone', 'Chiropractor'),
  ('Liam Tremblay', 'liam.tremblay@harbourviewwellness.demo', 'Swedish and therapeutic massage for everyday athletes.', '#b45309', 'liam-tremblay', 'Massage Therapist')
) AS v(name, email, bio, color, slug, title)
WHERE c.slug = 'demo-clinic'
  AND NOT EXISTS (
    SELECT 1
    FROM public.practitioners p
    WHERE p.clinic_id = c.id
  );

INSERT INTO public.practitioner_services (practitioner_id, service_id)
SELECT p.id, s.id
FROM public.practitioners p
JOIN public.services s ON s.clinic_id = p.clinic_id
WHERE p.clinic_id = (SELECT id FROM public.clinics WHERE slug = 'demo-clinic' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1
    FROM public.practitioner_services ps
    WHERE ps.practitioner_id = p.id
  )
  AND (
    (p.slug = 'sarah-chen' AND s.name IN (
      'RMT massage — 60 min', 'Scalp & head massage — 30 min', 'Deep tissue — 90 min',
      'Sports massage — 45 min', 'Prenatal massage — 60 min', 'Chiropractic adjustment — 15 min'
    ))
    OR (p.slug = 'marcus-obrien' AND s.name IN (
      'Physiotherapy assessment — 45 min', 'Physiotherapy follow-up — 30 min', 'IMS / dry needling — 30 min',
      'Shockwave therapy — 20 min', 'Initial orthotic assessment — 60 min', 'Sports massage — 45 min'
    ))
    OR (p.slug = 'priya-patel' AND s.name IN (
      'Acupuncture — 45 min', 'Scalp & head massage — 30 min', 'Physiotherapy follow-up — 30 min'
    ))
    OR (p.slug = 'etienne-gagnon' AND s.name IN (
      'Chiropractic adjustment — 15 min', 'IMS / dry needling — 30 min', 'Physiotherapy follow-up — 30 min'
    ))
    OR (p.slug = 'mei-wong' AND s.name IN (
      'RMT massage — 60 min', 'Prenatal massage — 60 min', 'Scalp & head massage — 30 min', 'Sports massage — 45 min'
    ))
    OR (p.slug = 'jordan-kowalski' AND s.name IN (
      'Physiotherapy assessment — 45 min', 'Physiotherapy follow-up — 30 min', 'Shockwave therapy — 20 min',
      'Initial orthotic assessment — 60 min', 'Deep tissue — 90 min'
    ))
    OR (p.slug = 'aisha-hassan' AND s.name IN (
      'Deep tissue — 90 min', 'RMT massage — 60 min', 'Sports massage — 45 min', 'IMS / dry needling — 30 min'
    ))
    OR (p.slug = 'tyler-macdonald' AND s.name IN (
      'Sports massage — 45 min', 'Physiotherapy follow-up — 30 min', 'Deep tissue — 90 min',
      'Shockwave therapy — 20 min', 'Chiropractic adjustment — 15 min'
    ))
    OR (p.slug = 'rebecca-stone' AND s.name IN (
      'Chiropractic adjustment — 15 min', 'Physiotherapy assessment — 45 min', 'IMS / dry needling — 30 min',
      'Initial orthotic assessment — 60 min'
    ))
    OR (p.slug = 'liam-tremblay' AND s.name IN (
      'RMT massage — 60 min', 'Scalp & head massage — 30 min', 'Sports massage — 45 min',
      'Prenatal massage — 60 min', 'Shockwave therapy — 20 min'
    ))
  );

INSERT INTO public.schedules (practitioner_id, day_of_week, start_time, end_time, is_active)
SELECT p.id, d.dow, '09:00'::time, '17:00'::time, true
FROM public.practitioners p
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS d(dow)
WHERE p.clinic_id = (SELECT id FROM public.clinics WHERE slug = 'demo-clinic' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.practitioner_id = p.id
  );

DO $$
DECLARE
  admin_user_id uuid := 'b0000001-0000-4000-8000-000000000001';
  pract_user_id uuid := 'b0000002-0000-4000-8000-000000000002';
  demo_password text := 'DemoClinic123!';
  admin_email text := 'admin@harbourviewwellness.demo';
  pract_email text := 'sarah.chen@harbourviewwellness.demo';
  demo_clinic_id uuid;
  sarah_practitioner_id uuid;
  password_hash text;
BEGIN
  SELECT id INTO demo_clinic_id
  FROM public.clinics
  WHERE slug = 'demo-clinic'
  LIMIT 1;

  IF demo_clinic_id IS NULL THEN
    RAISE EXCEPTION 'demo-clinic row missing after upsert';
  END IF;

  password_hash := extensions.crypt(demo_password, extensions.gen_salt('bf'));

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      password_hash,
      now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"full_name":"Demo Admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      admin_user_id,
      jsonb_build_object('sub', admin_user_id::text, 'email', admin_email),
      'email',
      admin_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  SELECT p.id INTO sarah_practitioner_id
  FROM public.practitioners p
  WHERE p.clinic_id = demo_clinic_id
    AND p.slug = 'sarah-chen'
  LIMIT 1;

  IF sarah_practitioner_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users WHERE email = pract_email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      pract_user_id,
      'authenticated',
      'authenticated',
      pract_email,
      password_hash,
      now(),
      '{"provider":"email","providers":["email"],"role":"practitioner"}'::jsonb,
      '{"full_name":"Sarah Chen"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      pract_user_id,
      pract_user_id,
      jsonb_build_object('sub', pract_user_id::text, 'email', pract_email),
      'email',
      pract_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  IF sarah_practitioner_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM auth.users WHERE email = pract_email)
     AND NOT EXISTS (
       SELECT 1
       FROM public.practitioner_accounts pa
       WHERE pa.practitioner_id = sarah_practitioner_id
     ) THEN
    INSERT INTO public.practitioner_accounts (user_id, practitioner_id, clinic_id)
    SELECT u.id, sarah_practitioner_id, demo_clinic_id
    FROM auth.users u
    WHERE u.email = pract_email;
  END IF;
END $$;
