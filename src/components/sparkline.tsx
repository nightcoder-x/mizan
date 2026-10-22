/** A tiny trend line: the 7-day average as a line, today's weigh-in as a lime dot. */
export function Sparkline({
  points,
  className,
}: {
  points: { date: string; kg: number; avg: number }[]
  className?: string
}) {
  if (points.length < 2) return null
  const W = 120
  const H = 32
  const values = points.map((p) => p.avg)
  const min = Math.min(...values) - 0.2
  const max = Math.max(...values) + 0.2
  const t0 = new Date(points[0].date).getTime()
  const span = Math.max(1, new Date(points[points.length - 1].date).getTime() - t0)
  // Reads right to left like the page: oldest on the right, latest on the left.
  const x = (date: string) => W - ((new Date(date).getTime() - t0) / span) * W
  const y = (v: number) => H - ((v - min) / (max - min)) * H
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ")
  const last = points[points.length - 1]

  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last.date)} cy={y(last.avg)} r={4} fill="var(--lime)" stroke="var(--card)" strokeWidth={2} />
    </svg>
  )
}
