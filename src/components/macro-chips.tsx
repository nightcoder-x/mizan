import { num } from "@/lib/format"
import { cn } from "@/lib/utils"

const MACROS = [
  { key: "p", label: "بروتين", color: "bg-lime ring-1 ring-inset ring-black/20" },
  { key: "c", label: "كارب", color: "bg-foreground" },
  { key: "f", label: "دهون", color: "hatch ring-1 ring-inset ring-black/20" },
] as const

/** Grams of each macro, each marked with its color on the home screen. */
export function MacroChips({
  p,
  c,
  f,
  className,
}: {
  p: number
  c: number
  f: number
  className?: string
}) {
  const values = { p, c, f }
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-sm", className)}>
      {MACROS.map((m) => (
        <li key={m.key} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-1.5 rounded-[2px]", m.color)} aria-hidden="true" />
          <span className="text-muted-foreground">{m.label}</span>
          <span className="font-semibold tabular-nums">{num(values[m.key], 1)} جم</span>
        </li>
      ))}
    </ul>
  )
}
