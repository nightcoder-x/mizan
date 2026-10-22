import { useEffect, useRef, useState } from "react"
import { CameraIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { NumberField } from "@/components/number-field"
import { MEASURE_FIELDS, navyBodyFat } from "@/lib/body"
import { dateKey, formatDay, formatShortDay, num } from "@/lib/format"
import { compressPhoto, deletePhoto, getPhoto, putPhoto } from "@/lib/photos"
import { cn } from "@/lib/utils"
import { useMizan, type Measurement, type PhotoMeta } from "@/store"

const card = "flex flex-col gap-4 rounded-[1.5rem] border bg-card p-5 lg:p-6"
type MeasureKey = (typeof MEASURE_FIELDS)[number]["key"]

export function BodySection() {
  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-6">
      <MeasurementsCard />
      <PhotosCard />
    </div>
  )
}

function MeasurementsCard() {
  const measurements = useMizan((s) => s.measurements)
  const profile = useMizan((s) => s.profile)
  const saveMeasurement = useMizan((s) => s.saveMeasurement)
  const removeMeasurement = useMizan((s) => s.removeMeasurement)
  const today = dateKey()
  const todays = measurements.find((m) => m.date === today)
  const latest = measurements[measurements.length - 1]
  const first = measurements[0]
  const [draft, setDraft] = useState<Measurement>(todays ?? { date: today })

  // Most people only re-measure a couple of spots, so start from the last numbers.
  const placeholder = (k: MeasureKey) => latest?.[k]

  const fat = (m?: Measurement) =>
    m && profile ? navyBodyFat(profile.sex, profile.heightCm, m.waist, m.neck, m.hips) : null
  const fatNow = fat(latest)
  const fatFirst = first !== latest ? fat(first) : null

  return (
    <>
      <section className={cn(card, "lg:col-span-7")} aria-labelledby="measure-title">
        <div className="flex flex-col gap-0.5">
          <h2 id="measure-title" className="text-lg font-semibold">
            مقاساتك
          </h2>
          <p className="text-sm text-muted-foreground">بالسنتي، الصبح وقبل الأكل. مش لازم تقيس كله كل مرة.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MEASURE_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-sm font-medium">{f.label}</span>
              <NumberField
                className="h-11 rounded-xl text-center font-semibold"
                aria-label={`${f.label} بالسنتي`}
                placeholder={placeholder(f.key) ? num(placeholder(f.key)!, 1) : "—"}
                value={draft[f.key] ?? 0}
                onCommit={(v) => setDraft((d) => ({ ...d, [f.key]: v || undefined }))}
              />
              <span className="text-[11px] text-muted-foreground">{f.hint}</span>
            </label>
          ))}
        </div>
        <Button
          size="xl"
          className="rounded-full"
          disabled={!MEASURE_FIELDS.some((f) => draft[f.key])}
          onClick={() => {
            saveMeasurement({ ...draft, date: today })
            toast.add({ title: "المقاسات اتسجلت", type: "success" })
          }}
        >
          {todays ? "عدّل مقاسات النهارده" : "سجّل المقاسات"}
        </Button>

        {measurements.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-medium">اليوم</th>
                  {MEASURE_FIELDS.map((f) => (
                    <th key={f.key} scope="col" className="px-3 py-2 text-start font-medium">
                      {f.label}
                    </th>
                  ))}
                  <th scope="col" className="w-10 px-1">
                    <span className="sr-only">مسح</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map((m) => (
                  <tr key={m.date} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{formatShortDay(m.date)}</td>
                    {MEASURE_FIELDS.map((f) => (
                      <td key={f.key} className="px-3 py-2 tabular-nums">
                        {m[f.key] ? num(m[f.key]!, 1) : "—"}
                      </td>
                    ))}
                    <td className="px-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        aria-label={`امسح مقاسات ${formatDay(m.date)}`}
                        onClick={() => removeMeasurement(m.date)}
                      >
                        <Trash2Icon />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={cn(card, "lg:col-span-5")} aria-labelledby="fat-title">
        <h2 id="fat-title" className="text-lg font-semibold">
          نسبة الدهون
        </h2>
        {fatNow !== null && fatNow > 2 && fatNow < 60 ? (
          <>
            <p className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tabular-nums">{num(fatNow, 1)}٪</span>
              {fatFirst !== null && Math.abs(fatNow - fatFirst) >= 0.1 && (
                <span className="rounded-full bg-lime/30 px-2 py-0.5 text-sm font-semibold text-positive">
                  {fatNow < fatFirst ? "نزلت" : "زادت"} {num(Math.abs(fatNow - fatFirst), 1)}٪
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              محسوبة بطريقة البحرية الأمريكية من الوسط والرقبة{profile?.sex === "female" ? " والحوض" : ""} وطولك. بتغلط
              ٣–٤٪ تقريباً، فالمهم إنها بتنزل مع الوقت مش الرقم نفسه.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            سجّل الوسط والرقبة{profile?.sex === "female" ? " والحوض" : ""} وهحسبلك نسبة الدهون تقريباً.
          </p>
        )}
      </section>
    </>
  )
}

function usePhotoUrl(id: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    let alive = true
    void getPhoto(id).then((blob) => {
      if (!blob || !alive) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url
}

function Photo({ meta, className, onClick }: { meta: PhotoMeta; className?: string; onClick?: () => void }) {
  const url = usePhotoUrl(meta.id)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("relative overflow-hidden rounded-2xl bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
      aria-label={`صورة ${formatDay(meta.date)}`}
    >
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <span className="absolute start-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">
        {formatShortDay(meta.date)}
      </span>
    </button>
  )
}

function PhotosCard() {
  const photos = useMizan((s) => s.photos)
  const addPhoto = useMizan((s) => s.addPhoto)
  const removePhoto = useMizan((s) => s.removePhoto)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<PhotoMeta | null>(null)
  const openUrl = usePhotoUrl(open?.id ?? "")
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date))

  const add = async (file: File) => {
    try {
      const blob = await compressPhoto(file)
      const meta = { id: crypto.randomUUID(), date: dateKey() }
      await putPhoto(meta.id, blob)
      addPhoto(meta)
      toast.add({ title: "الصورة اتحفظت على الجهاز", type: "success" })
    } catch {
      toast.add({ title: "مقدرتش أحفظ الصورة", type: "error" })
    }
  }

  return (
    <section className={cn(card, "lg:col-span-12")} aria-labelledby="photos-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="photos-title" className="text-lg font-semibold">
            صور التقدم
          </h2>
          <p className="text-sm text-muted-foreground">
            بتتحفظ على الجهاز ده بس، ومحدش بيشوفها. صوّر نفس المكان ونفس الإضاءة كل أسبوعين.
          </p>
        </div>
        <Button className="shrink-0 rounded-full" onClick={() => input.current?.click()}>
          <CameraIcon data-icon="inline-start" />
          صورة
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void add(file)
            e.target.value = ""
          }}
        />
      </div>

      {sorted.length >= 2 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">قبل</span>
            <Photo meta={sorted[0]} className="aspect-[3/4]" onClick={() => setOpen(sorted[0])} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">دلوقتي</span>
            <Photo meta={sorted[sorted.length - 1]} className="aspect-[3/4]" onClick={() => setOpen(sorted[sorted.length - 1])} />
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {[...sorted].reverse().map((p) => (
            <Photo key={p.id} meta={p} className="aspect-[3/4]" onClick={() => setOpen(p)} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-secondary p-6 text-center text-sm text-muted-foreground">
          لسه مفيش صور. أول صورة هتبقى "قبل"، وهتفرق معاك بعد شهرين.
        </p>
      )}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md gap-3 rounded-[1.5rem] p-3 sm:max-w-md">
          <DialogTitle className="px-2 pt-1">{open ? formatDay(open.date) : ""}</DialogTitle>
          <DialogDescription className="sr-only">صورة التقدم</DialogDescription>
          {openUrl && <img src={openUrl} alt={`صورة ${open ? formatDay(open.date) : ""}`} className="max-h-[70dvh] w-full rounded-2xl object-contain" />}
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={() => {
              if (!open) return
              void deletePhoto(open.id)
              removePhoto(open.id)
              setOpen(null)
              toast.add({ title: "الصورة اتمسحت" })
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            امسح الصورة
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  )
}
