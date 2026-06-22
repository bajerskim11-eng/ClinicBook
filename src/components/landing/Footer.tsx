import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
        <p>ClinicBook — MIT licensed, open source.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/setup" className="hover:text-foreground hover:underline">
            Setup guide
          </Link>
          <Link href="/book/demo-clinic" className="hover:text-foreground hover:underline">
            Demo booking
          </Link>
          <a
            href="https://github.com/Servixa-cloud/ClinicBook"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
