export function ServiceCard({ title }: { title: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="font-medium">{title}</p>
    </div>
  )
}
