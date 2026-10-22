import { useEffect, useRef, useState } from "react"
import { TimerIcon, XIcon } from "lucide-react"
import { motion } from "motion/react"

import { num } from "@/lib/format"

/** A short beep through Web Audio, so it works without any sound file. */
function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => void ctx.close()
  } catch {
    // Sound is a nicety; the bar already shows the time is up.
  }
}

/** Floating countdown between sets. `endsAt` is a timestamp; null hides it. */
export function RestTimer({
  endsAt,
  total,
  onAdjust,
  onClose,
}: {
  endsAt: number | null
  total: number
  onAdjust: (seconds: number) => void
  onClose: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const beeped = useRef<number | null>(null)

  useEffect(() => {
    if (endsAt === null) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [endsAt])

  const left = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))

  useEffect(() => {
    if (endsAt !== null && left === 0 && beeped.current !== endsAt) {
      beeped.current = endsAt
      beep()
      navigator.vibrate?.(300)
    }
  }, [endsAt, left])

  if (endsAt === null) return null
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, "0")

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      // Top of the screen, clear of the nav and the toasts at the bottom.
      className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-full bg-primary p-1.5 ps-4 text-primary-foreground shadow-xl lg:top-6"
      role="timer"
      aria-live="polite"
      aria-label={left ? `راحة: باقي ${num(left)} ثانية` : "الراحة خلصت"}
    >
      <motion.span
        className="absolute inset-y-0 start-0 -z-0 bg-lime/25"
        animate={{ width: `${(1 - left / total) * 100}%` }}
        transition={{ ease: "linear", duration: 0.25 }}
        aria-hidden="true"
      />
      <TimerIcon className="relative size-5" aria-hidden="true" />
      <span className="relative flex-1 text-lg font-bold tabular-nums">
        {left ? <span dir="ltr">{`${num(mm)}:${ss.replace(/\d/g, (d) => num(Number(d)))}`}</span> : "يلا السيت اللي بعده"}
      </span>
      <button
        type="button"
        onClick={() => onAdjust(15)}
        className="relative h-9 rounded-full bg-primary-foreground/15 px-3 text-sm font-semibold outline-none focus-visible:ring-3"
      >
        +١٥ث
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="وقّف المؤقت"
        className="relative grid size-9 place-items-center rounded-full bg-primary-foreground/15 outline-none focus-visible:ring-3"
      >
        <XIcon className="size-4" />
      </button>
    </motion.div>
  )
}
