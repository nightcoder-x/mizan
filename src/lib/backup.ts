import { dateKey } from "@/lib/format"
import { blobToDataUrl, dataUrlToBlob, getPhoto, putPhoto } from "@/lib/photos"
import { EMPTY_DATA, type MizanData } from "@/store"

const APP_ID = "mizan"

type PhotoFile = { id: string; dataUrl: string }
export type Backup = { data: MizanData; photoFiles: PhotoFile[] }

/**
 * Hands the backup file to the share sheet (pick Google Drive there).
 * Falls back to a normal download where sharing files isn't supported.
 * Progress photos ride along inside the file. Returns false when the share sheet was closed.
 */
export async function exportBackup(data: MizanData) {
  const photoFiles: PhotoFile[] = []
  for (const meta of data.photos) {
    const blob = await getPhoto(meta.id)
    if (blob) photoFiles.push({ id: meta.id, dataUrl: await blobToDataUrl(blob) })
  }
  const payload = { app: APP_ID, version: 2, exportedAt: new Date().toISOString(), data, photoFiles }
  const name = `mizan-backup-${dateKey()}.json`
  const file = new File([JSON.stringify(payload)], name, { type: "application/json" })

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
const arrayOr = <T>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback)
const recordOr = <T>(v: unknown, fallback: Record<string, T>): Record<string, T> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : fallback

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupError("الملف ده مش نسخة احتياطية من ميزان.")
  }

  const root = parsed as { app?: unknown; data?: Partial<MizanData>; photoFiles?: unknown }
  const data = root?.data
  if (root?.app !== APP_ID || !data || typeof data !== "object") {
    throw new BackupError("الملف ده مش نسخة احتياطية من ميزان.")
  }

  const { targets, entries, weights } = data
  const validTargets =
    targets && isNum(targets.kcal) && isNum(targets.protein) && isNum(targets.carbs) && isNum(targets.fat)
  const validEntries =
    Array.isArray(entries) &&
    entries.every((e) => typeof e?.id === "string" && typeof e?.date === "string" && isNum(e?.kcal))
  const validWeights =
    Array.isArray(weights) && weights.every((w) => typeof w?.date === "string" && isNum(w?.kg))

  if (!validTargets || !validEntries || !validWeights) {
    throw new BackupError("النسخة الاحتياطية ناقصة أو بايظة، ومتغيرش حاجة في بياناتك.")
  }

  // Older backups have no training or body data; those start empty.
  const e = EMPTY_DATA
  return {
    data: {
      name: typeof data.name === "string" ? data.name : "",
      profile: data.profile ?? null,
      targets,
      manualTargets: Boolean(data.manualTargets),
      entries,
      weights,
      customFoods: arrayOr(data.customFoods, e.customFoods),
      savedMeals: arrayOr(data.savedMeals, e.savedMeals),
      workouts: arrayOr(data.workouts, e.workouts),
      routines: arrayOr(data.routines, e.routines),
      customExercises: arrayOr(data.customExercises, e.customExercises),
      water: recordOr(data.water, e.water),
      steps: recordOr(data.steps, e.steps),
      measurements: arrayOr(data.measurements, e.measurements),
      photos: arrayOr(data.photos, e.photos),
      trainingDays: recordOr(data.trainingDays, e.trainingDays),
      cycling: data.cycling && typeof data.cycling === "object" ? data.cycling : e.cycling,
      waterGoal: isNum(data.waterGoal) ? data.waterGoal : e.waterGoal,
      stepGoal: isNum(data.stepGoal) ? data.stepGoal : e.stepGoal,
      restSeconds: isNum(data.restSeconds) ? data.restSeconds : e.restSeconds,
      lastBackupAt: data.lastBackupAt ?? null,
      lastCheckIn: data.lastCheckIn ?? null,
    },
    photoFiles: arrayOr<PhotoFile>(root.photoFiles, []).filter(
      (p) => typeof p?.id === "string" && typeof p?.dataUrl === "string"
    ),
  }
}

/** Writes the backup's photos back into IndexedDB. */
export async function restorePhotos(photoFiles: PhotoFile[]) {
  for (const p of photoFiles) await putPhoto(p.id, await dataUrlToBlob(p.dataUrl))
}
