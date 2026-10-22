import { useState } from "react"
import { ClipboardPasteIcon, FootprintsIcon, GlassWaterIcon, SparklesIcon } from "lucide-react"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { NumberField } from "@/components/number-field"
import { dateKey, num, parseNum } from "@/lib/format"
import type { CheckIn } from "@/lib/insights"
import { cn } from "@/lib/utils"
import { useMizan } from "@/store"

const card = "flex h-full min-w-0 flex-col gap-3 rounded-[1.5rem] border bg-card p-4 lg:p-6"

/** Glasses of water as taps: tap the fifth glass and you've had five. */
export function WaterCard() {
  const today = dateKey()
  const glasses = useMizan((s) => s.water[today] ?? 0)
  const goal = useMizan((s) => s.waterGoal)
  const setWater = useMizan((s) => s.setWater)
  return (
    <section className={card} aria-labelledby="water-title">
      <div className="flex items-center justify-between">
        <h2 id="water-title" className="text-sm text-muted-foreground">
          المية
        </h2>
        <span className="grid size-8 place-items-center rounded-full bg-secondary" aria-hidden="true">
          <GlassWaterIcon className="size-4" />
        </span>
      </div>
      <p className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums">{num(glasses)}</span>
        <span className="text-sm text-muted-foreground">/ {num(goal)} كوبايات</span>
      </p>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="كوبايات المية">
        {Array.from({ length: goal }, (_, i) => {
          const full = i < glasses
          return (
            <button
              key={i}
              type="button"
              aria-label={`${num(i + 1)} كوباية`}
              aria-pressed={full}
              onClick={() => setWater(today, glasses === i + 1 ? i : i + 1)}
              className="relative h-8 overflow-hidden rounded-lg bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <motion.span
                className="absolute inset-x-0 bottom-0 bg-lime"
                initial={false}
                animate={{ height: full ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              />
            </button>
          )
        })}
      </div>
      <p className="mt-auto text-xs text-muted-foreground">الكوباية ٢٥٠ مل.</p>
    </section>
  )
}

/**
 * Steps can't be read from Apple Health by a website, so they come in by hand or by
 * pasting what an iPhone Shortcut copied (see Settings for how to set that up).
 */
export function StepsCard() {
  const today = dateKey()
  const steps = useMizan((s) => s.steps[today] ?? 0)
  const goal = useMizan((s) => s.stepGoal)
  const setSteps = useMizan((s) => s.setSteps)
  const [editing, setEditing] = useState(false)

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const value = parseNum(text.replace(/[^\d٠-٩۰-۹.,٫]/g, ""))
      if (!Number.isFinite(value)) throw new Error("no number")
      setSteps(today, value)
      toast.add({ title: `اتسجل ${num(Math.round(value))} خطوة`, type: "success" })
    } catch {
      toast.add({ title: "ملقتش رقم منسوخ", description: "شغّل الـ Shortcut الأول، أو اكتب الرقم بإيدك.", type: "error" })
    }
  }

  return (
    <section className={card} aria-labelledby="steps-title">
      <div className="flex items-center justify-between">
        <h2 id="steps-title" className="text-sm text-muted-foreground">
          الخطوات
        </h2>
        <span className="grid size-8 place-items-center rounded-full bg-secondary" aria-hidden="true">
          <FootprintsIcon className="size-4" />
        </span>
      </div>
      {editing ? (
        <NumberField
          autoFocus
          decimal={false}
          aria-label="خطوات النهارده"
          className="h-11 rounded-xl text-center text-lg font-bold"
          value={steps}
          onCommit={(v) => setSteps(today, v)}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="flex items-baseline gap-1 text-start outline-none">
          <span className="text-3xl font-bold tabular-nums">{num(steps)}</span>
          <span className="text-sm text-muted-foreground">/ {num(goal)}</span>
        </button>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className={cn("h-full rounded-full", steps >= goal ? "bg-lime" : "bg-foreground")}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(steps / goal, 1) * 100}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 16 }}
        />
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="mt-auto w-full rounded-full"
        onClick={paste}
        aria-label="الصق عدد الخطوات اللي نسخه الـ Shortcut"
      >
        <ClipboardPasteIcon data-icon="inline-start" />
        الصق
      </Button>
    </section>
  )
}

/** Weekly check-in: measured burn, and new targets to apply with one tap. */
export function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  const targets = useMizan((s) => s.targets)
  const setTargets = useMizan((s) => s.setTargets)
  const markCheckIn = useMizan((s) => s.markCheckIn)
  const { expenditure, suggested } = checkIn
  const diff = suggested.kcal - targets.kcal
  return (
    <section
      aria-labelledby="checkin-title"
      className="flex flex-col gap-4 rounded-[1.5rem] bg-foreground p-5 text-background lg:flex-row lg:items-center lg:p-6"
    >
      <div className="flex flex-1 flex-col gap-1">
        <h2 id="checkin-title" className="flex items-center gap-2 font-semibold">
          <SparklesIcon className="size-4.5 text-lime" aria-hidden="true" />
          تشييك الأسبوع
        </h2>
        <p className="text-sm opacity-80">
          حرقك الحقيقي من أكلك ووزنك آخر {num(expenditure.days)} يوم حوالي{" "}
          <strong className="text-lime">{num(Math.round(expenditure.tdee / 10) * 10)} سعرة</strong>. {checkIn.message}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm opacity-80">
          الهدف الجديد <strong className="text-lg text-background">{num(suggested.kcal)}</strong> ({diff > 0 ? "+" : "−"}
          {num(Math.abs(diff))})
        </span>
        <Button
          className="rounded-full bg-lime text-lime-ink hover:bg-lime/90"
          onClick={() => {
            setTargets(suggested)
            markCheckIn()
            toast.add({ title: "هدفك اتعدل", description: `${num(suggested.kcal)} سعرة في اليوم`, type: "success" })
          }}
        >
          طبّق
        </Button>
        <Button variant="ghost" className="rounded-full text-background hover:bg-background/10 hover:text-background" onClick={markCheckIn}>
          مش دلوقتي
        </Button>
      </div>
    </section>
  )
}

/** Training day or rest day, for calorie cycling. Defaults to whether a workout is logged today. */
export function DayTypeToggle({ training }: { training: boolean }) {
  const setTrainingDay = useMizan((s) => s.setTrainingDay)
  const today = dateKey()
  return (
    <div className="flex w-fit items-center gap-1 rounded-full border bg-card p-1 text-sm" role="group" aria-label="نوع اليوم">
      {[
        { on: true, label: "يوم تمرين" },
        { on: false, label: "يوم راحة" },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={training === o.on}
          onClick={() => setTrainingDay(today, o.on)}
          className="rounded-full px-3 py-1.5 outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
