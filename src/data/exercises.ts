export type Muscle = "chest" | "back" | "legs" | "shoulders" | "arms" | "core"

export const MUSCLES: { id: Muscle; label: string }[] = [
  { id: "chest", label: "صدر" },
  { id: "back", label: "ضهر" },
  { id: "legs", label: "رجل" },
  { id: "shoulders", label: "كتف" },
  { id: "arms", label: "دراع" },
  { id: "core", label: "بطن" },
]

/** "weight": kg × reps. "bodyweight": reps, extra kg optional. */
export type ExerciseKind = "weight" | "bodyweight"

export type Exercise = {
  id: string
  name: string
  muscle: Muscle
  kind: ExerciseKind
  /** Uses an Olympic bar, so the plate calculator applies. */
  barbell?: boolean
  custom?: boolean
}

type Row = [id: string, name: string, muscle: Muscle, kind?: ExerciseKind, barbell?: boolean]

const rows: Row[] = [
  ["bench", "بنش برس بار", "chest", "weight", true],
  ["bench-db", "بنش برس دمبل", "chest"],
  ["incline-bench", "بنش عالي بار", "chest", "weight", true],
  ["incline-db", "بنش عالي دمبل", "chest"],
  ["fly", "تفتيح دمبل", "chest"],
  ["cable-cross", "كروس أوفر", "chest"],
  ["pushup", "ضغط", "chest", "bodyweight"],
  ["dips", "ديبس", "chest", "bodyweight"],

  ["deadlift", "ديدليفت", "back", "weight", true],
  ["pullup", "عقلة", "back", "bodyweight"],
  ["lat-pulldown", "سحب أمامي", "back"],
  ["seated-row", "سحب أرضي", "back"],
  ["barbell-row", "تجديف بار", "back", "weight", true],
  ["db-row", "تجديف دمبل", "back"],
  ["t-bar", "تي بار", "back"],

  ["squat", "سكوات", "legs", "weight", true],
  ["leg-press", "ليج برس", "legs"],
  ["lunges", "لانجز", "legs"],
  ["leg-ext", "رفرفة أمامي", "legs"],
  ["leg-curl", "رفرفة خلفي", "legs"],
  ["rdl", "رومانيان ديدليفت", "legs", "weight", true],
  ["hip-thrust", "هيب ثرست", "legs", "weight", true],
  ["calf", "سمانة", "legs"],

  ["ohp", "ضغط كتف بار", "shoulders", "weight", true],
  ["db-press", "ضغط كتف دمبل", "shoulders"],
  ["lateral", "رفرفة جانبي", "shoulders"],
  ["rear-delt", "كتف خلفي", "shoulders"],
  ["face-pull", "فيس بول", "shoulders"],
  ["shrug", "ترابيس", "shoulders"],

  ["curl-bar", "بايسبس بار", "arms", "weight", true],
  ["curl-db", "بايسبس دمبل", "arms"],
  ["hammer", "هامر", "arms"],
  ["pushdown", "ترايسبس كابل", "arms"],
  ["skull", "فرنساوي", "arms", "weight", true],
  ["overhead-tri", "ترايسبس فوق الراس", "arms"],

  ["crunch", "كرانش", "core", "bodyweight"],
  ["leg-raise", "رفع رجول", "core", "bodyweight"],
  ["plank", "بلانك (بالثواني)", "core", "bodyweight"],
]

export const BASE_EXERCISES: Exercise[] = rows.map(([id, name, muscle, kind = "weight", barbell]) => ({
  id,
  name,
  muscle,
  kind,
  barbell,
}))

/** Starting routines so the first workout is one tap away. */
export const STARTER_ROUTINES: { name: string; exerciseIds: string[] }[] = [
  { name: "دفع (صدر، كتف، ترايسبس)", exerciseIds: ["bench", "incline-db", "ohp", "lateral", "pushdown"] },
  { name: "سحب (ضهر، بايسبس)", exerciseIds: ["deadlift", "lat-pulldown", "seated-row", "face-pull", "curl-db"] },
  { name: "رجل", exerciseIds: ["squat", "leg-press", "rdl", "leg-curl", "calf"] },
]
