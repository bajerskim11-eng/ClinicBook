import nodemailer from "nodemailer";

const EMAIL_FROM = process.env.EMAIL_FROM ?? '"ClinicBook" <noreply@clinicbook.dev>'

async function getTransporter() {
  const provider = process.env.EMAIL_PROVIDER ?? "ethereal"

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("Resend email: set RESEND_API_KEY in your environment")
    }
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: apiKey },
    })
  }

  if (provider === "ethereal") {
    const user = process.env.ETHEREAL_USER
    const pass = process.env.ETHEREAL_PASS
    if (!user || !pass) {
      throw new Error(
        "Ethereal email: set ETHEREAL_USER and ETHEREAL_PASS in .env.local (run scripts/setup-ethereal)"
      )
    }
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user, pass },
    })
  }

  throw new Error(`Unknown EMAIL_PROVIDER "${provider}" — use "resend" or "ethereal"`)
}

export type ClinicBrand = {
  name?: string
  logoUrl?: string | null
  primaryColor?: string | null
}

const DEFAULT_BRAND_COLOR = "#0d9488"

function brandHeader(brand?: ClinicBrand) {
  const color = brand?.primaryColor || DEFAULT_BRAND_COLOR
  const logo = brand?.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.name ?? ""}" height="40" style="display:block;margin-bottom:12px;" />`
    : ""
  return { color, logo }
}

export async function sendConfirmationEmail({
  to,
  patientName,
  serviceName,
  practitionerName,
  startDatetime,
  appointmentId,
  clinic,
}: {
  to: string
  patientName: string
  serviceName: string
  practitionerName: string
  startDatetime: string
  appointmentId: string
  clinic?: ClinicBrand
}) {
  const transporter = await getTransporter()
  const { color, logo } = brandHeader(clinic)

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `Booking confirmed — ${serviceName}`,
    html: `
      ${logo}
      <h2 style="color:${color}">Your appointment is confirmed!</h2>
      <p>Hi ${patientName},</p>
      <p>Your appointment has been booked:</p>
      <ul>
        <li><strong>Service:</strong> ${serviceName}</li>
        <li><strong>Practitioner:</strong> ${practitionerName}</li>
        <li><strong>When:</strong> ${new Date(startDatetime).toLocaleString()}</li>
      </ul>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${appointmentId}" style="color:${color}">
          Manage your appointment
        </a>
      </p>
    `,
  })

  if (process.env.EMAIL_PROVIDER === "ethereal") {
    console.log("[EMAIL] Preview URL:", nodemailer.getTestMessageUrl(info))
  }
}

export async function sendReminderEmail({
  to,
  patientName,
  serviceName,
  startDatetime,
  appointmentId,
  practitionerName,
  kind,
  clinic,
}: {
  to: string
  patientName: string
  serviceName: string
  startDatetime: string
  appointmentId: string
  practitionerName?: string
  kind: "24h" | "1h"
  clinic?: ClinicBrand
}) {
  const transporter = await getTransporter()
  const { color, logo } = brandHeader(clinic)
  const when = new Date(startDatetime).toLocaleString()
  const who =
    practitionerName && practitionerName.length > 0
      ? `<p><strong>Practitioner:</strong> ${practitionerName}</p>`
      : ""
  const subject =
    kind === "24h"
      ? `Reminder: ${serviceName} in 24 hours`
      : `Reminder: ${serviceName} in 1 hour`
  const lead =
    kind === "24h"
      ? "Your appointment is coming up in about 24 hours."
      : "Your appointment is coming up in about 1 hour."

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html: `
      ${logo}
      <h2 style="color:${color}">Appointment reminder</h2>
      <p>Hi ${patientName},</p>
      <p>${lead}</p>
      <p><strong>${serviceName}</strong></p>
      ${who}
      <p><strong>When:</strong> ${when}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${appointmentId}" style="color:${color}">View or cancel</a></p>
    `,
  })

  if (process.env.EMAIL_PROVIDER === "ethereal") {
    console.log("[EMAIL reminder] Preview URL:", nodemailer.getTestMessageUrl(info))
  }
}

export async function sendSMS(phone: string, message: string) {
  if (process.env.SMS_PROVIDER === "console") {
    console.log(`[SMS → ${phone}]: ${message}`)
    return
  }
}

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")

export async function sendIntakeFormAssignedEmail({
  to,
  firstName,
}: {
  to: string
  firstName: string
}) {
  const transporter = await getTransporter()
  const link = `${appUrl()}/my-account/intake-forms`
  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: "Action required: complete your intake form",
    html: `
      <h2>Please complete your intake form</h2>
      <p>Hi ${firstName},</p>
      <p>Your clinic has assigned an intake form for you to complete before your appointment.</p>
      <p><a href="${link}">Open your intake forms</a></p>
    `,
  })
  if (process.env.EMAIL_PROVIDER === "ethereal") {
    console.log("[EMAIL intake] Preview URL:", nodemailer.getTestMessageUrl(info))
  }
}
