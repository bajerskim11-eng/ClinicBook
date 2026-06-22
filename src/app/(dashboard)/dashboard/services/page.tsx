"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { formatDuration, formatPrice } from "@/lib/utils"
import type { Service } from "@/types"

const EMPTY_SERVICE: Partial<Service> = {
  name: "",
  description: "",
  duration_minutes: 60,
  price_cents: 0,
  buffer_minutes: 0,
  is_online_bookable: true,
  color: "#3b82f6",
  is_active: true,
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Service>>(EMPTY_SERVICE)
  const [clinicId, setClinicId] = useState<string>("")
  const supabase = createClient()

  const loadServices = useCallback(async () => {
    const { data: clinics, error: cErr } = await supabase
      .from("clinics")
      .select("id")
      .limit(1)
    if (cErr || !clinics?.[0]?.id) {
      toast.error("Could not load clinic")
      return
    }
    const id = clinics[0].id
    setClinicId(id)
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("clinic_id", id)
      .order("name")
    if (error) toast.error("Could not load services")
    setServices((data as Service[]) || [])
  }, [supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void loadServices()
    })
  }, [loadServices])

  async function saveService() {
    if (!clinicId || !editing.name?.trim()) {
      toast.error("Name is required")
      return
    }
    const payload = {
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      duration_minutes: editing.duration_minutes ?? 60,
      buffer_minutes: editing.buffer_minutes ?? 0,
      price_cents: editing.price_cents ?? 0,
      is_online_bookable: editing.is_online_bookable ?? true,
      color: editing.color ?? "#3b82f6",
      is_active: editing.is_active ?? true,
    }
    if (editing.id) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id)
      if (error) {
        toast.error("Could not save service")
        return
      }
    } else {
      const { error } = await supabase
        .from("services")
        .insert({ ...payload, clinic_id: clinicId })
      if (error) {
        toast.error("Could not create service")
        return
      }
    }
    setOpen(false)
    setEditing(EMPTY_SERVICE)
    toast.success("Service saved")
    void loadServices()
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service? This cannot be undone.")) return
    const { error } = await supabase.from("services").delete().eq("id", id)
    if (error) {
      toast.error("Could not delete service")
      return
    }
    setServices((prev) => prev.filter((s) => s.id !== id))
    toast.success("Service removed")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-foreground text-2xl font-semibold">Services</h1>
        <Button
          onClick={() => {
            setEditing(EMPTY_SERVICE)
            setOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add service
        </Button>
      </div>

      <div className="grid gap-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="border-border bg-card flex flex-wrap items-center gap-4 rounded-xl border p-5 shadow-sm"
          >
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: service.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-foreground font-medium">{service.name}</p>
                {!service.is_online_bookable && (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                    Not bookable online
                  </span>
                )}
                {!service.is_active && (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                    Inactive
                  </span>
                )}
              </div>
              {service.description && (
                <p className="text-muted-foreground truncate text-sm">{service.description}</p>
              )}
              <p className="text-muted-foreground mt-0.5 text-sm">
                {formatDuration(service.duration_minutes)}
                {service.buffer_minutes > 0 && ` + ${service.buffer_minutes} min buffer`}
                {service.price_cents > 0 && ` · ${formatPrice(service.price_cents)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(service)
                  setOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void deleteService(service.id)}>
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Service name</Label>
              <Input
                value={editing.name || ""}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea
                value={editing.description || ""}
                onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={editing.duration_minutes ?? 60}
                  onChange={(e) =>
                    setEditing((p) => ({
                      ...p,
                      duration_minutes: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Buffer time (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.buffer_minutes ?? 0}
                  onChange={(e) =>
                    setEditing((p) => ({
                      ...p,
                      buffer_minutes: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Price (cents, 0 = free)</Label>
              <Input
                type="number"
                min={0}
                value={editing.price_cents ?? 0}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    price_cents: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <p className="text-muted-foreground text-xs">e.g. 8000 = $80.00 CAD</p>
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <input
                type="color"
                value={editing.color || "#3b82f6"}
                onChange={(e) => setEditing((p) => ({ ...p, color: e.target.value }))}
                className="h-10 w-full cursor-pointer rounded border"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editing.is_online_bookable ?? true}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, is_online_bookable: v }))}
              />
              <Label>Bookable online</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editing.is_active ?? true}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, is_active: v }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveService()}>Save service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
