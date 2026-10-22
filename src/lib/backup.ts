import { dateKey } from "@/lib/format"
import type { MizanData } from "@/store"

const APP_ID = "mizan"

/**
 * Hands the backup file to the iPhone share sheet (pick Google Drive there).
 * Falls back to a normal download where sharing files isn't supported.
 * Returns false when the person closed the share sheet without saving.
 */
export async function exportBackup(data: MizanData) {
  const payload = { app: APP_ID, version: 1, exportedAt: new Date().toISOString(), data }
  const name = `mizan-backup-${dateKey()}.json`
  const file = new File([JSON.stringify(payload, null, 2)], name, { type: "application/json" })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "نسخة ميزان الاحتياطية" })
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false
      throw error
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)

export class BackupError extends Error {}

export function parseBackup(text: string): MizanData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupError("الملف ده مش نسخة احتياطية من ميزان.")
  }

  const root = parsed as { app?: unknown; data?: Partial<MizanData> }
  const data = root?.data
  if (root?.app !== APP_ID || !data || typeof data !== "object") {
    throw new BackupError("الملف ده مش نسخة احتياطية من ميزان.")
  }

  const { targets, entries, weights, customFoods } = data
  const validTargets =
    targets && isNum(targets.kcal) && isNum(targets.protein) && isNum(targets.carbs) && isNum(targets.fat)
  const validEntries =
    Array.isArray(entries) &&
    entries.every((e) => typeof e?.id === "string" && typeof e?.date === "string" && isNum(e?.kcal))
  const validWeights =
    Array.isArray(weights) && weights.every((w) => typeof w?.date === "string" && isNum(w?.kg))

  if (!validTargets || !validEntries || !validWeights || !Array.isArray(customFoods)) {
    throw new BackupError("النسخة الاحتياطية ناقصة أو بايظة، ومتغيرش حاجة في بياناتك.")
  }

  return {
    name: typeof data.name === "string" ? data.name : "",
    profile: data.profile ?? null,
    targets,
    manualTargets: Boolean(data.manualTargets),
    entries,
    weights,
    customFoods,
    lastBackupAt: data.lastBackupAt ?? null,
  }
}
