import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
const font=Inter({variable:"--font-body",subsets:["latin"]})
export const metadata: Metadata={title:"Chillera Clinic — znajdź wizytę",description:"Rezerwacje wizyt w klinikach w stylu Chillera."}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pl" className={font.variable}><body className="min-h-full flex flex-col"><ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">{children}<Toaster/></ThemeProvider></body></html>}