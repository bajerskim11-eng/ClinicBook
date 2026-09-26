const FEATURES = [
  ["⌁", "Kalendarz kliniki", "Zespół zarządza dostępnością, lekarzami i terminami z jednego panelu."],
  ["◉", "Rezerwacja online", "Pacjent wybiera usługę, lekarza i wolny termin bez telefonowania do kliniki."],
  ["↗", "Wyszukiwanie lokalne", "Porównuj dostępne wizyty według lokalizacji i czasu."],
  ["✦", "Chillera Club", "Warstwa klubowa przygotowana pod subskrypcję i benefity."],
  ["◌", "Powiadomienia", "Potwierdzenia i przypomnienia pomagają ograniczyć nieodbyte wizyty."],
  ["⌘", "Supabase + Vercel", "Gotowa baza technologiczna do dalszego rozwoju platformy."],
]
export function FeatureGrid() { return <section className="bg-[#0b0d0c] px-6 py-16 text-white"><div className="mx-auto max-w-6xl"><div className="mb-8"><div className="text-sm font-semibold uppercase tracking-widest text-[#caff45]">Jak działa Chillera Clinic</div><h2 className="mt-2 text-3xl font-black">Klinika ogarnia grafik. Ty wybierasz termin.</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(([i,t,d])=><div key={t} className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="text-2xl text-[#caff45]">{i}</div><h3 className="mt-5 text-lg font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-white/55">{d}</p></div>)}</div></div></section> }