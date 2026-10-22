import { addDays, dateKey, daysBetween } from "@/lib/format"
import { GOALS, type Goal, type Targets } from "@/lib/nutrition"
import { withTrend } from "@/lib/weights"
import type { Cycling, Entry, MizanData, WeighIn, Workout } from "@/store"

/** Energy in 1 kg of body weight change, the usual working figure. */
const KCAL_PER_KG = 7700

function dailyTotals(entries: Entry[]) {
  const totals = new Map<string, number>()
  for (const e of entries) totals.set(e.date, (totals.get(e.date) ?? 0) + e.kcal)
  return totals
}

export type Expenditure = {
  tdee: number
  avgIntake: number
  /** Change in the 7-day weight trend over the window, kg. */
  trendChange: number
  days: number
  loggedDays: number
}

/**
 * Real daily burn from what you ate and what the scale did:
 * burn = average intake − (trend change × 7700) / days.
 * Needs at least 14 days with 10 of them logged and 6 weigh-ins, else null.
 */
export function estimateExpenditure(entries: Entry[], weights: WeighIn[], today = dateKey(), window = 21): Expenditure | null {
  const from = addDays(today, -(window - 1))
  const totals = dailyTotals(entries.filter((e) => e.date >= from && e.date < today))
  // Days with almost nothing logged are usually forgotten logs, not fasts.
  const logged = [...totals.values()].filter((k) => k >= 800)
  const trend = withTrend(weights).filter((w) => w.date >= from && w.date <= today)
  if (logged.length < 10 || trend.length < 6) return null
  const first = trend[0]
  const last = trend[trend.length - 1]
  const days = daysBetween(first.date, last.date)
  if (days < 13) return null
  const avgIntake = logged.reduce((s, k) => s + k, 0) / logged.length
  const trendChange = last.avg - first.avg
  const tdee = avgIntake - (trendChange * KCAL_PER_KG) / days
  return { tdee, avgIntake, trendChange, days, loggedDays: logged.length }
}

/** Targets that hit the goal from the measured burn, keeping protein and the 25% fat split. */
export function targetsFromExpenditure(tdee: number, goal: Goal, current: Targets): Targets {
  const g = GOALS.find((x) => x.id === goal) ?? GOALS[1]
  const kcal = Math.round((tdee * (1 + g.adjust)) / 10) * 10
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - current.protein * 4 - fat * 9) / 4))
  return { kcal, protein: current.protein, carbs, fat }
}

export type CheckIn = {
  expenditure: Expenditure
  suggested: Targets
  /** Weekly weight change the trend shows, kg/week. */
  ratePerWeek: number
  message: string
}

/** Weekly check-in: offered once 7 days have passed since the last one and there is enough data. */
export function weeklyCheckIn(
  data: Pick<MizanData, "profile" | "lastCheckIn" | "entries" | "weights" | "targets">,
  today = dateKey()
): CheckIn | null {
  if (!data.profile) return null
  if (data.lastCheckIn && daysBetween(dateKey(new Date(data.lastCheckIn)), today) < 7) return null
  const expenditure = estimateExpenditure(data.entries, data.weights, today)
  if (!expenditure) return null
  const suggested = targetsFromExpenditure(expenditure.tdee, data.profile.goal, data.targets)
  if (Math.abs(suggested.kcal - data.targets.kcal) < 50) return null
  const ratePerWeek = (expenditure.trendChange / expenditure.days) * 7
  const goal = data.profile.goal
  const message =
    goal === "cut" && ratePerWeek > -0.1
      ? "وزنك واقف تقريباً، فالهدف محتاج ينزل شوية عشان التنشيف يمشي."
      : goal === "bulk" && ratePerWeek < 0.1
        ? "وزنك مش بيزيد، فالهدف محتاج يطلع شوية عشان التضخيم يمشي."
        : "حرقك الحقيقي طلع مختلف عن التقدير، فده الهدف المظبوط عليه."
  return { expenditure, suggested, ratePerWeek, message }
}

export function isTrainingDay(date: string, workouts: Workout[], manual: Record<string, boolean>) {
  return manual[date] ?? workouts.some((w) => w.date === date)
}

/** Today's targets after calorie cycling. Carbs absorb the difference so protein and fat stay put. */
export function dayTargets(targets: Targets, cycling: Cycling, training: boolean): Targets {
  if (!cycling.enabled) return targets
  const delta = Math.round((targets.kcal * (training ? cycling.trainingBoost : -cycling.restCut)) / 10) * 10
  return {
    ...targets,
    kcal: targets.kcal + delta,
    carbs: Math.max(0, Math.round(targets.carbs + delta / 4)),
  }
}

/** Days in a row with at least one food logged, counting today only once it has something. */
export function loggingStreak(entries: Entry[], today = dateKey()) {
  const days = new Set(entries.map((e) => e.date))
  let day = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(day)) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export type WeekReport = {
  from: string
  to: string
  loggedDays: number
  avgKcal: number
  avgProtein: number
  proteinDays: number
  onTargetDays: number
  weightChange: number | null
  workouts: number
  volume: number
  bestDay: { date: string; kcal: number } | null
}

/** The last 7 full days (not counting today). */
export function weekReport(
  data: Pick<MizanData, "entries" | "targets" | "weights" | "workouts">,
  today = dateKey()
): WeekReport {
  const to = addDays(today, -1)
  const from = addDays(today, -7)
  const inWeek = data.entries.filter((e) => e.date >= from && e.date <= to)
  const byDay = new Map<string, { kcal: number; p: number }>()
  for (const e of inWeek) {
    const d = byDay.get(e.date) ?? { kcal: 0, p: 0 }
    byDay.set(e.date, { kcal: d.kcal + e.kcal, p: d.p + e.p })
  }
  const days = [...byDay.entries()]
  const loggedDays = days.length
  const avgKcal = loggedDays ? days.reduce((s, [, d]) => s + d.kcal, 0) / loggedDays : 0
  const avgProtein = loggedDays ? days.reduce((s, [, d]) => s + d.p, 0) / loggedDays : 0
  const proteinDays = days.filter(([, d]) => d.p >= data.targets.protein * 0.9).length
  const onTargetDays = days.filter(([, d]) => Math.abs(d.kcal - data.targets.kcal) <= data.targets.kcal * 0.1).length
  const trend = withTrend(data.weights).filter((w) => w.date >= addDays(from, -1) && w.date <= to)
  const weightChange = trend.length >= 2 ? trend[trend.length - 1].avg - trend[0].avg : null
  const weekWorkouts = data.workouts.filter((w) => w.date >= from && w.date <= to && w.finishedAt)
  const volume = weekWorkouts.reduce(
    (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.reduce((x, set) => x + set.weight * set.reps, 0), 0),
    0
  )
  const best = days
    .filter(([, d]) => d.p >= data.targets.protein * 0.9)
    .sort((a, b) => Math.abs(a[1].kcal - data.targets.kcal) - Math.abs(b[1].kcal - data.targets.kcal))[0]
  return {
    from,
    to,
    loggedDays,
    avgKcal,
    avgProtein,
    proteinDays,
    onTargetDays,
    weightChange,
    workouts: weekWorkouts.length,
    volume,
    bestDay: best ? { date: best[0], kcal: best[1].kcal } : null,
  }
}
