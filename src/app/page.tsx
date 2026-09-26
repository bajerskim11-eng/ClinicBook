import { Hero } from "@/components/landing/Hero"
import { FeatureGrid } from "@/components/landing/FeatureGrid"
import { Footer } from "@/components/landing/Footer"

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#090b0a] text-white">
      <Hero />
      <FeatureGrid />
      <Footer />
    </main>
  )
}