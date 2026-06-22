-- Destructive: all patient records, dependent public data, patient_accounts,
-- and auth.users that had a patient_accounts row (patient portal logins only).

CREATE TEMP TABLE _portal_auth_users (user_id uuid PRIMARY KEY);
INSERT INTO _portal_auth_users (user_id)
SELECT DISTINCT user_id FROM public.patient_accounts;

DELETE FROM public.intake_form_submissions;

DELETE FROM public.appointments;

DELETE FROM public.patient_documents;
DELETE FROM public.intake_forms;
DELETE FROM public.messages;
DELETE FROM public.patient_notes;

UPDATE public.practitioner_reviews SET patient_id = NULL WHERE patient_id IS NOT NULL;

DELETE FROM public.patient_accounts;

DELETE FROM public.patients;

DELETE FROM auth.users u
USING _portal_auth_users p
WHERE u.id = p.user_id;
