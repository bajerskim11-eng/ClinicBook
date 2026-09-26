import Link from "next/link"

const chips = ["Katowice", "Gliwice", "Tychy", "Chorzów"]

export function Hero() {
  return (
    <section className="relative isolate min-h-[760px] overflow-hidden border-b border-white/10 bg-[#090b0a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(202,255,69,.16),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(202,255,69,.07),transparent_25%)]" />
      <div className="absolute right-[-12rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full border border-[#caff45]/10" />
      <div className="absolute right-[-5rem] top-[-3rem] h-[20rem] w-[20rem] rounded-full border border-[#caff45]/10" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#caff45] text-lg font-black text-black">C</div>
          <div>
            <div className="font-black tracking-tight">chillera clinic</div>
            <div className="text-[10px] uppercase tracking-[.28em] text-white/35">booking platform</div>
          </div>
        </div>
        <Link href="/auth/login" className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10">
          Dla klinik →
        </Link>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#caff45]/25 bg-[#caff45]/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#caff45]">
            <span className="h-2 w-2 rounded-full bg-[#caff45] shadow-[0_0_14px_#caff45]" />
            Chillera Clinic
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[.94] tracking-[-.045em] sm:text-7xl lg:text-[6.4rem]">
            Znajdź
            <span className="block text-[#caff45]">dobry termin.</span>
            <span className="block text-white/90">Bez dzwonienia.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-white/55">
            Wyszukiwarka wizyt dla klinik. Lokalizacja, lekarz, usługa i pierwszy dostępny termin — w jednym miejscu.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-xs text-white/55">{chip}</span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/book/demo-clinic" className="rounded-2xl bg-[#caff45] px-7 py-4 font-black text-black shadow-[0_0_40px_rgba(202,255,69,.14)] transition hover:scale-[1.02] hover:bg-[#d8ff72]">
              Znajdź wizytę →
            </Link>
            <Link href="/auth/login" className="rounded-2xl border border-white/10 bg-white/[.05] px-7 py-4 font-bold text-white transition hover:bg-white/10">
              Zaloguj się
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#111411]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0c0f0d] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/35">Szukasz wizyty</div>
                  <div className="mt-1 text-xl font-black">Katowice</div>
                </div>
                <div className="rounded-xl bg-[#caff45]/10 px-3 py-2 text-xs font-bold text-[#caff45]">LIVE SEARCH</div>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
                  <div className="text-xs text-white/35">NAJBLIŻSZY TERMIN</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div><span className="text-3xl font-black">dziś</span><span className="ml-2 text-white/40">18:30</span></div>
                    <span className="rounded-full bg-[#caff45] px-2.5 py-1 text-[10px] font-black text-black">DOSTĘPNE</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
                  <div className="text-xs text-white/35">SORTUJ</div>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-[#caff45] px-3 py-1.5 text-xs font-bold text-black">Najszybciej</span>
                    <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50">Najbliżej</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[.035] p-3"><div className="text-lg font-black">24/7</div><div className="text-[10px] text-white/30">wyszukiwarka</div></div>
                <div className="rounded-xl bg-white/[.035] p-3"><div className="text-lg font-black">1 klik</div><div className="text-[10px] text-white/30">rezerwacja</div></div>
                <div className="rounded-xl bg-white/[.035] p-3"><div className="text-lg font-black">Club</div><div className="text-[10px] text-white/30">benefity</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}