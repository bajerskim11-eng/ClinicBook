export function StatsCards({
  todayCount,
  weekCount,
  totalPatients,
}: {
  todayCount: number
  weekCount: number
  totalPatients: number
}) {
  const cards = [
    { label: "Today's appointments", value: todayCount },
    { label: "This week", value: weekCount },
    { label: "Total patients", value: totalPatients },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="border-border bg-card text-card-foreground rounded-xl border p-6 shadow-sm"
        >
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  )
}
