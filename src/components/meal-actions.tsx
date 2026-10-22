import { useState } from "react"
import { BookmarkPlusIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { addDays, dateKey, num } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MEALS, useMizan, type Entry, type Meal, type SavedMealItem } from "@/store"

/** The food part of an entry, without when it was eaten. */
const toTemplate = (e: Entry): SavedMealItem => ({
  foodId: e.foodId,
  name: e.name,
  qty: e.qty,
  unit: e.unit,
  grams: e.grams,
  kcal: e.kcal,
  p: e.p,
  c: e.c,
  f: e.f,
})

/** "Repeat yesterday" and "save as a meal", next to today's food. */
export function MealActions() {
  const today = dateKey()
  const yesterday = addDays(today, -1)
  const entries = useMizan((s) => s.entries)
  const addEntries = useMizan((s) => s.addEntries)
  const removeEntry = useMizan((s) => s.removeEntry)
  const saveMeal = useMizan((s) => s.saveMeal)
  const [dialog, setDialog] = useState<null | "repeat" | "save">(null)
  const [picked, setPicked] = useState<Meal[]>([])
  const [name, setName] = useState("")

  const source = dialog === "save" ? today : yesterday
  const mealsOn = (date: string) =>
    MEALS.map((m) => {
      const items = entries.filter((e) => e.date === date && e.meal === m.id)
      return { ...m, items, kcal: items.reduce((s, e) => s + e.kcal, 0) }
    }).filter((m) => m.items.length)
  const options = mealsOn(source)
  const hasYesterday = mealsOn(yesterday).length > 0
  const hasToday = mealsOn(today).length > 0

  const open = (kind: "repeat" | "save") => {
    const available = mealsOn(kind === "save" ? today : yesterday)
    setPicked(kind === "save" ? available.slice(0, 1).map((m) => m.id) : available.map((m) => m.id))
    setName(kind === "save" && available[0] ? `${available[0].label} المعتاد` : "")
    setDialog(kind)
  }

  const confirm = () => {
    const items = options.filter((m) => picked.includes(m.id)).flatMap((m) => m.items)
    if (!items.length) return
    if (dialog === "repeat") {
      const now = new Date().toISOString()
      const saved = addEntries(items.map((e) => ({ ...toTemplate(e), meal: e.meal, date: today, at: now })))
      toast.add({
        title: `اتكرر ${num(saved.length)} حاجات من امبارح`,
        actionProps: { children: "تراجع", onClick: () => saved.forEach((e) => removeEntry(e.id)) },
      })
    } else {
      saveMeal(name.trim() || "وجبة", items.map(toTemplate))
      toast.add({ title: "الوجبة اتحفظت", description: 'هتلاقيها في "وجباتي" وانت بتسجل', type: "success" })
    }
    setDialog(null)
  }

  return (
    <>
      {hasYesterday && (
        <Button variant="secondary" size="sm" className="rounded-full px-3" onClick={() => open("repeat")}>
          <CopyIcon data-icon="inline-start" />
          كرر امبارح
        </Button>
      )}
      {hasToday && (
        <Button variant="secondary" size="sm" className="rounded-full px-3" onClick={() => open("save")}>
          <BookmarkPlusIcon data-icon="inline-start" />
          احفظ كوجبة
        </Button>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm rounded-[1.5rem] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === "repeat" ? "كرر أكل امبارح" : "احفظ كوجبة"}</DialogTitle>
            <DialogDescription>
              {dialog === "repeat" ? "اختار الوجبات اللي هتتكرر النهارده." : "اختار من أكل النهارده، وسمّيها."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "save" && (
            <Input
              className="h-11 rounded-xl"
              aria-label="اسم الوجبة"
              placeholder="مثلاً: فطاري المعتاد"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <div className="flex flex-col gap-2" role="group" aria-label="الوجبات">
            {options.map((m) => {
              const on = picked.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{m.label}</span>
                    <span className="text-xs opacity-75">{m.items.map((i) => i.name).join("، ")}</span>
                  </span>
                  <span className="text-sm tabular-nums">{num(Math.round(m.kcal))}</span>
                </button>
              )
            })}
          </div>
          <DialogFooter>
            <Button className="rounded-full" disabled={!picked.length} onClick={confirm}>
              {dialog === "repeat" ? "كرر" : "احفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
