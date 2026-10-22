import { addDays, daysBetween } from "@/lib/format"
import type { WeighIn } from "@/store"

/**
 * Trailing 7-day average for every weigh-in. Daily weight swings with water and salt,
 * so the average is the number worth reading.
 */
export function withTrend(weights: WeighIn[], window = 7) {
  return weights.map((w) => {
    const from = addDays(w.date, -(window - 1))
    const slice = weights.filter((x) => x.date >= from && x.date <= w.date)
    const avg = slice.reduce((sum, x) => sum + x.kg, 0) / slice.length
    return { ...w, avg }
  })
}

/** Change in the trend over the last `days`, or null when there isn't enough history. */
export function trendChange(weights: WeighIn[], days = 7) {
  if (weights.length < 2) return null
  const trend = withTrend(weights)
  const last = trend[trend.length - 1]
  const earlier = [...trend].reverse().find((w) => daysBetween(w.date, last.date) >= days)
  if (!earlier) return null
  return last.avg - earlier.avg
}
