import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

/** A progress bar made of thin ticks that fill one after another. */
export function TickBar({
  value,
  ticks = 36,
  className,
  filledClassName = "bg-current",
  emptyClassName = "bg-current/20",
  label,
}: {
  /** 0..1, anything above 1 shows as full */
  value: number
  ticks?: number
  className?: string
  filledClassName?: string
  emptyClassName?: string
  label: string
}) {
  const reduce = useReducedMotion()
  const filled = Math.round(Math.min(Math.max(value, 0), 1) * ticks)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(value, 1) * 100)}
      className={cn("flex h-7 items-end gap-[3px]", className)}
    >
      {Array.from({ length: ticks }, (_, i) => {
        const on = i < filled
        return (
          <motion.span
            key={i}
            className={cn("h-full flex-1 rounded-full", on ? filledClassName : emptyClassName)}
            initial={reduce ? false : { scaleY: 0.35, opacity: 0 }}
            animate={{ scaleY: on ? 1 : 0.55, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.25 + i * 0.012, type: "spring", stiffness: 380, damping: 26 }}
            style={{ originY: 1 }}
          />
        )
      })}
    </div>
  )
}
