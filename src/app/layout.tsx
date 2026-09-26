import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const font = Inter({ variable: "--font-body", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Chillera Clinic — znajdź wizytę",
  description: "Chillera Clinic — wyszukiwarka i rezerwacja wizyt w klinikach.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={font.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[#090b0a] font-sans text-white">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}