import { CalendarCheckIcon, FlameIcon } from "lucide-react"

import { NumberTicker } from "@/components/ui/number-ticker"
import { addDays, dateKey, formatShortDay, num } from "@/lib/format"
import { estimateExpenditure, weekReport } from "@/lib/insights"
import { tdee } from "@/lib/nutrition"
import { cn } from "@/lib/utils"
import { useMizan } from "@/store"

const card = "flex flex-col gap-4 rounded-[1.5rem] border bg-card p-5 lg:p-6"

export function ReportSection() {
  const entries = useMizan((s) => s.entries)
  const weights = useMizan((s) => s.weights)
  const workouts = useMizan((s) => s.workouts)
  const targets = useMizan((s) => s.targets)
  const profile = useMizan((s) => s.profile)
  const today = dateKey()
  const report = weekReport({ entries, weights, workouts, targets }, today)
  const expenditure = estimateExpenditure(entries, weights, today)
  const formula = profile ? Math.round(tdee(profile) / 10) * 10 : null

  const stats: { label: string; value: string; note?: string; good?: boolean }[] = [
    { label: "أيام سجلت فيها", value: `${num(report.loggedDays)} / ٧`, good: report.loggedDays >= 6 },
    {
      label: "متوسط السعرات",
      value: report.loggedDays ? num(Math.round(report.avgKcal)) : "—",
      note: `الهدف ${num(targets.kcal)}`,
      good: report.loggedDays > 0 && Math.abs(report.avgKcal - targets.kcal) <= targets.kcal * 0.1,
    },
    {
      label: "أيام كمّلت فيها البروتين",
      value: `${num(report.proteinDays)} / ${num(report.loggedDays || 7)}`,
      note: report.loggedDays ? `متوسط ${num(Math.round(report.avgProtein))} جم` : undefined,
      good: report.loggedDays > 0 && report.proteinDays >= report.loggedDays - 1,
    },
    { label: "أيام على الهدف (±١٠٪)", value: `${num(report.onTargetDays)} / ${num(report.loggedDays || 7)}` },
    {
      label: "الوزن (المتوسط)",
      value:
        report.weightChange === null
          ? "—"
          : `${report.weightChange < 0 ? "−" : "+"}${num(Math.abs(report.weightChange), 1)} كجم`,
      good:
        report.weightChange !== null &&
        ((profile?.goal === "cut" && report.weightChange < 0) || (profile?.goal === "bulk" && report.weightChange > 0)),
    },
    {
      label: "تمارين",
      value: num(report.workouts),
      note: report.volume ? `حجم ${num(Math.round(report.volume))} كجم` : undefined,
      good: report.workouts >= 3,
    },
  ]

  const from21 = addDays(today, -20)
  const loggedIn21 = new Set(entries.filter((e) => e.date >= from21).map((e) => e.date)).size
  const weighIns21 = weights.filter((w) => w.date >= from21).length

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-6">
      <section className={cn(card, "lg:col-span-7")} aria-labelledby="report-title">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="report-title" className="flex items-center gap-2 text-lg font-semibold">
              <CalendarCheckIcon className="size-5" aria-hidden="true" />
              تقرير الأسبوع
            </h2>
            <p className="text-sm text-muted-foreground">
              من {formatShortDay(report.from)} لـ {formatShortDay(report.to)}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className={cn("flex flex-col gap-1 rounded-2xl p-3", s.good ? "bg-lime/30" : "bg-secondary")}>
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-xl font-bold tabular-nums">{s.value}</dd>
              {s.note && <dd className="text-xs text-muted-foreground">{s.note}</dd>}
            </div>
          ))}
        </dl>
        {report.bestDay && (
          <p className="text-sm text-muted-foreground">
            أحسن يوم: {formatShortDay(report.bestDay.date)}، {num(Math.round(report.bestDay.kcal))} سعرة وكمّلت البروتين.
          </p>
        )}
      </section>

      <section className={cn(card, "lg:col-span-5")} aria-labelledby="burn-title">
        <h2 id="burn-title" className="flex items-center gap-2 text-lg font-semibold">
          <FlameIcon className="size-5" aria-hidden="true" />
          حرقك الحقيقي
        </h2>
        {expenditure ? (
          <>
            <p className="flex items-baseline gap-2">
              <NumberTicker value={Math.round(expenditure.tdee / 10) * 10} startValue={0} className="text-5xl font-extrabold" />
              <span className="text-muted-foreground">سعرة في اليوم</span>
            </p>
            <p className="text-sm text-muted-foreground">
              من آخر {num(expenditure.days)} يوم: أكلت في المتوسط {num(Math.round(expenditure.avgIntake))} سعرة، ومتوسط وزنك{" "}
              {expenditure.trendChange <= 0 ? "نزل" : "زاد"} {num(Math.abs(expenditure.trendChange), 1)} كجم.
              {formula && ` المعادلة كانت مقدّرة ${num(formula)}.`}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              بحسبه من أكلك ووزنك الفعليين، وده أدق من أي معادلة. محتاج ١٠ أيام تسجيل أكل و٦ أوزان في آخر ٣ أسابيع.
            </p>
            <Progress label="أيام الأكل" value={loggedIn21} goal={10} />
            <Progress label="مرات الوزن" value={weighIns21} goal={6} />
          </>
        )}
      </section>
    </div>
  )
}

function Progress({ label, value, goal }: { label: string; value: number; goal: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {num(Math.min(value, goal))} / {num(goal)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(value / goal, 1) * 100}%` }} />
      </div>
    </div>
  )
}
