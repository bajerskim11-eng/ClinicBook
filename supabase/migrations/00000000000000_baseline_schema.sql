--
-- PostgreSQL database dump
--


-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: patients_normalize_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.patients_normalize_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: practitioners_normalize_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.practitioners_normalize_email() RETURNS trigger
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    clinic_id uuid NOT NULL,
    practitioner_id uuid NOT NULL,
    service_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    status text DEFAULT 'booked'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    reminder_24h_sent_at timestamp with time zone,
    reminder_1h_sent_at timestamp with time zone,
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['booked'::text, 'confirmed'::text, 'cancelled'::text, 'no_show'::text, 'completed'::text])))
);


--
-- Name: clinic_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    date date NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: clinics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    address text,
    phone text,
    email text,
    logo_url text,
    timezone text DEFAULT 'America/Toronto'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: intake_form_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_form_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    appointment_id uuid,
    form_type text DEFAULT 'physio_intake'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb,
    assigned_at timestamp with time zone DEFAULT now(),
    submitted_at timestamp with time zone,
    assigned_by uuid,
    CONSTRAINT intake_form_submissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'submitted'::text])))
);


--
-- Name: intake_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    form_name text NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb,
    submitted_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    sender text NOT NULL,
    body text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT messages_sender_check CHECK ((sender = ANY (ARRAY['patient'::text, 'clinic'::text])))
);


--
-- Name: patient_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: patient_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    name text NOT NULL,
    file_url text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: patient_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    author_id uuid,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    clinic_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    preferred_name text,
    pronouns text,
    home_phone text,
    work_phone text,
    address text,
    city text,
    province text,
    postal_code text,
    country text DEFAULT 'Canada'::text,
    notif_email_reminders boolean DEFAULT true,
    notif_reminder_timing text DEFAULT '24h'::text,
    notif_confirmations boolean DEFAULT true,
    notif_marketing boolean DEFAULT true,
    CONSTRAINT patients_notif_reminder_timing_check CHECK (((notif_reminder_timing IS NULL) OR (notif_reminder_timing = ANY (ARRAY['1h'::text, '2h'::text, '24h'::text, 'both'::text]))))
);


--
-- Name: practitioner_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioner_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    practitioner_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE practitioner_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.practitioner_accounts IS 'Links Supabase auth users to practitioners for the staff portal';


--
-- Name: practitioner_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioner_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    practitioner_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid,
    rating integer NOT NULL,
    body text,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT practitioner_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: practitioner_service_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioner_service_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    practitioner_id uuid NOT NULL,
    service_id uuid NOT NULL,
    price_cents integer NOT NULL,
    label text,
    duration_minutes integer
);


--
-- Name: practitioner_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioner_services (
    practitioner_id uuid NOT NULL,
    service_id uuid NOT NULL
);


--
-- Name: practitioners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioners (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    clinic_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    bio text,
    avatar_url text,
    color text DEFAULT '#3B82F6'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    slug text,
    title text,
    designation text,
    registration_no text,
    years_experience integer,
    languages text[] DEFAULT '{}'::text[],
    specialties text[] DEFAULT '{}'::text[],
    education jsonb DEFAULT '[]'::jsonb,
    certifications jsonb DEFAULT '[]'::jsonb,
    approach text,
    profile_visible boolean DEFAULT true,
    booking_link_label text DEFAULT 'Book an appointment'::text,
    header_image_url text,
    accepts_online_bookings boolean DEFAULT true NOT NULL
);


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedules (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    practitioner_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    CONSTRAINT schedules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    clinic_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer DEFAULT 60 NOT NULL,
    price_cents integer DEFAULT 0 NOT NULL,
    buffer_minutes integer DEFAULT 0 NOT NULL,
    color text DEFAULT '#10B981'::text,
    is_active boolean DEFAULT true,
    is_online_bookable boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: slot_holds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slot_holds (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    practitioner_id uuid NOT NULL,
    service_id uuid NOT NULL,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    session_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: time_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_blocks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    practitioner_id uuid NOT NULL,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_practitioner_id_start_datetime_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_practitioner_id_start_datetime_key UNIQUE (practitioner_id, start_datetime);


--
-- Name: clinic_holidays clinic_holidays_clinic_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_clinic_id_date_key UNIQUE (clinic_id, date);


--
-- Name: clinic_holidays clinic_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_pkey PRIMARY KEY (id);


--
-- Name: clinics clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);


--
-- Name: clinics clinics_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_slug_key UNIQUE (slug);


--
-- Name: intake_form_submissions intake_form_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_form_submissions
    ADD CONSTRAINT intake_form_submissions_pkey PRIMARY KEY (id);


--
-- Name: intake_forms intake_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_forms
    ADD CONSTRAINT intake_forms_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: patient_accounts patient_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_accounts
    ADD CONSTRAINT patient_accounts_pkey PRIMARY KEY (id);


--
-- Name: patient_accounts patient_accounts_user_id_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_accounts
    ADD CONSTRAINT patient_accounts_user_id_clinic_id_key UNIQUE (user_id, clinic_id);


--
-- Name: patient_documents patient_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_documents
    ADD CONSTRAINT patient_documents_pkey PRIMARY KEY (id);


--
-- Name: patient_notes patient_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_pkey PRIMARY KEY (id);


--
-- Name: patients patients_clinic_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_clinic_id_email_key UNIQUE (clinic_id, email);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: practitioner_accounts practitioner_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_accounts
    ADD CONSTRAINT practitioner_accounts_pkey PRIMARY KEY (id);


--
-- Name: practitioner_accounts practitioner_accounts_practitioner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_accounts
    ADD CONSTRAINT practitioner_accounts_practitioner_id_key UNIQUE (practitioner_id);


--
-- Name: practitioner_accounts practitioner_accounts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_accounts
    ADD CONSTRAINT practitioner_accounts_user_id_key UNIQUE (user_id);


--
-- Name: practitioner_reviews practitioner_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_reviews
    ADD CONSTRAINT practitioner_reviews_pkey PRIMARY KEY (id);


--
-- Name: practitioner_service_pricing practitioner_service_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_service_pricing
    ADD CONSTRAINT practitioner_service_pricing_pkey PRIMARY KEY (id);


--
-- Name: practitioner_service_pricing practitioner_service_pricing_practitioner_id_service_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_service_pricing
    ADD CONSTRAINT practitioner_service_pricing_practitioner_id_service_id_key UNIQUE (practitioner_id, service_id);


--
-- Name: practitioner_services practitioner_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_services
    ADD CONSTRAINT practitioner_services_pkey PRIMARY KEY (practitioner_id, service_id);


--
-- Name: practitioners practitioners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioners
    ADD CONSTRAINT practitioners_pkey PRIMARY KEY (id);


--
-- Name: practitioners practitioners_slug_clinic_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioners
    ADD CONSTRAINT practitioners_slug_clinic_unique UNIQUE (clinic_id, slug);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_practitioner_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_practitioner_id_day_of_week_key UNIQUE (practitioner_id, day_of_week);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: slot_holds slot_holds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_holds
    ADD CONSTRAINT slot_holds_pkey PRIMARY KEY (id);


--
-- Name: time_blocks time_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_blocks
    ADD CONSTRAINT time_blocks_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_practitioner_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_practitioner_start ON public.appointments USING btree (practitioner_id, start_datetime);


--
-- Name: idx_intake_clinic_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_clinic_patient ON public.intake_form_submissions USING btree (clinic_id, patient_id);


--
-- Name: idx_practitioner_reviews_practitioner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practitioner_reviews_practitioner ON public.practitioner_reviews USING btree (practitioner_id);


--
-- Name: idx_practitioner_service_pricing_practitioner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practitioner_service_pricing_practitioner ON public.practitioner_service_pricing USING btree (practitioner_id);


--
-- Name: idx_slot_holds_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slot_holds_expires ON public.slot_holds USING btree (expires_at);


--
-- Name: idx_slot_holds_practitioner_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slot_holds_practitioner_start ON public.slot_holds USING btree (practitioner_id, start_datetime);


--
-- Name: practitioner_accounts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practitioner_accounts_user_id_idx ON public.practitioner_accounts USING btree (user_id);


--
-- Name: patients patients_normalize_email_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER patients_normalize_email_trigger BEFORE INSERT OR UPDATE OF email ON public.patients FOR EACH ROW EXECUTE FUNCTION public.patients_normalize_email();


--
-- Name: practitioners practitioners_normalize_email_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER practitioners_normalize_email_trigger BEFORE INSERT OR UPDATE OF email ON public.practitioners FOR EACH ROW EXECUTE FUNCTION public.practitioners_normalize_email();


--
-- Name: appointments appointments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: appointments appointments_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id);


--
-- Name: appointments appointments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: clinic_holidays clinic_holidays_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: intake_form_submissions intake_form_submissions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_form_submissions
    ADD CONSTRAINT intake_form_submissions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: intake_form_submissions intake_form_submissions_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_form_submissions
    ADD CONSTRAINT intake_form_submissions_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: intake_form_submissions intake_form_submissions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_form_submissions
    ADD CONSTRAINT intake_form_submissions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: intake_form_submissions intake_form_submissions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_form_submissions
    ADD CONSTRAINT intake_form_submissions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: intake_forms intake_forms_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_forms
    ADD CONSTRAINT intake_forms_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: intake_forms intake_forms_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_forms
    ADD CONSTRAINT intake_forms_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: messages messages_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: messages messages_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_accounts patient_accounts_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_accounts
    ADD CONSTRAINT patient_accounts_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: patient_accounts patient_accounts_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_accounts
    ADD CONSTRAINT patient_accounts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: patient_accounts patient_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_accounts
    ADD CONSTRAINT patient_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: patient_documents patient_documents_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_documents
    ADD CONSTRAINT patient_documents_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: patient_documents patient_documents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_documents
    ADD CONSTRAINT patient_documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- Name: patient_notes patient_notes_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patients patients_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: practitioner_accounts practitioner_accounts_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_accounts
    ADD CONSTRAINT practitioner_accounts_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: practitioner_accounts practitioner_accounts_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_accounts
    ADD CONSTRAINT practitioner_accounts_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE CASCADE;


--
-- Name: practitioner_accounts practitioner_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_accounts
    ADD CONSTRAINT practitioner_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: practitioner_reviews practitioner_reviews_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_reviews
    ADD CONSTRAINT practitioner_reviews_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: practitioner_reviews practitioner_reviews_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_reviews
    ADD CONSTRAINT practitioner_reviews_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: practitioner_reviews practitioner_reviews_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_reviews
    ADD CONSTRAINT practitioner_reviews_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE CASCADE;


--
-- Name: practitioner_service_pricing practitioner_service_pricing_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_service_pricing
    ADD CONSTRAINT practitioner_service_pricing_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE CASCADE;


--
-- Name: practitioner_service_pricing practitioner_service_pricing_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_service_pricing
    ADD CONSTRAINT practitioner_service_pricing_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: practitioner_services practitioner_services_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_services
    ADD CONSTRAINT practitioner_services_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE CASCADE;


--
-- Name: practitioner_services practitioner_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_services
    ADD CONSTRAINT practitioner_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: practitioners practitioners_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioners
    ADD CONSTRAINT practitioners_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: schedules schedules_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE CASCADE;


--
-- Name: services services_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: slot_holds slot_holds_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_holds
    ADD CONSTRAINT slot_holds_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE CASCADE;


--
-- Name: slot_holds slot_holds_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_holds
    ADD CONSTRAINT slot_holds_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: time_blocks time_blocks_practitioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_blocks
    ADD CONSTRAINT time_blocks_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE CASCADE;


--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments appointments public insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appointments public insert" ON public.appointments FOR INSERT WITH CHECK (true);


--
-- Name: appointments appointments public select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appointments public select" ON public.appointments FOR SELECT USING (true);


--
-- Name: appointments appointments_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appointments_auth_delete ON public.appointments FOR DELETE TO authenticated USING (true);


--
-- Name: appointments appointments_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appointments_auth_update ON public.appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: clinic_holidays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinic_holidays ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_holidays clinic_holidays_authenticated_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinic_holidays_authenticated_delete ON public.clinic_holidays FOR DELETE TO authenticated USING (true);


--
-- Name: clinic_holidays clinic_holidays_authenticated_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinic_holidays_authenticated_insert ON public.clinic_holidays FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: clinic_holidays clinic_holidays_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinic_holidays_select ON public.clinic_holidays FOR SELECT USING (true);


--
-- Name: clinics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

--
-- Name: clinics clinics public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clinics public read" ON public.clinics FOR SELECT USING (true);


--
-- Name: clinics clinics_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinics_auth_update ON public.clinics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: intake_form_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intake_form_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: intake_forms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;

--
-- Name: intake_forms intake_forms_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intake_forms_own ON public.intake_forms TO authenticated USING ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL))))) WITH CHECK ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL)))));


--
-- Name: intake_form_submissions intake_submissions_authenticated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intake_submissions_authenticated_select ON public.intake_form_submissions FOR SELECT TO authenticated USING (true);


--
-- Name: intake_form_submissions intake_submissions_patient_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intake_submissions_patient_select ON public.intake_form_submissions FOR SELECT USING ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL)))));


--
-- Name: intake_form_submissions intake_submissions_patient_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intake_submissions_patient_update ON public.intake_form_submissions FOR UPDATE USING ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL))))) WITH CHECK ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL)))));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messages messages_patient_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_patient_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL)))) AND (sender = 'patient'::text)));


--
-- Name: messages messages_patient_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_patient_select ON public.messages FOR SELECT TO authenticated USING ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL)))));


--
-- Name: messages messages_patient_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_patient_update ON public.messages FOR UPDATE TO authenticated USING ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL))))) WITH CHECK ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL)))));


--
-- Name: patient_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_accounts patient_accounts_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_accounts_own ON public.patient_accounts TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: patient_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_documents patient_documents_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_documents_own_select ON public.patient_documents FOR SELECT TO authenticated USING ((patient_id IN ( SELECT patient_accounts.patient_id
   FROM public.patient_accounts
  WHERE ((patient_accounts.user_id = auth.uid()) AND (patient_accounts.patient_id IS NOT NULL)))));


--
-- Name: patient_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: patients patients public insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "patients public insert" ON public.patients FOR INSERT WITH CHECK (true);


--
-- Name: patients patients public select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "patients public select" ON public.patients FOR SELECT USING (true);


--
-- Name: patients patients_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_auth_delete ON public.patients FOR DELETE TO authenticated USING (true);


--
-- Name: patients patients_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_auth_insert ON public.patients FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: patients patients_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_auth_select ON public.patients FOR SELECT TO authenticated USING (true);


--
-- Name: patients patients_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_auth_update ON public.patients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: practitioner_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practitioner_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: practitioner_accounts practitioner_accounts own select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "practitioner_accounts own select" ON public.practitioner_accounts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: practitioner_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practitioner_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: practitioner_service_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practitioner_service_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: practitioner_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practitioner_services ENABLE ROW LEVEL SECURITY;

--
-- Name: practitioner_services practitioner_services public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "practitioner_services public read" ON public.practitioner_services FOR SELECT USING (true);


--
-- Name: practitioner_services practitioner_services_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioner_services_auth_delete ON public.practitioner_services FOR DELETE TO authenticated USING (true);


--
-- Name: practitioner_services practitioner_services_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioner_services_auth_insert ON public.practitioner_services FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: practitioner_services practitioner_services_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioner_services_auth_select ON public.practitioner_services FOR SELECT TO authenticated USING (true);


--
-- Name: practitioner_services practitioner_services_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioner_services_auth_update ON public.practitioner_services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: practitioners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

--
-- Name: practitioners practitioners public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "practitioners public read" ON public.practitioners FOR SELECT USING ((is_active = true));


--
-- Name: practitioners practitioners_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioners_auth_delete ON public.practitioners FOR DELETE TO authenticated USING (true);


--
-- Name: practitioners practitioners_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioners_auth_insert ON public.practitioners FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: practitioners practitioners_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioners_auth_select ON public.practitioners FOR SELECT TO authenticated USING (true);


--
-- Name: practitioners practitioners_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practitioners_auth_update ON public.practitioners FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: practitioner_service_pricing pricing_authenticated_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pricing_authenticated_all ON public.practitioner_service_pricing TO authenticated USING (true) WITH CHECK (true);


--
-- Name: practitioner_service_pricing pricing_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pricing_public_read ON public.practitioner_service_pricing FOR SELECT USING (true);


--
-- Name: practitioner_reviews reviews_authenticated_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_authenticated_all ON public.practitioner_reviews TO authenticated USING (true) WITH CHECK (true);


--
-- Name: practitioner_reviews reviews_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_public_read ON public.practitioner_reviews FOR SELECT USING ((is_visible = true));


--
-- Name: schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: schedules schedules public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schedules public read" ON public.schedules FOR SELECT USING ((is_active = true));


--
-- Name: schedules schedules_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedules_auth_delete ON public.schedules FOR DELETE TO authenticated USING (true);


--
-- Name: schedules schedules_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedules_auth_insert ON public.schedules FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: schedules schedules_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedules_auth_select ON public.schedules FOR SELECT TO authenticated USING (true);


--
-- Name: schedules schedules_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedules_auth_update ON public.schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: services services public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "services public read" ON public.services FOR SELECT USING (((is_active = true) AND (is_online_bookable = true)));


--
-- Name: services services_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_auth_delete ON public.services FOR DELETE TO authenticated USING (true);


--
-- Name: services services_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_auth_insert ON public.services FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: services services_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_auth_select ON public.services FOR SELECT TO authenticated USING (true);


--
-- Name: services services_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_auth_update ON public.services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: slot_holds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

--
-- Name: slot_holds slot_holds own delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "slot_holds own delete" ON public.slot_holds FOR DELETE USING (true);


--
-- Name: slot_holds slot_holds public insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "slot_holds public insert" ON public.slot_holds FOR INSERT WITH CHECK (true);


--
-- Name: slot_holds slot_holds public select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "slot_holds public select" ON public.slot_holds FOR SELECT USING (true);


--
-- Name: time_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: time_blocks time_blocks anon select none; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "time_blocks anon select none" ON public.time_blocks FOR SELECT USING (false);


--
-- Name: time_blocks time_blocks_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_blocks_auth_delete ON public.time_blocks FOR DELETE TO authenticated USING (true);


--
-- Name: time_blocks time_blocks_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_blocks_auth_insert ON public.time_blocks FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: time_blocks time_blocks_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_blocks_auth_select ON public.time_blocks FOR SELECT TO authenticated USING (true);


--
-- Name: time_blocks time_blocks_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_blocks_auth_update ON public.time_blocks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- PostgreSQL database dump complete
--


