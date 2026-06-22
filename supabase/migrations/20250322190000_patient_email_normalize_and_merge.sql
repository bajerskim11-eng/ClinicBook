-- Merge duplicate patients (same clinic + case-insensitive email), normalize emails, enforce on write.

CREATE TEMP TABLE _patient_redirect (old_id uuid PRIMARY KEY, new_id uuid NOT NULL);

INSERT INTO _patient_redirect (old_id, new_id)
SELECT p.id AS old_id, x.keep_id AS new_id
FROM patients p
INNER JOIN (
  SELECT
    clinic_id,
    lower(btrim(email)) AS em,
    (array_agg(id ORDER BY created_at NULLS LAST, id))[1] AS keep_id
  FROM patients
  GROUP BY clinic_id, lower(btrim(email))
  HAVING count(*) > 1
) x ON p.clinic_id = x.clinic_id AND lower(btrim(p.email)) = x.em
WHERE p.id <> x.keep_id;

UPDATE appointments a
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE a.patient_id = r.old_id;

UPDATE patient_accounts a
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE a.patient_id = r.old_id;

UPDATE patient_documents d
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE d.patient_id = r.old_id;

UPDATE intake_forms f
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE f.patient_id = r.old_id;

UPDATE messages m
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE m.patient_id = r.old_id;

UPDATE intake_form_submissions s
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE s.patient_id = r.old_id;

UPDATE patient_notes n
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE n.patient_id = r.old_id;

UPDATE practitioner_reviews rev
SET patient_id = r.new_id
FROM _patient_redirect r
WHERE rev.patient_id = r.old_id;

DELETE FROM patients WHERE id IN (SELECT old_id FROM _patient_redirect);

DELETE FROM patient_accounts pa
WHERE pa.id IN (
  SELECT id FROM (
    SELECT id,
      row_number() OVER (PARTITION BY user_id, clinic_id ORDER BY created_at NULLS LAST, id) AS rn
    FROM patient_accounts
  ) sub
  WHERE rn > 1
);

UPDATE patients SET email = lower(btrim(email)) WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.patients_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS patients_normalize_email_trigger ON public.patients;
CREATE TRIGGER patients_normalize_email_trigger
BEFORE INSERT OR UPDATE OF email ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.patients_normalize_email();

CREATE OR REPLACE FUNCTION public.practitioners_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    IF btrim(NEW.email) = '' THEN
      NEW.email := NULL;
    ELSE
      NEW.email := lower(btrim(NEW.email));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioners_normalize_email_trigger ON public.practitioners;
CREATE TRIGGER practitioners_normalize_email_trigger
BEFORE INSERT OR UPDATE OF email ON public.practitioners
FOR EACH ROW
EXECUTE FUNCTION public.practitioners_normalize_email();
