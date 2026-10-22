import { num } from "@/lib/format"
import { platesPerSide } from "@/lib/training"

/** Bumper-plate colors so the picture matches what's on the gym floor. */
const PLATE_STYLE: Record<number, { color: string; h: number }> = {
  25: { color: "#d62828", h: 44 },
  20: { color: "#1d5fbf", h: 44 },
  15: { color: "#e5a500", h: 40 },
  10: { color: "#1f8746", h: 36 },
  5: { color: "#e5e5e5", h: 28 },
  2.5: { color: "#9ca3af", h: 22 },
  1.25: { color: "#9ca3af", h: 18 },
}

/** What to load on each side of a 20 kg bar for the given total. */
export function PlateView({ total }: { total: number }) {
  const { plates, leftover } = platesPerSide(total)
  if (total < 20) return <p className="text-xs text-muted-foreground">أقل من وزن البار (٢٠ كجم).</p>
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-12 items-center" aria-hidden="true">
        <span className="h-2 w-6 rounded-s-sm bg-muted-foreground/50" />
        <span className="h-5 w-1.5 rounded-sm bg-muted-foreground/70" />
        {plates.map((p, i) => (
          <span
            key={i}
            className="mx-px w-2.5 rounded-sm"
            style={{ height: PLATE_STYLE[p].h, background: PLATE_STYLE[p].color }}
          />
        ))}
        <span className="h-2 w-4 rounded-e-sm bg-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground">
        {plates.length ? `في كل ناحية: ${plates.map((p) => num(p, 2)).join(" + ")}` : "البار فاضي"}
        {leftover > 0 && `، وناقص ${num(leftover, 2)} كجم مش بتتعمل بالأوزان دي`}
      </p>
    </div>
  )
}
