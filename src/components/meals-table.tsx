import { CookieIcon, MoonIcon, PlusIcon, SunIcon, SunriseIcon, Trash2Icon, UtensilsIcon } from "lucide-react"
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

/** Laptop: today's food as a table, like the activity table in the reference dashboard. */
export function MealsTable({ entries, onAdd }: { entries: Entry[]; onAdd: () => void }) {
  const removeEntry = useMizan((s) => s.removeEntry)
  const restoreEntry = useMizan((s) => s.restoreEntry)
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at))
  const total = sorted.reduce((s, e) => s + e.kcal, 0)

  const remove = (entry: Entry) => {
    removeEntry(entry.id)
    toast.add({
      title: `اتشال ${entry.name}`,
      actionProps: { children: "رجّعه", onClick: () => restoreEntry(entry) },
    })
  }

  return (
    <section aria-labelledby="meals-table-title" className="flex h-full flex-col gap-4 rounded-[1.5rem] border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 id="meals-table-title" className="text-lg font-semibold">
            أكل النهارده
          </h2>
          <p className="text-sm text-muted-foreground">
            {sorted.length
              ? `${num(sorted.length)} ${sorted.length === 1 ? "حاجة" : "حاجات"}، ${num(Math.round(total))} سعرة`
              : "لسه مفيش حاجة متسجلة"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MealActions />
          <Button variant="secondary" className="h-10 rounded-full px-4" onClick={onAdd}>
            <PlusIcon data-icon="inline-start" />
            أضف أكلة
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Empty className="flex-1 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsIcon />
            </EmptyMedia>
            <EmptyTitle>لسه مسجلتش أكل</EmptyTitle>
            <EmptyDescription>أول ما تسجل، هتلاقي يومك هنا بالترتيب.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr className="text-start">
                <th scope="col" className="px-4 py-3 text-start font-medium">الأكلة</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">الكمية</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">الوجبة</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">الساعة</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">بروتين</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">سعرات</th>
                <th scope="col" className="w-12 px-2 py-3">
                  <span className="sr-only">مسح</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {sorted.map((entry, i) => {
                  const Icon = MEAL_ICON[entry.meal]
                  return (
                    <motion.tr
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, filter: "blur(6px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)", transition: { delay: 0.03 * i } }}
                      exit={{ opacity: 0 }}
                      className="border-t transition-colors hover:bg-secondary/60"
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary" aria-hidden="true">
                            <Icon className="size-4" />
                          </span>
                          <span className="font-medium">{entry.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {num(entry.qty, 2)} {entry.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                          <span className="size-1.5 rounded-full bg-positive" aria-hidden="true" />
                          {MEALS.find((m) => m.id === entry.meal)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatTime(entry.at)}</td>
                      <td className="px-4 py-3 tabular-nums">{num(Math.round(entry.p))} جم</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{num(Math.round(entry.kcal))}</td>
                      <td className="px-2 py-3">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground"
                          aria-label={`امسح ${entry.name}`}
                          onClick={() => remove(entry)}
                        >
                          <Trash2Icon />
                        </Button>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
