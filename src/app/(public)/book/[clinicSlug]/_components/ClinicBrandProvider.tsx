const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/**
 * Scopes the clinic's brand color to `--primary` (which `--color-primary` /
 * the `bg-primary`/`text-primary` utilities already read from, see
 * globals.css `@theme inline`), so existing booking-page components pick up
 * clinic branding without per-component changes. Only applies on public
 * booking routes — the dashboard keeps the app's own theme.
 */
export function ClinicBrandProvider({
  primaryColor,
  fontFamily,
  children,
}: {
  primaryColor?: string | null
  fontFamily?: string | null
  children: React.ReactNode
}) {
  const color = primaryColor && HEX_COLOR.test(primaryColor) ? primaryColor : undefined
  const style: React.CSSProperties & Record<string, string> = {}
  if (color) style["--primary"] = color
  if (fontFamily) style.fontFamily = fontFamily

  return (
    <div style={style} className="contents">
      {children}
    </div>
  )
}
