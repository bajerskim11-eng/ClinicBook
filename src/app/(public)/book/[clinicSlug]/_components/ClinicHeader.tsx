export function ClinicHeader({ name }: { name: string }) {
  return (
    <header className="border-b px-4 py-3">
      <h1 className="text-lg font-semibold">{name}</h1>
    </header>
  )
}
