"use client"

import Image from "next/image"
import Link from "next/link"
import { getInitials } from "@/lib/utils"
import type { PractitionerWithServices } from "@/types"

export function MeetTeamPreview({
  clinicSlug,
  practitioners,
}: {
  clinicSlug: string
  practitioners: PractitionerWithServices[]
}) {
  const visible = practitioners.filter((p) => p.profile_visible !== false).slice(0, 3)
  if (visible.length === 0) return null

  return (
    <div className="border-border mt-8 border-t pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground font-semibold">Meet our practitioners</h2>
        <Link
          href={`/book/${clinicSlug}/team`}
          className="text-primary text-sm hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((p) => (
          <Link
            key={p.id}
            href={`/book/${clinicSlug}/team/${p.slug || p.id}`}
            className="border-border bg-card hover:border-primary/30 flex items-center gap-2 rounded-xl border p-3 transition-colors"
          >
            {p.avatar_url ? (
              <Image
                src={p.avatar_url}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: p.color }}
              >
                {getInitials(p.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-medium">{p.name}</p>
              {p.title ? (
                <p className="text-muted-foreground truncate text-xs">{p.title}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
