import type { Metadata } from "next"
import { JetBrains_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const fontSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
})

const fontHeading = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
})

const fontMono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "ClinicBook",
  description: "Online appointment booking for clinics",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontHeading.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
