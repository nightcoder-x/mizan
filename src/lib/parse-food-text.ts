import type { Food, FoodUnit } from "@/data/foods"
import { searchFoods } from "@/lib/foods"
import { normalizeArabic, parseNum } from "@/lib/format"
import type { Meal } from "@/store"

/**
 * Turns a sentence like "٢ رغيف وطبق فول بالزيت وبيضتين" into foods with amounts,
 * using only the local food list. Anything it can't match comes back with food: null
 * so the person can add it.
 */

export type ParsedItem = {
  /** The piece of the sentence this item came from. */
  text: string
  food: Food | null
  /** Other foods the text could mean, best first. */
  alternatives: Food[]
  qty: number
  unit: string
  grams: number
}

const n = normalizeArabic
const GRAMS = "جرام"

const NUMBER_WORDS = new Map<string, number>(
  (
    [
      ["واحد", 1], ["واحدة", 1], ["اتنين", 2], ["اثنين", 2], ["تلاتة", 3], ["تلات", 3], ["ثلاثة", 3],
      ["اربعة", 4], ["اربع", 4], ["خمسة", 5], ["خمس", 5], ["ستة", 6], ["ست", 6], ["سبعة", 7], ["سبع", 7],
      ["تمانية", 8], ["تمن", 8], ["تسعة", 9], ["عشرة", 10], ["نص", 0.5], ["نصف", 0.5], ["ربع", 0.25],
      ["تلت", 1 / 3], ["ثلث", 1 / 3],
    ] as const
  ).map(([word, value]) => [n(word), value])
)

/** Measures that work for any food. */
const GENERIC_UNITS = new Map<string, FoodUnit>(
  (
    [
      ["جرام", 1], ["جم", 1], ["ج", 1], ["g", 1], ["gm", 1],
      ["كيلو", 1000], ["كجم", 1000], ["kg", 1000],
      ["معلقة كبيرة", 15], ["معلقة", 15], ["ملعقة", 15], ["معلقة صغيرة", 5], ["معلقة شاي", 5],
      ["كوب", 240], ["كوباية", 240], ["طبق", 250],
    ] as const
  ).map(([name, grams]) => [n(name), { name, grams }])
)

/** Plural and dual spellings: the singular unit, and whether the word itself means two. */
const UNIT_FORMS = new Map<string, { unit: string; dual: boolean }>(
  (
    [
      ["أرغفة", "رغيف", false], ["رغيفين", "رغيف", true],
      ["بيضات", "بيضة", false], ["بيضتين", "بيضة", true],
      ["معالق", "معلقة", false], ["معلقتين", "معلقة", true],
      ["أكواب", "كوب", false], ["كوبين", "كوب", true],
      ["كوبايات", "كوباية", false], ["كبايات", "كوباية", false], ["كوبايتين", "كوباية", true],
      ["أطباق", "طبق", false], ["طبقين", "طبق", true],
      ["قطع", "قطعة", false], ["حتت", "قطعة", false], ["حتة", "قطعة", false],
      ["قطعتين", "قطعة", true], ["حتتين", "قطعة", true],
      ["حبايات", "حباية", false], ["حبات", "حباية", false], ["حبة", "حباية", false], ["حبايتين", "حباية", true],
      ["علب", "علبة", false], ["علبتين", "علبة", true],
      ["شرايح", "شريحة", false], ["شرائح", "شريحة", false], ["شريحتين", "شريحة", true],
      ["صوابع", "صباع", false], ["صباعين", "صباع", true],
      ["أقراص", "قرص", false], ["قرصين", "قرص", true],
      ["أسياخ", "سيخ", false], ["سيخين", "سيخ", true],
      ["ساندوتشات", "ساندوتش", false], ["سندوتش", "ساندوتش", false], ["ساندوتشين", "ساندوتش", true],
      ["موزتين", "موزة", true], ["تفاحتين", "تفاحة", true], ["برتقانتين", "برتقانة", true],
      ["كانزين", "كانز", true], ["سكوبين", "سكوب", true],
      ["فناجين", "فنجان", false], ["فنجانين", "فنجان", true], ["كيلوين", "كيلو", true],
    ] as const
  ).map(([form, unit, dual]) => [n(form), { unit: n(unit), dual }])
)

const SEPARATORS = /[،,؛;+\n]+|\s+(?:و|مع)\s+/

const numberValue = (token: string) => {
  const parsed = parseNum(token)
  return Number.isFinite(parsed) ? parsed : NUMBER_WORDS.get(token)
}

function knownUnits(foods: Food[]) {
  const set = new Set<string>(GENERIC_UNITS.keys())
  for (const food of foods) for (const u of food.units) set.add(n(u.name))
  for (const { unit } of UNIT_FORMS.values()) set.add(unit)
  return set
}

/** Every word that appears in a food name, alias or measure. */
function vocabulary(foods: Food[]) {
  const set = new Set<string>()
  for (const f of foods) {
    for (const phrase of [f.name, ...(f.aliases ?? []), ...f.units.map((u) => u.name)]) {
      for (const word of n(phrase).split(/\s+/)) set.add(word)
    }
  }
  return set
}

/** Right after a number, "ونص" and "وربع" add to it instead of starting a new item. */
const FRACTION_TAILS = new Set([n("ونص"), n("وربع")])

/**
 * Splits on separators, then on a word that starts with و ("وطبق", "وكبسة"), unless
 * that word, و included, is part of a known name like "ورق عنب" or "بيتزا وسط".
 */
function splitSegments(text: string, vocab: Set<string>) {
  const segments: string[] = []
  for (const piece of text.split(SEPARATORS).map((s) => s.trim()).filter(Boolean)) {
    let current: string[] = []
    for (const token of piece.split(/\s+/)) {
      const t = n(token)
      const afterNumber = current.length > 0 && numberValue(n(current[current.length - 1])) !== undefined
      const isFraction = FRACTION_TAILS.has(t) && afterNumber
      if (t.length > 2 && t.startsWith("و") && current.length > 0 && !vocab.has(t) && !isFraction) {
        segments.push(current.join(" "))
        current = [token.slice(1)]
        continue
      }
      current.push(token)
    }
    if (current.length) segments.push(current.join(" "))
  }
  return segments
}

/** Words people wrap around food that never name one. Meal words also tell us which meal it was. */
const MEAL_WORDS = new Map<string, Meal>(
  (
    [
      ["فطرت", "breakfast"], ["فطار", "breakfast"], ["الفطار", "breakfast"],
      ["اتغديت", "lunch"], ["غدا", "lunch"], ["الغدا", "lunch"],
      ["اتعشيت", "dinner"], ["عشا", "dinner"], ["العشا", "dinner"],
      ["سناك", "snack"],
    ] as const
  ).map(([word, meal]) => [n(word), meal])
)
const FILLER = new Set(
  ["اكلت", "كلت", "شربت", "النهارده", "الصبح", "بالليل", "على", "في", "حوالي", "تقريبا", "بس", "كمان", "انا", "حاجه", "مش", "خالص"].map(n)
)

const hasUnit = (food: Food, unit: string) =>
  food.units.some((u) => n(u.name) === unit || n(u.name).startsWith(unit + " "))

/** Longest run of words that names a food wins; foods that come in the given measure rank first. */
function findFoods(words: string[], foods: Food[], unit: string | null) {
  for (let len = words.length; len > 0; len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const found = searchFoods(foods, words.slice(start, start + len).join(" "))
      if (found.length) {
        return unit ? [...found.filter((f) => hasUnit(f, unit)), ...found.filter((f) => !hasUnit(f, unit))] : found
      }
    }
  }
  // "٢ رغيف" or "بيضتين": the measure is the only clue.
  return unit && !GENERIC_UNITS.has(unit) ? foods.filter((f) => hasUnit(f, unit)) : []
}

/** The food's own measure if it has one by that name, else a generic one, else its default. */
function resolveUnit(food: Food, unit: string | null, context = ""): FoodUnit {
  if (unit) {
    // "صباع" could be "صباع كرنب" or "صباع ورق عنب": pick the one the sentence mentions.
    const own = food.units.filter((u) => n(u.name) === unit || n(u.name).startsWith(unit + " "))
    const best =
      own.find((u) => n(u.name) === unit) ??
      own.find((u) => n(u.name).split(" ").slice(1).every((w) => context.includes(w))) ??
      own[0]
    if (best) return best
    const generic = GENERIC_UNITS.get(unit)
    if (generic) return generic
    // "ربع كيلو", "نص كوب": a number word in front of a generic measure.
    const [head, ...tail] = unit.split(" ")
    const fraction = NUMBER_WORDS.get(head)
    const base = GENERIC_UNITS.get(tail.join(" "))
    if (fraction !== undefined && base) return { name: GRAMS, grams: fraction * base.grams }
  }
  return food.units[0] ?? { name: GRAMS, grams: 1 }
}

function build(text: string, food: Food, alternatives: Food[], qty: number | null, unit: string | null): ParsedItem {
  const resolved = resolveUnit(food, unit, n(text))
  if (resolved.name === GRAMS || resolved.grams === 1) {
    // "رز ٢٠٠ جرام" is a weight; "ربع كيلو فراخ" is one portion of 250 g.
    const grams = resolved.grams === 1 ? (qty ?? 100) : (qty ?? 1) * resolved.grams
    return { text, food, alternatives, qty: grams, unit: GRAMS, grams }
  }
  const q = qty ?? 1
  return { text, food, alternatives, qty: q, unit: resolved.name, grams: q * resolved.grams }
}

function parseSegment(
  segment: string,
  foods: Food[],
  units: Set<string>,
  onMeal: (meal: Meal) => void
): ParsedItem {
  const tokens = segment.split(/\s+/).filter(Boolean)
  let qty: number | null = null
  let unit: string | null = null
  const rest: string[] = []

  for (let i = 0; i < tokens.length; i++) {
    const t = n(tokens[i])
    const next = tokens[i + 1] ? n(tokens[i + 1]) : ""

    const meal = MEAL_WORDS.get(t)
    if (meal) {
      onMeal(meal)
      continue
    }
    if (FILLER.has(t)) continue

    // Two-word measures first, so "ربع فرخة" stays a measure instead of a quarter of something.
    if (unit === null && next && units.has(`${t} ${next}`)) {
      unit = `${t} ${next}`
      i++
      continue
    }
    if (unit === null && next && NUMBER_WORDS.has(t) && GENERIC_UNITS.has(next)) {
      unit = `${t} ${next}`
      i++
      continue
    }

    const value = numberValue(t)
    if (qty === null && value !== undefined) {
      qty = value
      if (next === "ونص") {
        qty += 0.5
        i++
      } else if (next === "وربع") {
        qty += 0.25
        i++
      }
      continue
    }

    if (unit === null) {
      const form = UNIT_FORMS.get(t)
      if (form) {
        unit = form.unit
        if (form.dual) qty = (qty ?? 1) * 2
        continue
      }
      if (units.has(t)) {
        unit = t
        continue
      }
    }
    rest.push(tokens[i])
  }

  const matches = findFoods(rest.map(n), foods, unit)
  if (!matches.length) {
    return { text: segment, food: null, alternatives: [], qty: qty ?? 1, unit: unit ?? "", grams: 0 }
  }
  return build(segment, matches[0], matches.slice(1, 6), qty, unit)
}

export function parseFoodText(text: string, foods: Food[]): { items: ParsedItem[]; meal: Meal | null } {
  const units = knownUnits(foods)
  let meal: Meal | null = null
  const items = splitSegments(text, vocabulary(foods))
    .map((s) => parseSegment(s, foods, units, (m) => (meal ??= m)))
    // A segment that was only "فطرت" or "النهارده" isn't an item.
    .filter((item) => item.food || n(item.text).split(/\s+/).some((w) => !MEAL_WORDS.has(w) && !FILLER.has(w)))
  return { items, meal }
}

/** Re-resolves an item after the person picks a different food for it. */
export function withFood(item: ParsedItem, food: Food): ParsedItem {
  const unit = item.unit === GRAMS ? GRAMS : n(item.unit)
  if (unit === GRAMS) return { ...item, food, grams: item.qty }
  const keep = food.units.some((u) => n(u.name) === unit) || GENERIC_UNITS.has(unit)
  return build(item.text, food, item.alternatives, item.qty, keep ? unit : null)
}
