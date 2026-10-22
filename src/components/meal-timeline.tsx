import { CookieIcon, MoonIcon, SunIcon, SunriseIcon, Trash2Icon, UtensilsIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { toast } from "@/components/ui/toast"
import { MealActions } from "@/components/meal-actions"
import { formatTime, num } from "@/lib/format"
import { MEALS, useMizan, type Entry, type Meal } from "@/store"

const MEAL_ICON: Record<Meal, typeof SunIcon> = {
  breakfast: SunriseIcon,
  lunch: SunIcon,
  dinner: MoonIcon,
  snack: CookieIcon,
}

/** Today's food, newest first, each row tagged with its meal. */
export function MealTimeline({ entries, onAdd }: { entries: Entry[]; onAdd: () => void }) {
  const removeEntry = useMizan((s) => s.removeEntry)
  const restoreEntry = useMizan((s) => s.restoreEntry)
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at))

  const remove = (entry: Entry) => {
    removeEntry(entry.id)
    toast.add({
      title: `اتشال ${entry.name}`,
      actionProps: { children: "رجّعه", onClick: () => restoreEntry(entry) },
    })
  }

  return (
    <section aria-labelledby="meals-title" className="flex flex-col gap-3 rounded-[1.5rem] border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 id="meals-title" className="font-semibold">
            أكل النهارده
          </h2>
          {sorted.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {num(sorted.length)} {sorted.length === 1 ? "حاجة" : "حاجات"}، {num(Math.round(sorted.reduce((s, e) => s + e.kcal, 0)))} سعرة
            </p>
          )}
        </div>
        {sorted.length > 0 && (
          <Button variant="secondary" size="sm" className="rounded-full px-3" onClick={onAdd}>
            أضف
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 empty:hidden">
        <MealActions />
      </div>

      {sorted.length === 0 ? (
        <Empty className="py-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsIcon />
            </EmptyMedia>
            <EmptyTitle>لسه مسجلتش أكل</EmptyTitle>
            <EmptyDescription>أول ما تسجل، هتلاقي يومك هنا بالترتيب.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {sorted.map((entry, i) => {
              const Icon = MEAL_ICON[entry.meal]
              const meal = MEALS.find((m) => m.id === entry.meal)?.label
              return (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, filter: "blur(6px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0, transition: { delay: 0.04 * i } }}
                  exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
                  className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary" aria-hidden="true">
                    <Icon className="size-4.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{entry.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {num(entry.qty, 2)} {entry.unit}، {formatTime(entry.at)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-semibold tabular-nums">{num(Math.round(entry.kcal))}</span>
                    <span className="rounded-full bg-secondary px-2 text-[10px] text-muted-foreground">{meal}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label={`امسح ${entry.name}`}
                    onClick={() => remove(entry)}
                  >
                    <Trash2Icon />
                  </Button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
