import { Hero } from "@/components/landing/Hero"
import { FeatureGrid } from "@/components/landing/FeatureGrid"
import { Footer } from "@/components/landing/Footer"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      <FeatureGrid />
      <Footer />
    </div>
  )
}
