import { MinusIcon, PlusIcon, SearchXIcon, XIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { num } from "@/lib/format"
import { withFood, type ParsedItem } from "@/lib/parse-food-text"

export function itemKcal(item: ParsedItem) {
  return item.food ? (item.food.per100.kcal * item.grams) / 100 : 0
}

/** What the sentence turned into: each food with its amount, adjustable, plus anything not found. */
export function ParsedItems({
  items,
  onChange,
  onRemove,
  onCreate,
}: {
  items: ParsedItem[]
  onChange: (index: number, item: ParsedItem) => void
  onRemove: (index: number) => void
  /** Without it, unmatched items only suggest rewording. */
  onCreate?: (name: string) => void
}) {
  const bump = (index: number, item: ParsedItem, dir: 1 | -1) => {
    const isGrams = item.unit === "جرام"
    const step = isGrams ? 25 : 0.5
    const qty = Math.max(step, Math.round((item.qty + dir * step) * 100) / 100)
    const perUnit = isGrams ? 1 : item.grams / item.qty
    onChange(index, { ...item, qty, grams: qty * perUnit })
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.li
            key={`${item.text}-${i}`}
            layout
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border bg-card p-3"
          >
            {item.food ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{item.food.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {num(item.qty, 2)} {item.unit}
                      {item.unit !== "جرام" && ` (${num(Math.round(item.grams))} جم)`}
                    </span>
                  </div>
                  <span className="text-lg font-bold tabular-nums">{num(Math.round(itemKcal(item)))}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={`شيل ${item.food.name}`} onClick={() => onRemove(i)}>
                    <XIcon />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="icon-sm" className="rounded-full" aria-label="زوّد" onClick={() => bump(i, item, 1)}>
                    <PlusIcon />
                  </Button>
                  <Button variant="secondary" size="icon-sm" className="rounded-full" aria-label="قلّل" onClick={() => bump(i, item, -1)}>
                    <MinusIcon />
                  </Button>
                  {item.alternatives.length > 0 && (
                    <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
                      <span className="shrink-0 py-1 text-xs text-muted-foreground">تقصد:</span>
                      {item.alternatives.slice(0, 4).map((alt) => (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => onChange(i, { ...withFood(item, alt), alternatives: [item.food!, ...item.alternatives.filter((a) => a.id !== alt.id)] })}
                          className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {alt.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <SearchXIcon className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm">
                  مش لاقي <strong>«{item.text}»</strong>
                  {!onCreate && <span className="block text-xs text-muted-foreground">جرّب اسم تاني ليها</span>}
                </span>
                {onCreate && (
                  <Button size="sm" className="rounded-full" onClick={() => onCreate(item.text)}>
                    ضيفها
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" aria-label="شيلها" onClick={() => onRemove(i)}>
                  <XIcon />
                </Button>
              </div>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
