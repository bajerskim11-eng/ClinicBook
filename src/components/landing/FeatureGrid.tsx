const FEATURES = [
  ["01", "Pierwszy wolny termin", "System może pokazać dostępne terminy według czasu, lokalizacji i wybranego lekarza."],
  ["02", "Mapa klinik", "Pacjent wybiera obszar i może szukać wizyty możliwie blisko siebie."],
  ["03", "Kalendarz kliniki", "Klinika prowadzi grafik, lekarzy, usługi i dostępność z jednego panelu."],
  ["04", "Rezerwacja online", "Pacjent wybiera usługę, termin i dane potrzebne do rezerwacji — bez telefonu."],
  ["05", "Chillera Club", "Warstwa członkowska przygotowana pod subskrypcję i dodatkowe benefity."],
  ["06", "Powiadomienia", "Potwierdzenia i przypomnienia pomagają uporządkować cały proces wizyty."],
]

export function FeatureGrid() {
  return (
    <section className="bg-[#090b0a] px-6 py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <div className="text-xs font-black uppercase tracking-[.24em] text-[#caff45]">Jeden system</div>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Klinika ogarnia grafik.<br/>Ty wybierasz termin.</h2>
            <p className="mt-5 max-w-md leading-7 text-white/45">Baza pod marketplace wizyt: kliniki, lekarze, usługi, kalendarze i pacjenci. Bez udawania, że to tylko landing page.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map(([n, title, desc]) => (
              <div key={n} className="group rounded-[1.6rem] border border-white/10 bg-white/[.025] p-6 transition hover:-translate-y-1 hover:border-[#caff45]/25 hover:bg-[#caff45]/[.035]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#caff45]">{n}</span>
                  <span className="text-white/20 transition group-hover:text-[#caff45]">↗</span>
                </div>
                <h3 className="mt-8 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/45">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}