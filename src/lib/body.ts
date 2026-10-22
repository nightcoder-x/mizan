import type { Sex } from "@/lib/nutrition"

/**
 * US Navy body-fat estimate from tape measurements in cm.
 * Men need waist and neck; women also need hips. Usually within 3–4% of a DEXA scan.
 */
export function navyBodyFat(sex: Sex, heightCm: number, waist?: number, neck?: number, hips?: number) {
  if (!waist || !neck || waist <= neck) return null
  const log = Math.log10
  if (sex === "male") {
    return 495 / (1.0324 - 0.19077 * log(waist - neck) + 0.15456 * log(heightCm)) - 450
  }
  if (!hips) return null
  return 495 / (1.29579 - 0.35004 * log(waist + hips - neck) + 0.221 * log(heightCm)) - 450
}

export const MEASURE_FIELDS = [
  { key: "waist", label: "الوسط", hint: "عند السرة" },
  { key: "neck", label: "الرقبة", hint: "تحت تفاحة آدم" },
  { key: "hips", label: "الحوض", hint: "أعرض حتة" },
  { key: "chest", label: "الصدر", hint: "عند الحلمات" },
  { key: "arm", label: "الدراع", hint: "البايسبس مشدود" },
  { key: "thigh", label: "الفخد", hint: "أعرض حتة" },
] as const
