import { useMemo } from "react"
import { BeefIcon, CloudUploadIcon, DropletIcon, ScaleIcon, WheatIcon } from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { HeroCard } from "@/components/hero-card"
import { MealTimeline } from "@/components/meal-timeline"
import { Sparkline } from "@/components/sparkline"
import { StatCard } from "@/components/stat-card"
import { WeekChart } from "@/components/week-chart"
import { addDays, dateKey, daysBetween, num } from "@/lib/format"
import { GOALS, sumMacros } from "@/lib/nutrition"
import { trendChange, withTrend } from "@/lib/weights"
import { useMizan } from "@/store"

const BACKUP_EVERY_DAYS = 7

function greeting(name: string, now = new Date()) {
  const h = now.getHours()
  const hello = h >= 4 && h < 12 ? "صباح الفل" : h < 17 ? "نهارك فل" : "مساء الفل"
  return name ? `${hello} يا ${name}` : hello
}

export function TodayScreen({
  onLog,
  onWrite,
  onOpenWeight,
  onOpenSettings,
}: {
  onLog: () => void
  onWrite: () => void
  onOpenWeight: () => void
  onOpenSettings: () => void
}) {
  const today = dateKey()
  const name = useMizan((s) => s.name)
  const profile = useMizan((s) => s.profile)
  const allEntries = useMizan((s) => s.entries)
  const weights = useMizan((s) => s.weights)
  const targets = useMizan((s) => s.targets)
  const lastBackupAt = useMizan((s) => s.lastBackupAt)
  const entries = useMemo(() => allEntries.filter((e) => e.date === today), [allEntries, today])
  const eaten = sumMacros(entries)

  const goal = GOALS.find((g) => g.id === profile?.goal)
  const latest = weights[weights.length - 1]
  const change = trendChange(weights)
  const recentTrend = withTrend(weights).filter((w) => w.date >= addDays(today, -13))

  const daysSinceBackup = lastBackupAt ? daysBetween(dateKey(new Date(lastBackupAt)), today) : null
  const needsBackup = allEntries.length > 0 && (daysSinceBackup === null || daysSinceBackup >= BACKUP_EVERY_DAYS)

  return (
    <div className="flex flex-col gap-4">
      <BlurFade className="flex flex-col gap-1 pt-1 pb-2">
        <h1 className="text-[1.9rem] leading-tight font-bold tracking-tight">{greeting(name)}</h1>
        <p className="text-muted-foreground">
          {goal ? `هدفك ${goal.label}: ${num(targets.kcal)} سعرة في اليوم.` : `هدفك ${num(targets.kcal)} سعرة في اليوم.`}
        </p>
      </BlurFade>

      <BlurFade delay={0.05}>
        <HeroCard eaten={eaten.kcal} target={targets.kcal} onLog={onLog} onWrite={onWrite} />
      </BlurFade>

      <div className="grid grid-cols-2 gap-3">
        <BlurFade delay={0.1} className="h-full">
          <StatCard label="بروتين" icon={BeefIcon} value={Math.round(eaten.p)} unit="جم" target={targets.protein} barClassName="bg-lime" />
        </BlurFade>
        <BlurFade delay={0.14} className="h-full">
          <StatCard label="كارب" icon={WheatIcon} value={Math.round(eaten.c)} unit="جم" target={targets.carbs} barClassName="bg-foreground" />
        </BlurFade>
        <BlurFade delay={0.18} className="h-full">
          <StatCard label="دهون" icon={DropletIcon} value={Math.round(eaten.f)} unit="جم" target={targets.fat} barClassName="hatch" />
        </BlurFade>
        <BlurFade delay={0.22} className="h-full">
          <StatCard
            label="الوزن"
            icon={ScaleIcon}
            value={latest?.kg ?? 0}
            decimals={1}
            unit="كجم"
            onClick={onOpenWeight}
            footer={
              <div className="mt-auto flex items-end justify-between gap-2">
                <span
                  className={
                    change === null
                      ? "text-xs text-muted-foreground"
                      : "w-fit rounded-full bg-lime/30 px-2 py-0.5 text-xs font-semibold text-positive"
                  }
                >
                  {change === null
                    ? "سجّل أسبوع"
                    : Math.abs(change) < 0.05
                      ? "ثابت"
                      : `${change < 0 ? "↓" : "↑"} ${num(Math.abs(change), 1)} في أسبوع`}
                </span>
                <Sparkline points={recentTrend} className="h-8 w-16 text-foreground" />
              </div>
            }
          />
        </BlurFade>
      </div>

      <BlurFade delay={0.26}>
        <WeekChart entries={allEntries} target={targets.kcal} />
      </BlurFade>

      {needsBackup && (
        <BlurFade delay={0.3}>
          <Alert className="rounded-[1.5rem]">
            <CloudUploadIcon />
            <AlertTitle>
              {daysSinceBackup === null ? "لسه معملتش نسخة احتياطية" : `آخر نسخة احتياطية من ${num(daysSinceBackup)} يوم`}
            </AlertTitle>
            <AlertDescription>بياناتك على الموبايل بس. احفظ نسخة على Google Drive عشان متضيعش.</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="secondary" className="rounded-full" onClick={onOpenSettings}>
                احفظ نسخة
              </Button>
            </AlertAction>
          </Alert>
        </BlurFade>
      )}

      <BlurFade delay={0.32}>
        <MealTimeline entries={entries} onAdd={onLog} />
      </BlurFade>
    </div>
  )
}
