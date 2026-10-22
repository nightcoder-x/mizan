import { motion, useReducedMotion } from "motion/react"

import { num } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MEALS, type Entry } from "@/store"

/** How today's calories split across meals, each as a share of the daily target. */
export function MealSplitCard({ entries, target }: { entries: Entry[]; target: number }) {
  const reduce = useReducedMotion()
  const rows = MEALS.map((meal) => ({
    ...meal,
    kcal: entries.filter((e) => e.meal === meal.id).reduce((s, e) => s + e.kcal, 0),
  }))
  const biggest = rows.reduce((a, b) => (b.kcal > a.kcal ? b : a))

  return (
    <section aria-labelledby="split-title" className="flex h-full flex-col gap-5 rounded-[1.5rem] border bg-card p-6">
      <div className="flex flex-col gap-0.5">
        <h2 id="split-title" className="text-lg font-semibold">
          سعراتك على الوجبات
        </h2>
        <p className="text-sm text-muted-foreground">
          {biggest.kcal > 0 ? `${biggest.label} أكبر وجبة النهارده` : "هيبان هنا أول ما تسجل"}
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <li key={row.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{num(Math.round(row.kcal))}</span> سعرة
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={cn("h-full rounded-full", row.id === biggest.id && row.kcal > 0 ? "bg-lime" : "bg-foreground")}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${Math.min(row.kcal / target, 1) * 100}%` }}
                transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.2 + i * 0.06 }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-auto text-xs text-muted-foreground">كل شريط محسوب من هدفك اليومي ({num(target)} سعرة).</p>
    </section>
  )
}
