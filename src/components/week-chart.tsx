import { motion, useReducedMotion } from "motion/react"

import { addDays, dateKey, formatDay, keyToDate, num } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Entry } from "@/store"

const CHART_H = 150

/**
 * Last seven days of calories. Solid bars are what you ate up to the target,
 * the striped cap is anything past it.
 */
export function WeekChart({ entries, target }: { entries: Entry[]; target: number }) {
  const reduce = useReducedMotion()
  const today = dateKey()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const totals = days.map((d) => entries.filter((e) => e.date === d).reduce((s, e) => s + e.kcal, 0))
  const scale = Math.max(target * 1.25, ...totals)
  const logged = totals.filter((t) => t > 0)
  const avg = logged.length ? logged.reduce((s, t) => s + t, 0) / logged.length : 0
  const targetY = (target / scale) * CHART_H

  return (
    <section aria-labelledby="week-title" className="flex flex-col gap-4 rounded-[1.5rem] border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="week-title" className="font-semibold">
            سعرات الأسبوع
          </h2>
          <p className="text-sm text-muted-foreground">
            {logged.length ? `متوسط ${num(Math.round(avg))} سعرة في اليوم` : "سجّل أكلك والأيام هتتملي هنا"}
          </p>
        </div>
        <ul className="flex shrink-0 flex-col gap-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-foreground" aria-hidden="true" />
            أكلت
          </li>
          <li className="flex items-center gap-1.5">
            <span className="hatch size-2.5 rounded-full" aria-hidden="true" />
            فوق الهدف
          </li>
        </ul>
      </div>

      <div className="relative" style={{ height: CHART_H + 24 }}>
        {/* target line */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-muted-foreground/40"
          style={{ bottom: 24 + targetY }}
          aria-hidden="true"
        >
          <span className="absolute -top-5 end-0 rounded-full bg-secondary px-1.5 text-[10px] text-muted-foreground">
            الهدف {num(target)}
          </span>
        </div>

        <ol className="absolute inset-0 flex items-end gap-2">
          {days.map((day, i) => {
            const total = totals[i]
            const within = Math.min(total, target)
            const over = Math.max(total - target, 0)
            const isToday = day === today
            return (
              <li key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="flex w-full max-w-9 flex-col justify-end"
                  style={{ height: CHART_H }}
                  role="img"
                  aria-label={`${formatDay(day)}: ${num(Math.round(total))} سعرة`}
                >
                  {over > 0 && (
                    <motion.div
                      className="hatch w-full rounded-t-[10px]"
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: (over / scale) * CHART_H }}
                      transition={{ delay: 0.35 + i * 0.06 + 0.25, type: "spring", stiffness: 120, damping: 18 }}
                    />
                  )}
                  <motion.div
                    className={cn(
                      "w-full bg-foreground",
                      over > 0 ? "rounded-b-[10px]" : "rounded-[10px]",
                      total === 0 && "bg-secondary"
                    )}
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: total === 0 ? 6 : Math.max(6, (within / scale) * CHART_H) }}
                    transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 120, damping: 18 }}
                  />
                </div>
                <span
                  className={cn(
                    "h-[18px] rounded-full px-1.5 text-xs leading-[18px] tabular-nums",
                    isToday ? "bg-lime font-semibold text-lime-ink" : "text-muted-foreground"
                  )}
                >
                  {num(keyToDate(day).getDate())}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
