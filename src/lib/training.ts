import { BASE_EXERCISES, type Exercise, type Muscle } from "@/data/exercises"
import { addDays, dateKey } from "@/lib/format"
import type { Workout, WorkoutSet } from "@/store"

export function allExercises(custom: Exercise[]) {
  return [...BASE_EXERCISES, ...custom]
}

/** Epley estimate of a one-rep max. */
export function estimate1RM(weight: number, reps: number) {
  if (reps <= 0 || weight <= 0) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

export type ExerciseBest = { e1rm: number; weight: number; reps: number; date: string }

/** Best estimated 1RM per exercise across finished workouts, optionally ignoring one workout. */
export function bestLifts(workouts: Workout[], excludeId?: string) {
  const best = new Map<string, ExerciseBest>()
  for (const w of workouts) {
    if (w.id === excludeId) continue
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (!s.done) continue
        const e1rm = estimate1RM(s.weight, s.reps)
        const prev = best.get(ex.exerciseId)
        if (!prev || e1rm > prev.e1rm) best.set(ex.exerciseId, { e1rm, weight: s.weight, reps: s.reps, date: w.date })
      }
    }
  }
  return best
}

/** The sets done for this exercise the last time it was trained, to prefill and to beat. */
export function lastSets(workouts: Workout[], exerciseId: string, excludeId?: string): WorkoutSet[] {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i]
    if (w.id === excludeId) continue
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId)
    const done = ex?.sets.filter((s) => s.done) ?? []
    if (done.length) return done
  }
  return []
}

export function workoutVolume(w: Workout) {
  return w.exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.done).reduce((s, x) => s + x.weight * x.reps, 0), 0)
}

/** Hard sets per muscle in the last 7 days. 10 to 20 a week is the usual range for growth. */
export function weeklySetsByMuscle(workouts: Workout[], exercises: Exercise[], today = dateKey()) {
  const from = addDays(today, -6)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const counts = new Map<Muscle, number>()
  for (const w of workouts) {
    if (w.date < from || w.date > today) continue
    for (const ex of w.exercises) {
      const muscle = byId.get(ex.exerciseId)?.muscle
      if (!muscle) continue
      counts.set(muscle, (counts.get(muscle) ?? 0) + ex.sets.filter((s) => s.done).length)
    }
  }
  return counts
}

/** Plates per side for a target weight, greedy from the heaviest. Returns what's left over if it can't be made exactly. */
export function platesPerSide(total: number, bar = 20, plates = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  let side = (total - bar) / 2
  const result: number[] = []
  if (side < 0) return { plates: result, leftover: total - bar }
  for (const p of plates) {
    while (side >= p - 1e-9) {
      result.push(p)
      side -= p
    }
  }
  return { plates: result, leftover: Math.round(side * 2 * 100) / 100 }
}
