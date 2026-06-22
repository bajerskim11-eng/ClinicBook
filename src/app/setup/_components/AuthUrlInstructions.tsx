"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthUrlInstructions() {
  const [appUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : ""
  )

  const siteUrl = appUrl || "https://your-domain.com"
  const redirectUrl = `${siteUrl}/auth/callback`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Auth URL configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          This can&apos;t be verified automatically — open your Supabase project&apos;s{" "}
          <strong>Authentication → URL Configuration</strong> page and paste these in:
        </p>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Site URL</p>
          <code className="block rounded bg-muted px-2 py-1 text-xs">{siteUrl}</code>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Redirect URLs</p>
          <code className="block rounded bg-muted px-2 py-1 text-xs">{redirectUrl}</code>
        </div>
        <p className="text-xs text-muted-foreground">
          If you skip this step, password reset and email confirmation links will redirect
          to the wrong host.
        </p>
      </CardContent>
    </Card>
  )
}
