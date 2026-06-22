import { clsx, type ClassValue } from "clsx"
import { format, parseISO } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "EEEE, MMMM d, yyyy 'at' h:mm a")
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "h:mm a")
}

export function generateSessionToken(): string {
  return crypto.randomUUID()
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
