import { useEffect, useMemo, useState } from "react"
import confetti from "canvas-confetti"
import {
  CheckIcon,
  DumbbellIcon,
  HistoryIcon,
  PlayIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  TrophyIcon,
  XIcon,
} from "lucide-react"
import { motion } from "motion/react"

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
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { NumberField } from "@/components/number-field"
import { ExercisePicker } from "@/components/workout/exercise-picker"
import { PlateView } from "@/components/workout/plate-view"
import { RestTimer } from "@/components/workout/rest-timer"
import { MUSCLES, STARTER_ROUTINES, type Exercise } from "@/data/exercises"
import { formatDay, num } from "@/lib/format"
import { allExercises, bestLifts, estimate1RM, lastSets, weeklySetsByMuscle, workoutVolume } from "@/lib/training"
import { cn } from "@/lib/utils"
import { useMizan, type Workout, type WorkoutSet } from "@/store"

const card = "rounded-[1.5rem] border bg-card p-5 lg:p-6"

/** Only ever called from event handlers; kept outside components so render stays pure. */
const now = () => Date.now()

export function WorkoutScreen() {
  const workouts = useMizan((s) => s.workouts)
  const active = workouts.find((w) => !w.finishedAt)
  return active ? <ActiveWorkout workout={active} /> : <WorkoutHome />
}

function WorkoutHome() {
  const workouts = useMizan((s) => s.workouts)
  const routines = useMizan((s) => s.routines)
  const custom = useMizan((s) => s.customExercises)
  const startWorkout = useMizan((s) => s.startWorkout)
  const saveRoutine = useMizan((s) => s.saveRoutine)
  const removeRoutine = useMizan((s) => s.removeRoutine)
  const removeWorkout = useMizan((s) => s.removeWorkout)
  const exercises = useMemo(() => allExercises(custom), [custom])
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const [picker, setPicker] = useState<null | "routine" | "empty">(null)
  const [routineName, setRoutineName] = useState("")

  const done = workouts.filter((w) => w.finishedAt)
  const best = bestLifts(done)
  const muscleSets = weeklySetsByMuscle(done, exercises)
  const list = routines.length ? routines : STARTER_ROUTINES.map((r, i) => ({ ...r, id: `starter-${i}` }))

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <BlurFade className="flex flex-col gap-1 pt-1">
        <h1 className="text-[1.9rem] font-bold tracking-tight lg:text-[2.6rem]">التمرين</h1>
        <p className="text-muted-foreground">
          {done.length ? `${num(done.length)} تمرينة متسجلة. يلا نكسر رقم النهارده.` : "اختار روتين وابدأ، أو ابدأ تمرين فاضي وضيف وانت ماشي."}
        </p>
      </BlurFade>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <BlurFade delay={0.05} className={cn(card, "flex flex-col gap-4 lg:col-span-7")}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">ابدأ تمرين</h2>
            <Button variant="secondary" size="sm" className="rounded-full px-3" onClick={() => setPicker("routine")}>
              <PlusIcon data-icon="inline-start" />
              روتين جديد
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{r.name}</span>
                  {!r.id.startsWith("starter-") && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="-me-1 -mt-1 text-muted-foreground"
                      aria-label={`امسح روتين ${r.name}`}
                      onClick={() => removeRoutine(r.id)}
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {r.exerciseIds.map((id) => byId.get(id)?.name).filter(Boolean).join("، ")}
                </p>
                <Button className="mt-auto rounded-full" onClick={() => startWorkout(r.name, r.exerciseIds)}>
                  <PlayIcon data-icon="inline-start" />
                  ابدأ
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="xl" className="rounded-full" onClick={() => setPicker("empty")}>
            <DumbbellIcon data-icon="inline-start" />
            تمرين فاضي
          </Button>
        </BlurFade>

        <BlurFade delay={0.1} className={cn(card, "flex flex-col gap-4 lg:col-span-5")}>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold">سيتات كل عضلة الأسبوع ده</h2>
            <p className="text-sm text-muted-foreground">من ١٠ لـ ٢٠ سيت في الأسبوع هو المدى المعروف للتضخيم.</p>
          </div>
          <ul className="flex flex-col gap-3">
            {MUSCLES.map((m, i) => {
              const sets = muscleSets.get(m.id) ?? 0
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="w-12 text-sm">{m.label}</span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                    {/* the 10–20 band */}
                    <span className="absolute inset-y-0 start-[40%] w-[40%] bg-lime/25" aria-hidden="true" />
                    <motion.span
                      className={cn("absolute inset-y-0 start-0 rounded-full", sets >= 10 ? "bg-lime" : "bg-foreground")}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(sets / 25, 1) * 100}%` }}
                      transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.2 + i * 0.05 }}
                    />
                  </div>
                  <span className="w-8 text-end text-sm font-semibold tabular-nums">{num(sets)}</span>
                </li>
              )
            })}
          </ul>
        </BlurFade>

        <BlurFade delay={0.15} className={cn(card, "flex flex-col gap-3 lg:col-span-5")}>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <TrophyIcon className="size-5" aria-hidden="true" />
            أرقامك
          </h2>
          {best.size === 0 ? (
            <p className="text-sm text-muted-foreground">أول ما تخلص تمرينة هتلاقي أحسن رقم في كل تمرين هنا.</p>
          ) : (
            <ul className="flex flex-col">
              {[...best.entries()]
                .sort((a, b) => b[1].e1rm - a[1].e1rm)
                .slice(0, 8)
                .map(([id, b]) => (
                  <li key={id} className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
                    <span className="flex-1 font-medium">{byId.get(id)?.name ?? "تمرين"}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {num(b.weight, 1)} × {num(b.reps)}
                    </span>
                    <span className="rounded-full bg-lime/30 px-2 py-0.5 text-xs font-semibold text-positive tabular-nums">
                      أقصى ≈ {num(Math.round(b.e1rm))}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </BlurFade>

        <BlurFade delay={0.2} className={cn(card, "flex flex-col gap-3 lg:col-span-7")}>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HistoryIcon className="size-5" aria-hidden="true" />
            التمارين اللي فاتت
          </h2>
          {done.length === 0 ? (
            <Empty className="py-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <DumbbellIcon />
                </EmptyMedia>
                <EmptyTitle>لسه مفيش تمارين</EmptyTitle>
                <EmptyDescription>ابدأ أول تمرينة وهتتسجل هنا بالسيتات والأوزان.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col">
              {[...done].reverse().slice(0, 12).map((w) => {
                const sets = w.exercises.reduce((s, e) => s + e.sets.length, 0)
                const minutes = Math.round((new Date(w.finishedAt!).getTime() - new Date(w.startedAt).getTime()) / 60000)
                return (
                  <li key={w.id} className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{w.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDay(w.date)}، {num(minutes)} دقيقة، {num(sets)} سيت
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{num(Math.round(workoutVolume(w)))} كجم</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label={`امسح تمرين ${formatDay(w.date)}`}
                      onClick={() => {
                        removeWorkout(w.id)
                        toast.add({ title: "التمرينة اتمسحت" })
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </BlurFade>
      </div>

      <ExercisePicker
        key={picker ?? "closed"}
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        title={picker === "routine" ? "روتين جديد" : "اختار التمارين"}
        confirmLabel={(n) => (picker === "routine" ? `احفظ الروتين (${num(n)} تمارين)` : `ابدأ بـ ${num(n)} تمارين`)}
        onDone={(ids) => {
          if (picker === "routine") {
            saveRoutine({ name: routineName.trim() || "روتين", exerciseIds: ids })
            setRoutineName("")
          } else {
            startWorkout("تمرين", ids)
          }
          setPicker(null)
        }}
      >
        {picker === "routine" && (
          <Input
            className="h-11 rounded-xl"
            placeholder="اسم الروتين، مثلاً: صدر وترايسبس"
            aria-label="اسم الروتين"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
          />
        )}
      </ExercisePicker>
    </div>
  )
}

function useElapsed(since: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (x: number) => num(x).padStart(2, "٠")
  return h ? `${num(h)}:${two(m)}:${two(sec)}` : `${num(m)}:${two(sec)}`
}

function ActiveWorkout({ workout }: { workout: Workout }) {
  const workouts = useMizan((s) => s.workouts)
  const custom = useMizan((s) => s.customExercises)
  const updateWorkout = useMizan((s) => s.updateWorkout)
  const finishWorkout = useMizan((s) => s.finishWorkout)
  const removeWorkout = useMizan((s) => s.removeWorkout)
  const saveRoutine = useMizan((s) => s.saveRoutine)
  const restSeconds = useMizan((s) => s.restSeconds)
  const exercises = useMemo(() => allExercises(custom), [custom])
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const elapsed = useElapsed(workout.startedAt)
  const [adding, setAdding] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null)

  const previousBest = useMemo(() => bestLifts(workouts, workout.id), [workouts, workout.id])
  const doneSets = workout.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0)

  const setSets = (exerciseId: string, update: (sets: WorkoutSet[]) => WorkoutSet[]) =>
    updateWorkout(workout.id, (w) => ({
      ...w,
      exercises: w.exercises.map((e) => (e.exerciseId === exerciseId ? { ...e, sets: update(e.sets) } : e)),
    }))

  const completeSet = (exerciseId: string, index: number, set: WorkoutSet) => {
    const finishing = !set.done
    setSets(exerciseId, (sets) => sets.map((s, i) => (i === index ? { ...s, done: finishing } : s)))
    if (!finishing) return
    setRest({ endsAt: now() + restSeconds * 1000, total: restSeconds })
    const prev = previousBest.get(exerciseId)
    const e1rm = estimate1RM(set.weight, set.reps)
    if (prev && e1rm > prev.e1rm + 0.01) {
      void confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#c5f23a", "#111113", "#a3a3ab"], disableForReducedMotion: true })
      toast.add({
        title: `رقم جديد في ${byId.get(exerciseId)?.name ?? "التمرين"} 🏆`,
        description: `أقصى وزن متوقع بقى ${num(Math.round(e1rm))} كجم بدل ${num(Math.round(prev.e1rm))}`,
        type: "success",
      })
    }
  }

  const finish = () => {
    if (doneSets === 0) {
      removeWorkout(workout.id)
      toast.add({ title: "مفيش ولا سيت متعلم عليه، فالتمرينة اتلغت" })
      return
    }
    finishWorkout(workout.id)
    toast.add({
      title: "عاش، التمرينة خلصت 💪",
      description: `${num(doneSets)} سيت، وحجم ${num(Math.round(workoutVolume(workout)))} كجم`,
      type: "success",
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-16 lg:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div className="flex flex-col gap-1">
          <span className="w-fit rounded-full bg-lime px-3 py-0.5 text-sm font-semibold text-lime-ink">شغال دلوقتي</span>
          <h1 className="text-[1.9rem] font-bold tracking-tight lg:text-[2.6rem]">{workout.name}</h1>
          <p className="text-muted-foreground tabular-nums">
            <span dir="ltr">{elapsed}</span>، {num(doneSets)} سيت خلصوا
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="xl" className="rounded-full" onClick={finish}>
            <CheckIcon data-icon="inline-start" />
            خلّص التمرين
          </Button>
          <Button variant="ghost" size="icon-xl" className="rounded-full" aria-label="الغي التمرين" onClick={() => setConfirmQuit(true)}>
            <XIcon />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {workout.exercises.map((ex) => {
          const exercise = byId.get(ex.exerciseId)
          if (!exercise) return null
          return (
            <ExerciseCard
              key={ex.exerciseId}
              exercise={exercise}
              sets={ex.sets}
              last={lastSets(workouts, ex.exerciseId, workout.id)}
              best={previousBest.get(ex.exerciseId)?.e1rm}
              onChange={(update) => setSets(ex.exerciseId, update)}
              onComplete={(i, s) => completeSet(ex.exerciseId, i, s)}
              onRemove={() =>
                updateWorkout(workout.id, (w) => ({ ...w, exercises: w.exercises.filter((e) => e.exerciseId !== ex.exerciseId) }))
              }
            />
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="xl" className="flex-1 rounded-full" onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          أضف تمرين
        </Button>
        <Button
          variant="ghost"
          size="xl"
          className="rounded-full"
          onClick={() => {
            saveRoutine({ name: workout.name, exerciseIds: workout.exercises.map((e) => e.exerciseId) })
            toast.add({ title: "اتحفظ كروتين", type: "success" })
          }}
        >
          <SaveIcon data-icon="inline-start" />
          احفظه كروتين
        </Button>
      </div>

      <ExercisePicker
        key={adding ? "open" : "closed"}
        open={adding}
        onOpenChange={setAdding}
        title="أضف تمرين"
        confirmLabel={(n) => `أضف ${num(n)}`}
        onDone={(ids) => {
          updateWorkout(workout.id, (w) => ({
            ...w,
            exercises: [
              ...w.exercises,
              ...ids.filter((id) => !w.exercises.some((e) => e.exerciseId === id)).map((exerciseId) => ({ exerciseId, sets: [] })),
            ],
          }))
          setAdding(false)
        }}
      />

      <RestTimer
        endsAt={rest?.endsAt ?? null}
        total={rest?.total ?? restSeconds}
        onAdjust={(s) => setRest((r) => (r ? { endsAt: r.endsAt + s * 1000, total: r.total + s } : r))}
        onClose={() => setRest(null)}
      />

      <AlertDialog open={confirmQuit} onOpenChange={setConfirmQuit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تلغي التمرينة دي؟</AlertDialogTitle>
            <AlertDialogDescription>السيتات اللي سجلتها فيها هتتمسح.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>لأ، كمّل</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => removeWorkout(workout.id)}>
              الغيها
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ExerciseCard({
  exercise,
  sets,
  last,
  best,
  onChange,
  onComplete,
  onRemove,
}: {
  exercise: Exercise
  sets: WorkoutSet[]
  last: WorkoutSet[]
  best?: number
  onChange: (update: (sets: WorkoutSet[]) => WorkoutSet[]) => void
  onComplete: (index: number, set: WorkoutSet) => void
  onRemove: () => void
}) {
  const [platesFor, setPlatesFor] = useState<number | null>(null)
  const isBody = exercise.kind === "bodyweight"

  const addSet = () =>
    onChange((s) => {
      // Start from the previous set, or from the same set last session.
      const from = s[s.length - 1] ?? last[s.length] ?? last[last.length - 1]
      return [...s, { weight: from?.weight ?? (isBody ? 0 : 20), reps: from?.reps ?? 10, done: false }]
    })

  const edit = (i: number, field: "weight" | "reps", v: number) =>
    onChange((s) => s.map((x, j) => (j === i ? { ...x, [field]: v } : x)))

  return (
    <section className={cn(card, "flex flex-col gap-3")} aria-label={exercise.name}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">{exercise.name}</h2>
          <p className="text-xs text-muted-foreground">
            {last.length
              ? `آخر مرة: ${last.map((s) => (isBody && !s.weight ? num(s.reps) : `${num(s.weight, 1)}×${num(s.reps)}`)).join("، ")}`
              : "أول مرة تعمل التمرين ده"}
            {best ? `، أقصى متوقع ${num(Math.round(best))} كجم` : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`شيل ${exercise.name}`} onClick={onRemove}>
          <XIcon />
        </Button>
      </div>

      {sets.length > 0 && (
        <div className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 text-xs text-muted-foreground">
          <span className="text-center">سيت</span>
          <span>{isBody ? "زيادة كجم" : "كجم"}</span>
          <span>عدات</span>
          <span className="sr-only">خلص</span>
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {sets.map((s, i) => (
          <li key={i} className="flex flex-col gap-2">
            <div
              className={cn(
                "grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-2xl transition-colors",
                s.done && "bg-lime/25"
              )}
            >
              <button
                type="button"
                className={cn("text-center text-sm font-semibold", exercise.barbell && "underline decoration-dotted underline-offset-4")}
                onClick={() => exercise.barbell && setPlatesFor(platesFor === i ? null : i)}
                aria-label={exercise.barbell ? `سيت ${num(i + 1)}: ورّيني الأوزان على البار` : `سيت ${num(i + 1)}`}
                disabled={!exercise.barbell}
              >
                {num(i + 1)}
              </button>
              <NumberField
                aria-label={`وزن سيت ${num(i + 1)}`}
                className="h-11 rounded-xl bg-background text-center font-semibold"
                value={s.weight}
                onCommit={(v) => edit(i, "weight", v)}
              />
              <NumberField
                decimal={false}
                aria-label={`عدات سيت ${num(i + 1)}`}
                className="h-11 rounded-xl bg-background text-center font-semibold"
                value={s.reps}
                onCommit={(v) => edit(i, "reps", v)}
              />
              <button
                type="button"
                aria-pressed={s.done}
                aria-label={s.done ? `سيت ${num(i + 1)} خلص، دوس عشان ترجعه` : `خلّص سيت ${num(i + 1)}`}
                onClick={() => onComplete(i, s)}
                className={cn(
                  "grid size-11 place-items-center rounded-xl border outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  s.done ? "border-transparent bg-lime text-lime-ink" : "bg-background"
                )}
              >
                <CheckIcon className="size-5" />
              </button>
            </div>
            {platesFor === i && exercise.barbell && (
              <div className="rounded-2xl bg-secondary p-3">
                <PlateView total={s.weight} />
              </div>
            )}
          </li>
        ))}
      </ol>
      <Button variant="secondary" className="h-10 rounded-full" onClick={addSet}>
        <PlusIcon data-icon="inline-start" />
        سيت
      </Button>
      {exercise.barbell && sets.length > 0 && (
        <p className="text-[11px] text-muted-foreground">دوس على رقم السيت عشان تشوف تحط أنهي أوزان على البار.</p>
      )}
    </section>
  )
}
