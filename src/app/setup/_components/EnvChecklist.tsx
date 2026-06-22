"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const REQUIRED_VARS = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
CRON_SECRET=<generate a long random string>
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM="Your Clinic <noreply@your-domain.com>"`

const PLATFORMS = [
  {
    id: "vercel",
    label: "Vercel",
    instructions:
      "Project Settings → Environment Variables → add each key/value, then redeploy (env changes require a new deploy to take effect).",
  },
  {
    id: "docker",
    label: "Docker / VPS",
    instructions:
      "Copy .env.example to .env.local (or .env), fill in the values, then restart the container: docker compose up -d --build.",
  },
  {
    id: "other",
    label: "Other",
    instructions:
      "Set these as environment variables in your hosting platform's dashboard or process manager, then restart/redeploy the app.",
  },
] as const

export function EnvChecklist() {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("vercel")
  const [copied, setCopied] = useState(false)
  const active = PLATFORMS.find((p) => p.id === platform)!

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment variables</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={platform === p.id ? "default" : "outline"}
              onClick={() => setPlatform(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{active.instructions}</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            {REQUIRED_VARS}
          </pre>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="absolute top-2 right-2"
            onClick={() => {
              navigator.clipboard.writeText(REQUIRED_VARS)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
