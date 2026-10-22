import { useRef, useState } from "react"
import { DownloadIcon, UploadIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ProfileForm } from "@/components/profile-form"
import { useTheme } from "@/components/theme-provider"
import { BackupError, exportBackup, parseBackup } from "@/lib/backup"
import { dateKey, daysBetween, formatDay, num, parseNum } from "@/lib/format"
import type { Targets } from "@/lib/nutrition"
import { pickData, useMizan, type MizanData } from "@/store"

export function SettingsScreen() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="pt-1 text-[1.9rem] font-bold tracking-tight lg:text-[2.6rem]">الإعدادات</h1>
      {/* Laptop: the cards flow into two columns. */}
      <div className="flex flex-col gap-6 lg:block lg:columns-2 lg:gap-6 lg:*:mb-6 lg:*:break-inside-avoid">
        <NameCard />
        <BackupCard />
        <TargetsCard />
        <ThemeCard />
        <ProfileCard />
      </div>
    </div>
  )
}

function NameCard() {
  const name = useMizan((s) => s.name)
  const setName = useMizan((s) => s.setName)
  const [text, setText] = useState(name)
  return (
    <Card>
      <CardHeader>
        <CardTitle>اسمك</CardTitle>
        <CardDescription>بيظهر في التحية فوق، ومتخزن على الجهاز ده بس.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setName(text)
            toast.add({ title: text.trim() ? `أهلاً يا ${text.trim()}` : "الاسم اتشال", type: "success" })
          }}
        >
          <Input
            aria-label="اسمك"
            className="h-11 flex-1 rounded-xl"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب اسمك"
            autoComplete="given-name"
          />
          <Button type="submit" size="xl" className="rounded-full">
            احفظ
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function BackupCard() {
  const lastBackupAt = useMizan((s) => s.lastBackupAt)
  const markBackedUp = useMizan((s) => s.markBackedUp)
  const replaceAll = useMizan((s) => s.replaceAll)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<MizanData | null>(null)

  const save = async () => {
    try {
      const saved = await exportBackup(pickData(useMizan.getState()))
      if (saved) {
        markBackedUp()
        toast.add({ title: "النسخة اتعملت", description: "اتأكد إنك اخترت Google Drive وحفظتها هناك.", type: "success" })
      }
    } catch {
      toast.add({ title: "النسخة متعملتش", description: "جرّب تاني، ولو فضلت كده نزّلها كملف.", type: "error" })
    }
  }

  const readFile = async (file: File) => {
    try {
      setPending(parseBackup(await file.text()))
    } catch (error) {
      toast.add({
        title: "مقدرتش أقرا الملف",
        description: error instanceof BackupError ? error.message : "الملف ده مش نسخة احتياطية من ميزان.",
        type: "error",
      })
    }
  }

  const today = dateKey()
  const age = lastBackupAt ? daysBetween(dateKey(new Date(lastBackupAt)), today) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>النسخة الاحتياطية</CardTitle>
        <CardDescription>
          بياناتك متخزنة على الجهاز ده بس. اعمل نسخة كل أسبوع واحفظها على Google Drive، ومنها تقدر تنقلها للموبايل أو اللابتوب.
          {lastBackupAt
            ? ` آخر نسخة: ${age === 0 ? "النهارده" : formatDay(dateKey(new Date(lastBackupAt)))}.`
            : " لسه معملتش ولا نسخة."}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex-col gap-2">
        <Button size="xl" className="w-full rounded-full" onClick={save}>
          <UploadIcon data-icon="inline-start" />
          احفظ نسخة على Drive
        </Button>
        <Button size="xl" variant="outline" className="w-full" onClick={() => fileInput.current?.click()}>
          <DownloadIcon data-icon="inline-start" />
          رجّع من نسخة
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void readFile(file)
            e.target.value = ""
          }}
        />
      </CardFooter>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ترجّع النسخة دي؟</AlertDialogTitle>
            <AlertDialogDescription>
              فيها {num(pending?.entries.length ?? 0)} أكلة و{num(pending?.weights.length ?? 0)} وزن. اللي على الجهاز ده
              دلوقتي هيتشال ويتحط مكانه اللي في النسخة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>لأ</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pending) replaceAll(pending)
                setPending(null)
                toast.add({ title: "النسخة رجعت", type: "success" })
              }}
            >
              رجّعها
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

const TARGET_FIELDS: { key: keyof Targets; label: string }[] = [
  { key: "kcal", label: "سعرات" },
  { key: "protein", label: "بروتين (جم)" },
  { key: "carbs", label: "كارب (جم)" },
  { key: "fat", label: "دهون (جم)" },
]

function TargetsCard() {
  const targets = useMizan((s) => s.targets)
  const manual = useMizan((s) => s.manualTargets)
  const setTargets = useMizan((s) => s.setTargets)
  const resetToAutoTargets = useMizan((s) => s.resetToAutoTargets)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState<Record<keyof Targets, string>>(() => toText(targets))

  const parsed = Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, parseNum(text[f.key])])) as Targets
  const valid = TARGET_FIELDS.every((f) => Number.isFinite(parsed[f.key]) && parsed[f.key] >= 0) && parsed.kcal >= 800

  return (
    <Card>
      <CardHeader>
        <CardTitle>أهدافك اليومية</CardTitle>
        <CardDescription>
          {manual ? "إنت كاتبها بإيدك." : "محسوبة من بياناتك، وبتتحدث لوحدها لما وزنك يتغير."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form
            id="targets-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!valid) return
              setTargets({
                kcal: Math.round(parsed.kcal),
                protein: Math.round(parsed.protein),
                carbs: Math.round(parsed.carbs),
                fat: Math.round(parsed.fat),
              })
              setEditing(false)
            }}
          >
            <FieldGroup className="grid grid-cols-2 gap-3">
              {TARGET_FIELDS.map((f) => (
                <Field key={f.key}>
                  <FieldLabel htmlFor={`target-${f.key}`}>{f.label}</FieldLabel>
                  <Input
                    id={`target-${f.key}`}
                    className="h-11"
                    inputMode="numeric"
                    value={text[f.key]}
                    onChange={(e) => setText((t) => ({ ...t, [f.key]: e.target.value }))}
                  />
                </Field>
              ))}
            </FieldGroup>
          </form>
        ) : (
          <dl className="grid grid-cols-4 gap-2 text-center">
            {TARGET_FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{f.label.replace(" (جم)", "")}</dt>
                <dd className="text-lg font-bold tabular-nums">{num(targets[f.key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {editing ? (
          <>
            <Button type="submit" form="targets-form" disabled={!valid} className="flex-1 rounded-full" size="xl">
              احفظ الأهداف
            </Button>
            <Button variant="outline" size="xl" onClick={() => setEditing(false)}>
              إلغاء
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="xl"
              className="flex-1"
              onClick={() => {
                setText(toText(targets))
                setEditing(true)
              }}
            >
              اكتبها بإيدك
            </Button>
            {manual && (
              <Button variant="ghost" size="xl" onClick={resetToAutoTargets}>
                رجّعها تلقائي
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}

const toText = (t: Targets) => ({
  kcal: String(t.kcal),
  protein: String(t.protein),
  carbs: String(t.carbs),
  fat: String(t.fat),
})

function ProfileCard() {
  const profile = useMizan((s) => s.profile)
  const saveProfile = useMizan((s) => s.saveProfile)
  return (
    <Card>
      <CardHeader>
        <CardTitle>بياناتك</CardTitle>
        <CardDescription>لو غيرت حاجة هنا الأهداف هتتحسب من جديد.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          key={JSON.stringify(profile)}
          initial={profile}
          submitLabel="احفظ بياناتي"
          onSubmit={(next) => {
            saveProfile(next)
            toast.add({ title: "بياناتك اتحفظت", type: "success" })
          }}
        />
      </CardContent>
    </Card>
  )
}

function ThemeCard() {
  const { theme, setTheme } = useTheme()
  return (
    <Card>
      <CardHeader>
        <CardTitle>الشكل</CardTitle>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          value={[theme]}
          onValueChange={(v) => v[0] && setTheme(v[0] as typeof theme)}
          variant="solid"
          size="xl"
          className="grid w-full grid-cols-3"
        >
          <ToggleGroupItem value="system">زي الجهاز</ToggleGroupItem>
          <ToggleGroupItem value="light">فاتح</ToggleGroupItem>
          <ToggleGroupItem value="dark">غامق</ToggleGroupItem>
        </ToggleGroup>
      </CardContent>
    </Card>
  )
}
