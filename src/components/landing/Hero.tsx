import Link from "next/link"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#0b0d0c] px-6 py-20 text-white sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#caff45]/30 bg-[#caff45]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#caff45]">🌿 Chillera Clinic</div>
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">Znajdź wizytę.<br/><span className="text-[#caff45]">Bez zbędnego szukania.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Jedno miejsce do wyszukiwania i rezerwowania wizyt w klinikach. Szukaj po lokalizacji, dostępności i lekarzu.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/book/demo-clinic" className="rounded-2xl bg-[#caff45] px-6 py-3.5 font-bold text-black hover:bg-[#d8ff72]">Znajdź wizytę →</Link>
            <Link href="/auth/login" className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold hover:bg-white/10">Panel kliniki</Link>
          </div>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[["01","Najszybciej","Pokaż pierwsze wolne terminy"],["02","Najbliżej","Szukaj według lokalizacji"],["03","Chillera Club","Funkcje klubowe w jednym miejscu"]].map(([n,t,d])=><div key={n} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><div className="text-xs text-[#caff45]">{n}</div><div className="mt-3 text-xl font-bold">{t}</div><div className="mt-1 text-sm text-white/50">{d}</div></div>)}
        </div>
      </div>
    </section>
  )
}