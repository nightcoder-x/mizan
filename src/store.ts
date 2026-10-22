import { create } from "zustand"
import { persist } from "zustand/middleware"

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
  lastBackupAt: string | null
}

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
  lastBackupAt: null,
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

      markBackedUp: () => set({ lastBackupAt: new Date().toISOString() }),

      replaceAll: (data) => set({ ...data }),
    }),
    {
      name: "mizan",
      version: 1,
      partialize: (s): MizanData => ({
        name: s.name,
        profile: s.profile,
        targets: s.targets,
        manualTargets: s.manualTargets,
        entries: s.entries,
        weights: s.weights,
        customFoods: s.customFoods,
        lastBackupAt: s.lastBackupAt,
      }),
    }
  )
)

export function pickData(s: MizanData): MizanData {
  return {
    name: s.name,
    profile: s.profile,
    targets: s.targets,
    manualTargets: s.manualTargets,
    entries: s.entries,
    weights: s.weights,
    customFoods: s.customFoods,
    lastBackupAt: s.lastBackupAt,
  }
}
