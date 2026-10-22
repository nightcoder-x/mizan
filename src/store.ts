import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Exercise } from "@/data/exercises"
import type { Food } from "@/data/foods"
import { dateKey } from "@/lib/format"
import { computeTargets, type Profile, type Targets } from "@/lib/nutrition"

export type Meal = "breakfast" | "lunch" | "dinner" | "snack"

export const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "فطار" },
  { id: "lunch", label: "غدا" },
  { id: "dinner", label: "عشا" },
  { id: "snack", label: "سناك" },
]

export function mealForNow(date = new Date()): Meal {
  const h = date.getHours()
  if (h >= 5 && h < 11) return "breakfast"
  if (h >= 11 && h < 18) return "lunch"
  if (h >= 18 && h < 23) return "dinner"
  return "snack"
}

export type Entry = {
  id: string
  date: string
  at: string
  meal: Meal
  foodId: string
  name: string
  /** How the portion was entered, e.g. 2 × رغيف, or 150 × جرام. */
  qty: number
  unit: string
  grams: number
  kcal: number
  p: number
  c: number
  f: number
}

export type WeighIn = { date: string; kg: number }

/** A food line saved inside a meal template; dates and ids are filled in when it is logged. */
export type SavedMealItem = Omit<Entry, "id" | "date" | "at" | "meal">
export type SavedMeal = { id: string; name: string; items: SavedMealItem[] }

export type WorkoutSet = { weight: number; reps: number; done: boolean }
export type WorkoutExercise = { exerciseId: string; sets: WorkoutSet[] }
export type Workout = {
  id: string
  date: string
  startedAt: string
  finishedAt: string | null
  name: string
  exercises: WorkoutExercise[]
}
export type Routine = { id: string; name: string; exerciseIds: string[] }

/** Body measurements in cm. Any of them can be missing on a given day. */
export type Measurement = {
  date: string
  waist?: number
  neck?: number
  hips?: number
  chest?: number
  arm?: number
  thigh?: number
}

/** The photo itself lives in IndexedDB (see lib/photos); this is its index. */
export type PhotoMeta = { id: string; date: string }

/** Calorie cycling: eat more on training days, less on rest days. Fractions of the target. */
export type Cycling = { enabled: boolean; trainingBoost: number; restCut: number }

export type MizanData = {
  /** What the greeting calls the person; stays on the device. */
  name: string
  profile: Profile | null
  targets: Targets
  /** True when the user typed targets by hand, so profile edits don't overwrite them. */
  manualTargets: boolean
  entries: Entry[]
  weights: WeighIn[]
  customFoods: Food[]
  savedMeals: SavedMeal[]
  workouts: Workout[]
  routines: Routine[]
  customExercises: Exercise[]
  /** Glasses of water (250 ml) per day. */
  water: Record<string, number>
  steps: Record<string, number>
  measurements: Measurement[]
  photos: PhotoMeta[]
  /** Manual "today is / isn't a training day"; without it, a logged workout decides. */
  trainingDays: Record<string, boolean>
  cycling: Cycling
  waterGoal: number
  stepGoal: number
  restSeconds: number
  lastBackupAt: string | null
  /** When the last weekly check-in was applied or dismissed. */
  lastCheckIn: string | null
}

const DATA_KEYS = [
  "name",
  "profile",
  "targets",
  "manualTargets",
  "entries",
  "weights",
  "customFoods",
  "savedMeals",
  "workouts",
  "routines",
  "customExercises",
  "water",
  "steps",
  "measurements",
  "photos",
  "trainingDays",
  "cycling",
  "waterGoal",
  "stepGoal",
  "restSeconds",
  "lastBackupAt",
  "lastCheckIn",
] as const satisfies readonly (keyof MizanData)[]

type Actions = {
  setName: (name: string) => void
  saveProfile: (profile: Profile) => void
  setTargets: (targets: Targets) => void
  resetToAutoTargets: () => void
  addEntry: (entry: Omit<Entry, "id">) => Entry
  addEntries: (entries: Omit<Entry, "id">[]) => Entry[]
  restoreEntry: (entry: Entry) => void
  removeEntry: (id: string) => void
  logWeight: (kg: number, date?: string) => void
  removeWeight: (date: string) => void
  addCustomFood: (food: Omit<Food, "id" | "custom">) => Food
  removeCustomFood: (id: string) => void
  saveMeal: (name: string, items: SavedMealItem[]) => void
  removeSavedMeal: (id: string) => void
  startWorkout: (name: string, exerciseIds: string[]) => string
  updateWorkout: (id: string, update: (w: Workout) => Workout) => void
  finishWorkout: (id: string) => void
  removeWorkout: (id: string) => void
  saveRoutine: (routine: Omit<Routine, "id"> & { id?: string }) => void
  removeRoutine: (id: string) => void
  addExercise: (exercise: Omit<Exercise, "id" | "custom">) => Exercise
  setWater: (date: string, glasses: number) => void
  setSteps: (date: string, steps: number) => void
  saveMeasurement: (m: Measurement) => void
  removeMeasurement: (date: string) => void
  addPhoto: (meta: PhotoMeta) => void
  removePhoto: (id: string) => void
  setTrainingDay: (date: string, training: boolean | null) => void
  setCycling: (cycling: Cycling) => void
  setDailyGoals: (goals: { waterGoal?: number; stepGoal?: number; restSeconds?: number }) => void
  markCheckIn: () => void
  markBackedUp: () => void
  replaceAll: (data: MizanData) => void
}

const initial: MizanData = {
  name: "",
  profile: null,
  targets: { kcal: 2000, protein: 120, carbs: 230, fat: 60 },
  manualTargets: false,
  entries: [],
  weights: [],
  customFoods: [],
  savedMeals: [],
  workouts: [],
  routines: [],
  customExercises: [],
  water: {},
  steps: {},
  measurements: [],
  photos: [],
  trainingDays: {},
  cycling: { enabled: false, trainingBoost: 0.1, restCut: 0.1 },
  waterGoal: 10,
  stepGoal: 8000,
  restSeconds: 90,
  lastBackupAt: null,
  lastCheckIn: null,
}

const uid = () => crypto.randomUUID()

export const useMizan = create<MizanData & Actions>()(
  persist(
    (set) => ({
      ...initial,

      setName: (name) => set({ name: name.trim() }),

      saveProfile: (profile) =>
        set((s) => ({
          profile,
          targets: s.manualTargets ? s.targets : computeTargets(profile),
        })),

      setTargets: (targets) => set({ targets, manualTargets: true }),

      resetToAutoTargets: () =>
        set((s) => ({
          manualTargets: false,
          targets: s.profile ? computeTargets(s.profile) : s.targets,
        })),

      addEntry: (entry) => {
        const saved = { ...entry, id: uid() }
        set((s) => ({ entries: [...s.entries, saved] }))
        return saved
      },

      addEntries: (entries) => {
        const saved = entries.map((e) => ({ ...e, id: uid() }))
        set((s) => ({ entries: [...s.entries, ...saved] }))
        return saved
      },

      restoreEntry: (entry) => set((s) => ({ entries: [...s.entries, entry] })),

      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      logWeight: (kg, date = dateKey()) =>
        set((s) => {
          const weights = [...s.weights.filter((w) => w.date !== date), { date, kg }]
          weights.sort((a, b) => a.date.localeCompare(b.date))
          const latest = weights[weights.length - 1]
          // Keep the profile weight current so auto targets follow the scale.
          if (!s.profile || latest.date !== date) return { weights }
          const profile = { ...s.profile, weightKg: kg }
          return {
            weights,
            profile,
            targets: s.manualTargets ? s.targets : computeTargets(profile),
          }
        }),

      removeWeight: (date) => set((s) => ({ weights: s.weights.filter((w) => w.date !== date) })),

      addCustomFood: (food) => {
        const saved: Food = { ...food, id: `custom-${uid()}`, custom: true }
        set((s) => ({ customFoods: [...s.customFoods, saved] }))
        return saved
      },

      removeCustomFood: (id) =>
        set((s) => ({ customFoods: s.customFoods.filter((f) => f.id !== id) })),

      saveMeal: (name, items) =>
        set((s) => ({ savedMeals: [...s.savedMeals, { id: uid(), name: name.trim(), items }] })),

      removeSavedMeal: (id) => set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) })),

      startWorkout: (name, exerciseIds) => {
        const now = new Date()
        const id = uid()
        const workout: Workout = {
          id,
          date: dateKey(now),
          startedAt: now.toISOString(),
          finishedAt: null,
          name,
          exercises: exerciseIds.map((exerciseId) => ({ exerciseId, sets: [] })),
        }
        set((s) => ({ workouts: [...s.workouts, workout] }))
        return id
      },

      updateWorkout: (id, update) =>
        set((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? update(w) : w)) })),

      finishWorkout: (id) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === id
              ? {
                  ...w,
                  finishedAt: new Date().toISOString(),
                  // Unfinished sets and empty exercises aren't part of the record.
                  exercises: w.exercises
                    .map((e) => ({ ...e, sets: e.sets.filter((set) => set.done) }))
                    .filter((e) => e.sets.length > 0),
                }
              : w
          ),
        })),

      removeWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      saveRoutine: ({ id, ...routine }) =>
        set((s) =>
          id && s.routines.some((r) => r.id === id)
            ? { routines: s.routines.map((r) => (r.id === id ? { ...routine, id } : r)) }
            : { routines: [...s.routines, { ...routine, id: uid() }] }
        ),

      removeRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      addExercise: (exercise) => {
        const saved: Exercise = { ...exercise, id: `custom-${uid()}`, custom: true }
        set((s) => ({ customExercises: [...s.customExercises, saved] }))
        return saved
      },

      setWater: (date, glasses) => set((s) => ({ water: { ...s.water, [date]: Math.max(0, glasses) } })),

      setSteps: (date, steps) => set((s) => ({ steps: { ...s.steps, [date]: Math.max(0, Math.round(steps)) } })),

      saveMeasurement: (m) =>
        set((s) => {
          const rest = s.measurements.filter((x) => x.date !== m.date)
          return { measurements: [...rest, m].sort((a, b) => a.date.localeCompare(b.date)) }
        }),

      removeMeasurement: (date) =>
        set((s) => ({ measurements: s.measurements.filter((m) => m.date !== date) })),

      addPhoto: (meta) => set((s) => ({ photos: [...s.photos, meta] })),

      removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),

      setTrainingDay: (date, training) =>
        set((s) => {
          const trainingDays = { ...s.trainingDays }
          if (training === null) delete trainingDays[date]
          else trainingDays[date] = training
          return { trainingDays }
        }),

      setCycling: (cycling) => set({ cycling }),

      setDailyGoals: (goals) => set(goals),

      markCheckIn: () => set({ lastCheckIn: new Date().toISOString() }),

      markBackedUp: () => set({ lastBackupAt: new Date().toISOString() }),

      replaceAll: (data) => set({ ...initial, ...data }),
    }),
    {
      name: "mizan",
      version: 2,
      partialize: (s): MizanData => pickData(s),
      // Version 1 had no training, water, steps or body data; start those empty.
      migrate: (persisted) => ({ ...initial, ...(persisted as Partial<MizanData>) }),
    }
  )
)

export function pickData(s: MizanData): MizanData {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as MizanData
}

export { initial as EMPTY_DATA }
