import { useMemo, useState } from "react"
import { ArrowRightIcon, MinusIcon, PlusIcon, SearchIcon, SparkleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CustomFoodForm } from "@/components/custom-food-form"
import { MacroChips } from "@/components/macro-chips"
import { itemKcal, ParsedItems } from "@/components/parsed-items"
import { RecipeForm } from "@/components/recipe-form"
import type { Food } from "@/data/foods"
import { allFoods, recentFoods, searchFoods } from "@/lib/foods"
import { dateKey, num, parseNum } from "@/lib/format"
import { scaleMacros } from "@/lib/nutrition"
import { parseFoodText, type ParsedItem } from "@/lib/parse-food-text"
import { MEALS, mealForNow, useMizan, type Entry, type Meal } from "@/store"

const GRAMS = "جرام"

export type DrawerStart = "pick" | "write"

type View =
  | { name: DrawerStart }
  | { name: "amount"; food: Food; back: "pick" | "write" }
  | { name: "new"; draftName: string; back: "pick" | "write" }

export function LogFoodDrawer({
  start,
  onOpenChange,
  onLogged,
}: {
  start: DrawerStart | null
  onOpenChange: (open: boolean) => void
  onLogged: (entries: Entry[]) => void
}) {
  const [view, setView] = useState<View>({ name: start ?? "pick" })
  // Sentence typed in "write" survives a detour to add a missing food.
  const [sentence, setSentence] = useState("")

  // Each time the drawer opens, start on the view that opened it.
  const [openedWith, setOpenedWith] = useState(start)
  if (start !== openedWith) {
    setOpenedWith(start)
    if (start) setView({ name: start })
  }

  const close = () => {
    onOpenChange(false)
    setTimeout(() => setSentence(""), 300)
  }

  const finish = (entries: Entry[]) => {
    onLogged(entries)
    close()
  }

  const mode: DrawerStart = "back" in view ? view.back : view.name

  return (
    <Drawer open={start !== null} onOpenChange={(open) => !open && close()} showSwipeHandle>
      <DrawerContent className="[--drawer-content-height:calc(100dvh-3.5rem)]">
        {(view.name === "pick" || view.name === "write") && (
          <DrawerHeader className="gap-3 pb-2 text-start">
            <DrawerTitle className="text-lg font-bold">سجّل أكل</DrawerTitle>
            <DrawerDescription className="sr-only">دوّر على الأكلة أو اكتب اللي كلته في جملة</DrawerDescription>
            <Tabs value={mode} onValueChange={(v) => setView({ name: v as DrawerStart })}>
              <TabsList className="h-10 w-full rounded-full">
                <TabsTrigger value="pick" className="rounded-full">
                  دوّر في القايمة
                </TabsTrigger>
                <TabsTrigger value="write" className="rounded-full">
                  اكتب جملة
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DrawerHeader>
        )}

        {view.name === "pick" && (
          <PickFood
            onPick={(food) => setView({ name: "amount", food, back: "pick" })}
            onCreate={(draftName) => setView({ name: "new", draftName, back: "pick" })}
          />
        )}
        {view.name === "write" && (
          <WriteFood
            text={sentence}
            onText={setSentence}
            onCreate={(draftName) => setView({ name: "new", draftName, back: "write" })}
            onLogged={finish}
          />
        )}
        {view.name === "amount" && (
          <ChooseAmount food={view.food} onBack={() => setView({ name: view.back })} onLogged={(e) => finish([e])} />
        )}
        {view.name === "new" && (
          <NewFood
            draftName={view.draftName}
            onBack={() => setView({ name: view.back })}
            // Back in "write", the sentence re-parses and now finds the new food.
            onSaved={(food) => setView(view.back === "write" ? { name: "write" } : { name: "amount", food, back: "pick" })}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <DrawerHeader className="flex-row items-center gap-2 text-start">
      <Button variant="secondary" size="icon" className="rounded-full" aria-label="رجوع" onClick={onBack}>
        <ArrowRightIcon />
      </Button>
      <DrawerTitle className="truncate text-lg font-bold">{title}</DrawerTitle>
    </DrawerHeader>
  )
}

function WriteFood({
  text,
  onText,
  onCreate,
  onLogged,
}: {
  text: string
  onText: (text: string) => void
  onCreate: (name: string) => void
  onLogged: (entries: Entry[]) => void
}) {
  const customFoods = useMizan((s) => s.customFoods)
  const addEntries = useMizan((s) => s.addEntries)
  const foods = useMemo(() => allFoods(customFoods), [customFoods])
  const parsed = useMemo(() => parseFoodText(text, foods), [text, foods])
  const [edits, setEdits] = useState<{ text: string; items: ParsedItem[] } | null>(null)
  const [mealChoice, setMealChoice] = useState<Meal | null>(null)

  // Edits belong to the sentence they were made on.
  const items = edits && edits.text === text ? edits.items : parsed.items
  const meal = mealChoice ?? parsed.meal ?? mealForNow()
  const found = items.filter((i) => i.food)
  const total = found.reduce((s, i) => s + itemKcal(i), 0)

  const save = () => {
    const now = new Date()
    const saved = addEntries(
      found.map((i) => {
        const m = scaleMacros(i.food!.per100, i.grams)
        return {
          date: dateKey(now),
          at: now.toISOString(),
          meal,
          foodId: i.food!.id,
          name: i.food!.name,
          qty: i.qty,
          unit: i.unit,
          grams: i.grams,
          kcal: m.kcal,
          p: m.p,
          c: m.c,
          f: m.f,
        }
      })
    )
    onLogged(saved)
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4">
        <Textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="مثلاً: فطرت ٢ رغيف وطبق فول بالزيت وبيضتين"
          aria-label="اكتب اللي كلته"
          className="min-h-24 rounded-2xl bg-card text-base"
        />
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            اكتب الأكل وكميته زي ما بتتكلم: "رغيفين"، "نص كيلو"، "٣ معالق"، "طبق". وافصل بين الحاجات بـ "و".
          </p>
        ) : (
          <ParsedItems
            items={items}
            onChange={(i, item) => setEdits({ text, items: items.map((x, j) => (j === i ? item : x)) })}
            onRemove={(i) => setEdits({ text, items: items.filter((_, j) => j !== i) })}
            onCreate={onCreate}
          />
        )}
        {found.length > 0 && (
          <ToggleGroup
            value={[meal]}
            onValueChange={(v) => v[0] && setMealChoice(v[0] as Meal)}
            variant="solid"
            size="xl"
            className="grid w-full grid-cols-4"
            aria-label="الوجبة"
          >
            {MEALS.map((m) => (
              <ToggleGroupItem key={m.id} value={m.id} className="rounded-full">
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      <DrawerFooter className="border-t pt-3">
        <Button size="xl" className="rounded-full" disabled={!found.length} onClick={save}>
          {found.length
            ? `سجّل ${found.length === 1 ? "الأكلة" : `${num(found.length)} حاجات`} (${num(Math.round(total))} سعرة)`
            : "سجّل"}
        </Button>
      </DrawerFooter>
    </>
  )
}

function NewFood({
  draftName,
  onBack,
  onSaved,
}: {
  draftName: string
  onBack: () => void
  onSaved: (food: Food) => void
}) {
  const [kind, setKind] = useState<"label" | "recipe">("label")
  return (
    <>
      <BackHeader title="أكلة جديدة" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-8">
        <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <TabsList className="h-10 w-full rounded-full">
            <TabsTrigger value="label" className="rounded-full">
              أعرف السعرات
            </TabsTrigger>
            <TabsTrigger value="recipe" className="rounded-full">
              احسبها من المكونات
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {kind === "label" ? (
          <CustomFoodForm defaultName={draftName} onSaved={onSaved} />
        ) : (
          <RecipeForm defaultName={draftName} onSaved={onSaved} />
        )}
      </div>
    </>
  )
}

function PickFood({
  onPick,
  onCreate,
}: {
  onPick: (food: Food) => void
  onCreate: (draftName: string) => void
}) {
  const customFoods = useMizan((s) => s.customFoods)
  const entries = useMizan((s) => s.entries)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"all" | "recent" | "mine">("all")

  const foods = useMemo(() => allFoods(customFoods), [customFoods])
  const recent = useMemo(() => recentFoods(entries, foods), [entries, foods])
  const list = query.trim()
    ? searchFoods(foods, query)
    : tab === "recent"
      ? recent
      : tab === "mine"
        ? customFoods
        : foods

  return (
    <>
      <div className="flex flex-col gap-2 px-4 pt-1">
        <InputGroup className="h-11 rounded-full bg-card">
          <InputGroupInput
            placeholder="فول، رز، فراخ…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            aria-label="دوّر على أكلة"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        {!query.trim() && (
          <div className="flex gap-1.5" role="group" aria-label="القايمة">
            {(
              [
                ["all", "الكل"],
                ["recent", "آخر حاجات"],
                ["mine", "أكلاتي"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className="rounded-full border px-3 py-1.5 text-sm outline-none aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-4">
        {list.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyTitle>
                {query.trim()
                  ? `مفيش "${query.trim()}" في القايمة`
                  : tab === "recent"
                    ? "لسه مسجلتش أكل"
                    : "مضفتش أكلات بنفسك لسه"}
              </EmptyTitle>
              <EmptyDescription>
                ضيفها مرة واحدة بالسعرات اللي على العلبة، أو خليه يحسبها من مكونات الطبخة.
              </EmptyDescription>
            </EmptyHeader>
            <Button size="xl" className="rounded-full" onClick={() => onCreate(query.trim())}>
              <PlusIcon data-icon="inline-start" />
              أضف أكلة جديدة
            </Button>
          </Empty>
        ) : (
          <ItemGroup className="gap-0">
            {list.map((food) => {
              const unit = food.units[0]
              const kcal = unit ? (food.per100.kcal * unit.grams) / 100 : food.per100.kcal
              return (
                <Item
                  key={food.id}
                  role="listitem"
                  render={<button type="button" />}
                  className="rounded-2xl text-start hover:bg-card active:bg-card"
                  onClick={() => onPick(food)}
                >
                  <ItemContent>
                    <ItemTitle className="text-base">
                      {food.name}
                      {food.custom && <SparkleIcon className="size-3 text-positive" aria-label="أكلة ضفتها" />}
                    </ItemTitle>
                    <ItemDescription>
                      {unit ? `${unit.name}: ${num(kcal)} سعرة` : `١٠٠ جرام: ${num(kcal)} سعرة`}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              )
            })}
          </ItemGroup>
        )}
      </div>

      {list.length > 0 && (
        <DrawerFooter className="border-t pt-3">
          <Button variant="outline" size="xl" className="rounded-full" onClick={() => onCreate(query.trim())}>
            <PlusIcon data-icon="inline-start" />
            أكلة مش موجودة؟ ضيفها
          </Button>
        </DrawerFooter>
      )}
    </>
  )
}

function ChooseAmount({
  food,
  onBack,
  onLogged,
}: {
  food: Food
  onBack: () => void
  onLogged: (entry: Entry) => void
}) {
  const addEntry = useMizan((s) => s.addEntry)
  const [unit, setUnit] = useState(food.units[0]?.name ?? GRAMS)
  const isGrams = unit === GRAMS
  const [qtyText, setQtyText] = useState(isGrams ? "100" : "1")
  const [meal, setMeal] = useState<Meal>(mealForNow())

  const unitGrams = isGrams ? 1 : (food.units.find((u) => u.name === unit)?.grams ?? 1)
  const qty = parseNum(qtyText)
  const valid = Number.isFinite(qty) && qty > 0
  const grams = valid ? qty * unitGrams : 0
  const macros = scaleMacros(food.per100, grams)

  const step = isGrams ? 10 : 0.5
  const presets = isGrams ? [50, 100, 150, 200] : [0.5, 1, 2, 3]

  const changeUnit = (next: string) => {
    setUnit(next)
    setQtyText(next === GRAMS ? "100" : "1")
  }

  const bump = (delta: number) => {
    const base = valid ? qty : 0
    setQtyText(String(Math.max(step, Math.round((base + delta) * 100) / 100)))
  }

  const save = () => {
    if (!valid) return
    const now = new Date()
    const entry = addEntry({
      date: dateKey(now),
      at: now.toISOString(),
      meal,
      foodId: food.id,
      name: food.name,
      qty,
      unit,
      grams,
      kcal: macros.kcal,
      p: macros.p,
      c: macros.c,
      f: macros.f,
    })
    onLogged(entry)
  }

  return (
    <>
      <BackHeader title={food.name} onBack={onBack} />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-2 pb-4">
        <div className="flex flex-col gap-2 rounded-[1.5rem] bg-lime p-5 text-lime-ink">
          <p className="flex items-baseline gap-2">
            <NumberTicker
              value={Math.round(macros.kcal)}
              startValue={Math.round(macros.kcal)}
              className="text-5xl font-extrabold"
            />
            <span className="opacity-75">سعرة</span>
          </p>
          <MacroChips p={macros.p} c={macros.c} f={macros.f} className="[&_.text-muted-foreground]:text-lime-ink/70" />
        </div>

        <section className="flex flex-col gap-2" aria-label="الوحدة">
          <ToggleGroup
            value={[unit]}
            onValueChange={(v) => v[0] && changeUnit(v[0])}
            variant="solid"
            size="xl"
            className="w-full flex-wrap"
          >
            {food.units.map((u) => (
              <ToggleGroupItem key={u.name} value={u.name} className="rounded-full">
                {u.name}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value={GRAMS} className="rounded-full">
              {GRAMS}
            </ToggleGroupItem>
          </ToggleGroup>
          {!isGrams && (
            <p className="text-xs text-muted-foreground">
              {unit} = {num(unitGrams)} جرام تقريباً
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-label="الكمية">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon-xl" className="rounded-full" aria-label="زوّد" onClick={() => bump(step)}>
              <PlusIcon />
            </Button>
            <Input
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              inputMode="decimal"
              aria-label={`الكمية بال${unit}`}
              aria-invalid={!valid}
              className="h-12 flex-1 rounded-full bg-card text-center text-xl font-bold"
            />
            <Button variant="secondary" size="icon-xl" className="rounded-full" aria-label="قلّل" onClick={() => bump(-step)}>
              <MinusIcon />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((p) => (
              <Button key={p} variant="secondary" className="rounded-full" onClick={() => setQtyText(String(p))}>
                {p === 0.5 ? "نص" : num(p, 1)}
              </Button>
            ))}
          </div>
        </section>

        <ToggleGroup
          value={[meal]}
          onValueChange={(v) => v[0] && setMeal(v[0] as Meal)}
          variant="solid"
          size="xl"
          className="grid w-full grid-cols-4"
          aria-label="الوجبة"
        >
          {MEALS.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id} className="rounded-full">
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <DrawerFooter className="border-t pt-3">
        <Button size="xl" className="rounded-full" disabled={!valid} onClick={save}>
          سجّل {valid ? `${num(qty, 2)} ${unit}` : ""}
        </Button>
      </DrawerFooter>
    </>
  )
}
