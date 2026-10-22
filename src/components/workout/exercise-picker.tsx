import { useMemo, useState } from "react"
import { CheckIcon, PlusIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MUSCLES, type Exercise, type ExerciseKind, type Muscle } from "@/data/exercises"
import { normalizeArabic } from "@/lib/format"
import { allExercises } from "@/lib/training"
import { cn } from "@/lib/utils"
import { useMizan } from "@/store"

/** Pick one or more exercises, grouped by muscle, with a way to add your own. */
export function ExercisePicker({
  open,
  onOpenChange,
  title,
  initial = [],
  onDone,
  confirmLabel,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initial?: string[]
  onDone: (ids: string[]) => void
  confirmLabel: (count: number) => string
  /** Extra fields above the list, e.g. a routine name. */
  children?: React.ReactNode
}) {
  const custom = useMizan((s) => s.customExercises)
  const addExercise = useMizan((s) => s.addExercise)
  const exercises = useMemo(() => allExercises(custom), [custom])
  const [selected, setSelected] = useState<string[]>(initial)
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)

  const q = normalizeArabic(query)
  const visible = q ? exercises.filter((e) => normalizeArabic(e.name).includes(q)) : exercises

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(44rem,88dvh)] max-w-[30rem] flex-col gap-0 overflow-hidden rounded-[1.75rem] p-0 sm:max-w-[30rem]">
        <DialogHeader className="gap-3 p-5 pb-3">
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className="sr-only">اختار التمارين</DialogDescription>
          {children}
          <InputGroup className="h-11 rounded-full">
            <InputGroupInput
              placeholder="دوّر على تمرين"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="دوّر على تمرين"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {MUSCLES.map((m) => {
            const list = visible.filter((e) => e.muscle === m.id)
            if (!list.length) return null
            return (
              <section key={m.id} className="flex flex-col gap-1 pb-3" aria-label={m.label}>
                <h3 className="px-2 py-1 text-sm font-semibold text-muted-foreground">{m.label}</h3>
                {list.map((e) => {
                  const on = selected.includes(e.id)
                  return (
                    <button
                      key={e.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(e.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-start outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50",
                        on && "bg-secondary"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border",
                          on && "border-primary bg-primary text-primary-foreground"
                        )}
                        aria-hidden="true"
                      >
                        {on && <CheckIcon className="size-3.5" />}
                      </span>
                      <span className="flex-1">{e.name}</span>
                      {on && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Intl.NumberFormat("ar-EG").format(selected.indexOf(e.id) + 1)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </section>
            )
          })}
          {adding ? (
            <NewExerciseForm
              defaultName={query}
              onCancel={() => setAdding(false)}
              onSave={(ex) => {
                const saved = addExercise(ex)
                setSelected((s) => [...s, saved.id])
                setAdding(false)
                setQuery("")
              }}
            />
          ) : (
            <Button variant="outline" className="mt-1 h-11 w-full rounded-full" onClick={() => setAdding(true)}>
              <PlusIcon data-icon="inline-start" />
              تمرين مش موجود؟ ضيفه
            </Button>
          )}
        </div>

        <div className="border-t p-4">
          <Button size="xl" className="w-full rounded-full" disabled={!selected.length} onClick={() => onDone(selected)}>
            {confirmLabel(selected.length)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewExerciseForm({
  defaultName,
  onCancel,
  onSave,
}: {
  defaultName: string
  onCancel: () => void
  onSave: (ex: { name: string; muscle: Muscle; kind: ExerciseKind; barbell?: boolean }) => void
}) {
  const [name, setName] = useState(defaultName)
  const [muscle, setMuscle] = useState<Muscle>("chest")
  const [kind, setKind] = useState<Exercise["kind"]>("weight")
  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-3">
      <Input
        className="h-11 rounded-xl"
        placeholder="اسم التمرين"
        aria-label="اسم التمرين"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <ToggleGroup
        value={[muscle]}
        onValueChange={(v) => v[0] && setMuscle(v[0] as Muscle)}
        variant="solid"
        className="grid w-full grid-cols-3"
        aria-label="العضلة"
      >
        {MUSCLES.map((m) => (
          <ToggleGroupItem key={m.id} value={m.id} className="rounded-full">
            {m.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        value={[kind]}
        onValueChange={(v) => v[0] && setKind(v[0] as ExerciseKind)}
        variant="solid"
        className="grid w-full grid-cols-2"
        aria-label="النوع"
      >
        <ToggleGroupItem value="weight" className="rounded-full">
          بأوزان
        </ToggleGroupItem>
        <ToggleGroupItem value="bodyweight" className="rounded-full">
          بوزن الجسم
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="flex gap-2">
        <Button className="flex-1 rounded-full" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), muscle, kind })}>
          احفظ التمرين
        </Button>
        <Button variant="ghost" className="rounded-full" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </div>
  )
}
