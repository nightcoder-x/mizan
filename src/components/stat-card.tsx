import type { LucideIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { NumberTicker } from "@/components/ui/number-ticker"
import { num } from "@/lib/format"
import { cn } from "@/lib/utils"

/** A small white card: a label, a big counting number, and how far along it is. */
export function StatCard({
  label,
  icon: Icon,
  value,
  decimals = 0,
  unit,
  target,
  barClassName,
  footer,
  onClick,
}: {
  label: string
  icon: LucideIcon
  value: number
  decimals?: number
  unit: string
  /** When set, shows a progress bar and a percent chip. */
  target?: number
  barClassName?: string
  footer?: React.ReactNode
  onClick?: () => void
}) {
  const reduce = useReducedMotion()
  const progress = target ? value / target : 0
  const pct = Math.round(progress * 100)
  const Tag = onClick ? "button" : "div"

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex h-full w-full flex-col gap-3 rounded-[1.5rem] border bg-card p-4 text-start",
        onClick && "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="grid size-8 place-items-center rounded-full bg-secondary" aria-hidden="true">
          <Icon className="size-4" />
        </span>
      </div>

      <p className="flex items-baseline gap-1">
        <NumberTicker value={value} startValue={0} decimalPlaces={decimals} className="text-3xl font-bold tracking-tight" />
        <span className="text-sm text-muted-foreground">
          {target ? `/ ${num(target)} ${unit}` : unit}
        </span>
      </p>

      {target !== undefined && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className={cn("h-full rounded-full", barClassName)}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${Math.min(progress, 1) * 100}%` }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.2 }}
            />
          </div>
          <span
            className={cn(
              "w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
              pct > 110 ? "bg-destructive/10 text-destructive" : "bg-lime/30 text-positive"
            )}
          >
            {pct > 100 ? `زيادة ${num(pct - 100)}٪` : `${num(pct)}٪ من هدفك`}
          </span>
        </>
      )}
      {footer}
    </Tag>
  )
}
