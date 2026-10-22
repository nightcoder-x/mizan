import { BASE_FOODS, type Food } from "@/data/foods"
import { normalizeArabic } from "@/lib/format"
import type { Entry } from "@/store"

export function allFoods(customFoods: Food[]) {
  return [...customFoods, ...BASE_FOODS]
}

export function searchFoods(foods: Food[], query: string) {
  const q = normalizeArabic(query)
  if (!q) return foods
  const words = q.split(/\s+/)
  return foods
    .map((food) => {
      const haystack = normalizeArabic([food.name, ...(food.aliases ?? [])].join(" "))
      const name = normalizeArabic(food.name)
      if (!words.every((w) => haystack.includes(w))) return null
      const score = name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2
      return { food, score }
    })
    .filter((x): x is { food: Food; score: number } => x !== null)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.food)
}

/** Foods logged most recently, newest first, without repeats. */
export function recentFoods(entries: Entry[], foods: Food[], limit = 12) {
  const byId = new Map(foods.map((f) => [f.id, f]))
  const seen = new Set<string>()
  const result: Food[] = []
  for (let i = entries.length - 1; i >= 0 && result.length < limit; i--) {
    const food = byId.get(entries[i].foodId)
    if (food && !seen.has(food.id)) {
      seen.add(food.id)
      result.push(food)
    }
  }
  return result
}
