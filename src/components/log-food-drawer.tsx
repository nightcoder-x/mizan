import { createContext, lazy, Suspense, useContext, useMemo, useState } from "react"
import {
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  ScanBarcodeIcon,
  SearchIcon,
  SparkleIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CustomFoodForm } from "@/components/custom-food-form"
import { MacroChips } from "@/components/macro-chips"
import { NumberField } from "@/components/number-field"
import { itemKcal, ParsedItems } from "@/components/parsed-items"
import { RecipeForm } from "@/components/recipe-form"
import type { Food } from "@/data/foods"
import { useIsDesktop } from "@/hooks/use-media-query"
import { allFoods, recentFoods, searchFoods } from "@/lib/foods"
import { dateKey, num, parseNum } from "@/lib/format"
import { scaleMacros } from "@/lib/nutrition"
import { parseFoodText, type ParsedItem } from "@/lib/parse-food-text"
import { cn } from "@/lib/utils"
import { MEALS, mealForNow, useMizan, type Entry, type Meal, type SavedMeal } from "@/store"

const GRAMS = "جرام"

// The camera decoder is heavy, so the scanner loads only when opened.
const BarcodeScanner = lazy(() =>
  import("@/components/barcode-scanner").then((m) => ({ default: m.BarcodeScanner }))
)

export type DrawerStart = "pick" | "write"

type View =
  | { name: DrawerStart }
  | { name: "amount"; food: Food; back: "pick" | "write" }
  | { name: "new"; draftName: string; back: "pick" | "write" }
  | { name: "barcode"; back: "pick" }
  | { name: "quick"; back: "pick" }

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
  const isDesktop = useIsDesktop()

  const body = (
    <>
      {(view.name === "pick" || view.name === "write") && (
        <SheetHeader className="gap-3 pb-2 text-start">
          <SheetTitle className="text-lg font-bold">سجّل أكل</SheetTitle>
          <SheetDescription className="sr-only">
            دوّر على الأكلة أو اكتب اللي كلته في جملة
          </SheetDescription>
          <Tabs
            value={mode}
            onValueChange={(v) => setView({ name: v as DrawerStart })}
          >
            <TabsList className="h-10 w-full rounded-full">
              <TabsTrigger value="pick" className="rounded-full">
                دوّر في القايمة
              </TabsTrigger>
              <TabsTrigger value="write" className="rounded-full">
                اكتب جملة
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>
      )}

      {view.name === "pick" && (
        <PickFood
          onPick={(food) => setView({ name: "amount", food, back: "pick" })}
          onCreate={(draftName) =>
            setView({ name: "new", draftName, back: "pick" })
          }
          onBarcode={() => setView({ name: "barcode", back: "pick" })}
          onQuick={() => setView({ name: "quick", back: "pick" })}
          onLogged={finish}
        />
      )}
      {view.name === "barcode" && (
        <>
          <BackHeader title="امسح باركود" onBack={() => setView({ name: "pick" })} />
          <Suspense fallback={<p className="p-6 text-center text-sm text-muted-foreground">بجهّز الكاميرا…</p>}>
            <BarcodeScanner
              onFood={(food) => setView({ name: "amount", food, back: "pick" })}
              onManual={(draftName) => setView({ name: "new", draftName, back: "pick" })}
            />
          </Suspense>
        </>
      )}
      {view.name === "quick" && (
        <QuickAdd onBack={() => setView({ name: "pick" })} onLogged={(e) => finish([e])} />
      )}
      {view.name === "write" && (
        <WriteFood
          text={sentence}
          onText={setSentence}
          onCreate={(draftName) =>
            setView({ name: "new", draftName, back: "write" })
          }
          onLogged={finish}
        />
      )}
      {view.name === "amount" && (
        <ChooseAmount
          food={view.food}
          onBack={() => setView({ name: view.back })}
          onLogged={(e) => finish([e])}
        />
      )}
      {view.name === "new" && (
        <NewFood
          draftName={view.draftName}
          onBack={() => setView({ name: view.back })}
          // Back in "write", the sentence re-parses and now finds the new food.
          onSaved={(food) =>
            setView(
              view.back === "write"
                ? { name: "write" }
                : { name: "amount", food, back: "pick" }
            )
          }
        />
      )}
    </>
  )

  // Laptop: a centered window. Phone: a sheet that slides up from the bottom.
  if (isDesktop) {
    return (
      <Dialog open={start !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="flex h-[min(46rem,88vh)] max-w-[34rem] flex-col gap-0 overflow-hidden rounded-[1.75rem] p-0 sm:max-w-[34rem] [&>[data-slot=dialog-close]]:end-4 [&>[data-slot=dialog-close]]:top-4">
          <SheetParts.Provider value={DIALOG_PARTS}>{body}</SheetParts.Provider>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer
      open={start !== null}
      onOpenChange={(open) => !open && close()}
      showSwipeHandle
    >
      <DrawerContent className="[--drawer-content-height:calc(100dvh-3.5rem)]">
        <SheetParts.Provider value={DRAWER_PARTS}>{body}</SheetParts.Provider>
      </DrawerContent>
    </Drawer>
  )
}

/** Title and description come from whichever frame (drawer or dialog) is showing the views. */
const DRAWER_PARTS = { Title: DrawerTitle, Description: DrawerDescription }
const DIALOG_PARTS = { Title: DialogTitle, Description: DialogDescription }
const SheetParts = createContext<typeof DRAWER_PARTS | typeof DIALOG_PARTS>(
  DRAWER_PARTS
)

type PartProps = { className?: string; children?: React.ReactNode }

function SheetTitle(props: PartProps) {
  const { Title } = useContext(SheetParts)
  return <Title {...props} />
}

function SheetDescription(props: PartProps) {
  const { Description } = useContext(SheetParts)
  return <Description {...props} />
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-0.5 p-4 pb-0 lg:px-6 lg:pt-6",
        className
      )}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-auto flex shrink-0 flex-col gap-2 p-4 lg:px-6 lg:pb-6",
        className
      )}
      {...props}
    />
  )
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <SheetHeader className="flex-row items-center gap-2 text-start">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        aria-label="رجوع"
        onClick={onBack}
      >
        <ArrowRightIcon />
      </Button>
      <SheetTitle className="truncate text-lg font-bold">{title}</SheetTitle>
    </SheetHeader>
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
  const [edits, setEdits] = useState<{
    text: string
    items: ParsedItem[]
  } | null>(null)
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
            اكتب الأكل وكميته زي ما بتتكلم: "رغيفين"، "نص كيلو"، "٣ معالق"،
            "طبق". وافصل بين الحاجات بـ "و".
          </p>
        ) : (
          <ParsedItems
            items={items}
            onChange={(i, item) =>
              setEdits({
                text,
                items: items.map((x, j) => (j === i ? item : x)),
              })
            }
            onRemove={(i) =>
              setEdits({ text, items: items.filter((_, j) => j !== i) })
            }
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
      <SheetFooter className="border-t pt-3">
        <Button
          size="xl"
          className="rounded-full"
          disabled={!found.length}
          onClick={save}
        >
          {found.length
            ? `سجّل ${found.length === 1 ? "الأكلة" : `${num(found.length)} حاجات`} (${num(Math.round(total))} سعرة)`
            : "سجّل"}
        </Button>
      </SheetFooter>
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
  onBarcode,
  onQuick,
  onLogged,
}: {
  onBarcode: () => void
  onQuick: () => void
  onLogged: (entries: Entry[]) => void
  onPick: (food: Food) => void
  onCreate: (draftName: string) => void
}) {
  const customFoods = useMizan((s) => s.customFoods)
  const entries = useMizan((s) => s.entries)
  const [query, setQuery] = useState("")
  const savedMeals = useMizan((s) => s.savedMeals)
  const [tab, setTab] = useState<"all" | "recent" | "mine" | "meals">("all")

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
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-10 rounded-full" onClick={onBarcode}>
            <ScanBarcodeIcon data-icon="inline-start" />
            امسح باركود
          </Button>
          <Button variant="secondary" className="h-10 rounded-full" onClick={onQuick}>
            <ZapIcon data-icon="inline-start" />
            سعرات بس
          </Button>
        </div>
        {!query.trim() && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="القايمة">
            {(
              [
                ["all", "الكل"],
                ["recent", "آخر حاجات"],
                ["mine", "أكلاتي"],
                ["meals", "وجباتي"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className="rounded-full border px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-4">
        {tab === "meals" && !query.trim() ? (
          <SavedMealsList meals={savedMeals} onLogged={onLogged} />
        ) : list.length === 0 ? (
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
                ضيفها مرة واحدة بالسعرات اللي على العلبة، أو خليه يحسبها من
                مكونات الطبخة.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              size="xl"
              className="rounded-full"
              onClick={() => onCreate(query.trim())}
            >
              <PlusIcon data-icon="inline-start" />
              أضف أكلة جديدة
            </Button>
          </Empty>
        ) : (
          <ItemGroup className="gap-0">
            {list.map((food) => {
              const unit = food.units[0]
              const kcal = unit
                ? (food.per100.kcal * unit.grams) / 100
                : food.per100.kcal
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
                      {food.custom && (
                        <SparkleIcon
                          className="size-3 text-positive"
                          aria-label="أكلة ضفتها"
                        />
                      )}
                    </ItemTitle>
                    <ItemDescription>
                      {unit
                        ? `${unit.name}: ${num(kcal)} سعرة`
                        : `١٠٠ جرام: ${num(kcal)} سعرة`}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              )
            })}
          </ItemGroup>
        )}
      </div>

      {list.length > 0 && !(tab === "meals" && !query.trim()) && (
        <SheetFooter className="border-t pt-3">
          <Button
            variant="outline"
            size="xl"
            className="rounded-full"
            onClick={() => onCreate(query.trim())}
          >
            <PlusIcon data-icon="inline-start" />
            أكلة مش موجودة؟ ضيفها
          </Button>
        </SheetFooter>
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

  const unitGrams = isGrams
    ? 1
    : (food.units.find((u) => u.name === unit)?.grams ?? 1)
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
          <MacroChips
            p={macros.p}
            c={macros.c}
            f={macros.f}
            className="[&_.text-muted-foreground]:text-lime-ink/70"
          />
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
              <ToggleGroupItem
                key={u.name}
                value={u.name}
                className="rounded-full"
              >
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
            <Button
              variant="secondary"
              size="icon-xl"
              className="rounded-full"
              aria-label="زوّد"
              onClick={() => bump(step)}
            >
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
            <Button
              variant="secondary"
              size="icon-xl"
              className="rounded-full"
              aria-label="قلّل"
              onClick={() => bump(-step)}
            >
              <MinusIcon />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((p) => (
              <Button
                key={p}
                variant="secondary"
                className="rounded-full"
                onClick={() => setQtyText(String(p))}
              >
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

      <SheetFooter className="border-t pt-3">
        <Button
          size="xl"
          className="rounded-full"
          disabled={!valid}
          onClick={save}
        >
          سجّل {valid ? `${num(qty, 2)} ${unit}` : ""}
        </Button>
      </SheetFooter>
    </>
  )
}

/** Saved meal templates: one tap logs every food in it at the current meal. */
function SavedMealsList({ meals, onLogged }: { meals: SavedMeal[]; onLogged: (entries: Entry[]) => void }) {
  const addEntries = useMizan((s) => s.addEntries)
  const removeSavedMeal = useMizan((s) => s.removeSavedMeal)
  if (!meals.length) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyTitle>مفيش وجبات محفوظة لسه</EmptyTitle>
          <EmptyDescription>
            سجّل فطارك المعتاد مرة، وبعدين من "أكل النهارده" دوس "احفظ كوجبة"، والمرة الجاية يتسجل بضغطة.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <ItemGroup className="gap-0">
      {meals.map((m) => {
        const kcal = m.items.reduce((s, i) => s + i.kcal, 0)
        return (
          <div key={m.id} className="flex items-center gap-1">
            <Item
              render={<button type="button" />}
              className="flex-1 rounded-2xl text-start hover:bg-card active:bg-card"
              onClick={() => {
                const now = new Date()
                const meal = mealForNow(now)
                onLogged(addEntries(m.items.map((i) => ({ ...i, date: dateKey(now), at: now.toISOString(), meal }))))
              }}
            >
              <ItemContent>
                <ItemTitle className="text-base">{m.name}</ItemTitle>
                <ItemDescription>
                  {num(m.items.length)} حاجات، {num(Math.round(kcal))} سعرة: {m.items.map((i) => i.name).join("، ")}
                </ItemDescription>
              </ItemContent>
            </Item>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`امسح وجبة ${m.name}`}
              onClick={() => removeSavedMeal(m.id)}
            >
              <Trash2Icon />
            </Button>
          </div>
        )
      })}
    </ItemGroup>
  )
}

/** Just calories (and protein if you know it), for food that isn't worth adding to the list. */
function QuickAdd({ onBack, onLogged }: { onBack: () => void; onLogged: (entry: Entry) => void }) {
  const addEntry = useMizan((s) => s.addEntry)
  const [name, setName] = useState("")
  const [values, setValues] = useState({ kcal: 0, p: 0, c: 0, f: 0 })
  const [meal, setMeal] = useState<Meal>(mealForNow())
  const fields = [
    { key: "kcal", label: "سعرات" },
    { key: "p", label: "بروتين (جم)" },
    { key: "c", label: "كارب (جم)" },
    { key: "f", label: "دهون (جم)" },
  ] as const

  return (
    <>
      <BackHeader title="سعرات بس" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4 lg:px-6">
        <p className="text-sm text-muted-foreground">لأكلة برا أو حاجة مش هتتكرر: اكتب السعرات وخلاص، والباقي اختياري.</p>
        <Input
          className="h-11 rounded-xl"
          placeholder="اسمها (اختياري)، مثلاً: عزومة"
          aria-label="اسم الأكلة"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm font-medium">
              {f.label}
              <NumberField
                className="h-11 rounded-xl text-center font-semibold"
                value={values[f.key]}
                onCommit={(v) => setValues((x) => ({ ...x, [f.key]: Math.max(0, v) }))}
              />
            </label>
          ))}
        </div>
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
      <SheetFooter className="border-t pt-3">
        <Button
          size="xl"
          className="rounded-full"
          disabled={values.kcal <= 0}
          onClick={() => {
            const now = new Date()
            onLogged(
              addEntry({
                date: dateKey(now),
                at: now.toISOString(),
                meal,
                foodId: "quick",
                name: name.trim() || "أكلة سريعة",
                qty: 1,
                unit: "وجبة",
                grams: 0,
                ...values,
              })
            )
          }}
        >
          سجّل {values.kcal > 0 ? `${num(values.kcal)} سعرة` : ""}
        </Button>
      </SheetFooter>
    </>
  )
}