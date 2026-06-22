import { createClient } from "@/lib/supabase/server"
import { Download, FileText } from "lucide-react"

export default async function DocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: docs } = await supabase
    .from("patient_documents")
    .select("*")
    .eq("patient_id", account?.patient_id ?? "")
    .order("uploaded_at", { ascending: false })

  const list = docs ?? []

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">Documents</h2>
      {!list.length ? (
        <div className="bg-card text-muted-foreground rounded-xl border p-8 text-center">
          <FileText className="mx-auto mb-2 size-8 opacity-50" />
          <p>No documents yet. Your clinic will upload documents here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((doc) => (
            <div
              key={doc.id}
              className="bg-card flex items-center justify-between rounded-xl border p-4"
            >
              <div className="flex items-center gap-3">
                <FileText className="text-muted-foreground size-5" />
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(doc.uploaded_at as string).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <a
                href={doc.file_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center gap-1 text-xs hover:underline"
              >
                <Download className="size-3.5" /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
