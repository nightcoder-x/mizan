export type Sex = "male" | "female"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "athlete"
export type Goal = "cut" | "maintain" | "bulk"

export type Profile = {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: Goal
}

export type Macros = { kcal: number; p: number; c: number; f: number }
export type Targets = { kcal: number; protein: number; carbs: number; fat: number }

export const ACTIVITY_LEVELS: {
  id: ActivityLevel
  label: string
  hint: string
  factor: number
}[] = [
  { id: "sedentary", label: "قليل", hint: "شغل مكتبي ومن غير تمرين", factor: 1.2 },
  { id: "light", label: "خفيف", hint: "تمرين ١–٣ أيام في الأسبوع", factor: 1.375 },
  { id: "moderate", label: "متوسط", hint: "تمرين ٣–٥ أيام في الأسبوع", factor: 1.55 },
  { id: "high", label: "عالي", hint: "تمرين ٦–٧ أيام في الأسبوع", factor: 1.725 },
  { id: "athlete", label: "عالي جداً", hint: "تمرين يومي وشغل فيه مجهود", factor: 1.9 },
]

export const GOALS: { id: Goal; label: string; hint: string; adjust: number; proteinPerKg: number }[] = [
  { id: "cut", label: "تنشيف", hint: "عجز ٢٠٪ تحت حرقك", adjust: -0.2, proteinPerKg: 2.0 },
  { id: "maintain", label: "ثبات", hint: "على قد حرقك", adjust: 0, proteinPerKg: 1.8 },
  { id: "bulk", label: "تضخيم", hint: "زيادة ١٠٪ فوق حرقك", adjust: 0.1, proteinPerKg: 1.8 },
]

/** Mifflin-St Jeor resting energy expenditure. */
export function bmr({ sex, age, heightCm, weightKg }: Profile) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === "male" ? base + 5 : base - 161
}

export function tdee(profile: Profile) {
  const factor = ACTIVITY_LEVELS.find((a) => a.id === profile.activity)?.factor ?? 1.2
  return bmr(profile) * factor
}

export function computeTargets(profile: Profile): Targets {
  const goal = GOALS.find((g) => g.id === profile.goal) ?? GOALS[1]
  const kcal = Math.round((tdee(profile) * (1 + goal.adjust)) / 10) * 10
  const protein = Math.round(profile.weightKg * goal.proteinPerKg)
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

export function scaleMacros(per100: Macros, grams: number): Macros {
  const k = grams / 100
  return { kcal: per100.kcal * k, p: per100.p * k, c: per100.c * k, f: per100.f * k }
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({ kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, f: acc.f + m.f }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  )
}
