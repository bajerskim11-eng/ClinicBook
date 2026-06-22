export function EmptyState({ title }: { title: string }) {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
      {title}
    </div>
  )
}
