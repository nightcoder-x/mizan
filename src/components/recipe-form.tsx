import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Textarea } from "@/components/ui/textarea"
import { MacroChips } from "@/components/macro-chips"
import { ParsedItems } from "@/components/parsed-items"
import type { Food } from "@/data/foods"
import { allFoods } from "@/lib/foods"
import { parseNum } from "@/lib/format"
import { scaleMacros, sumMacros } from "@/lib/nutrition"
import { parseFoodText, type ParsedItem } from "@/lib/parse-food-text"
import { useMizan } from "@/store"

/**
 * Home cooking: list what went into the pot, say how many plates it makes,
 * and the plate is saved as a food with its own calories.
 */
export function RecipeForm({ defaultName, onSaved }: { defaultName: string; onSaved: (food: Food) => void }) {
  const customFoods = useMizan((s) => s.customFoods)
  const addCustomFood = useMizan((s) => s.addCustomFood)
  const foods = useMemo(() => allFoods(customFoods), [customFoods])

  const [name, setName] = useState(defaultName)
  const [text, setText] = useState("")
  const [edits, setEdits] = useState<{ items: ParsedItem[] } | null>(null)
  const [servingsText, setServingsText] = useState("4")
  const [tried, setTried] = useState(false)

  const parsed = useMemo(() => parseFoodText(text, foods).items, [text, foods])
  const items = edits?.items ?? parsed
  const found = items.filter((i) => i.food)
  const total = sumMacros(found.map((i) => scaleMacros(i.food!.per100, i.grams)))
  const totalGrams = found.reduce((s, i) => s + i.grams, 0)
  const servings = parseNum(servingsText)
  const servingsOk = Number.isFinite(servings) && servings >= 1 && servings <= 50
  const perPlate = servingsOk ? Math.round(total.kcal / servings) : 0

  const save = () => {
    setTried(true)
    if (!name.trim() || !found.length || !servingsOk) return
    const factor = 100 / totalGrams
    const food = addCustomFood({
      name: name.trim(),
      per100: { kcal: total.kcal * factor, p: total.p * factor, c: total.c * factor, f: total.f * factor },
      units: [{ name: "طبق", grams: totalGrams / servings }],
    })
    onSaved(food)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <FieldGroup>
        <Field data-invalid={tried && !name.trim() ? true : undefined}>
          <FieldLabel htmlFor="recipe-name">اسم الطبخة</FieldLabel>
          <Input
            id="recipe-name"
            className="h-11 rounded-xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: مكرونة بالبشاميل بتاعة ماما"
            aria-invalid={tried && !name.trim()}
          />
        </Field>

        <Field data-invalid={tried && !found.length ? true : undefined}>
          <FieldLabel htmlFor="recipe-ingredients">اللي دخل في الحلة</FieldLabel>
          <Textarea
            id="recipe-ingredients"
            className="min-h-24 rounded-xl text-base"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setEdits(null)
            }}
            placeholder="نص كيلو لحمة مفرومة نية، ٢ كوب رز ني، ٣ معالق زيت، بصلة"
          />
          <FieldDescription>اكتب المكونات وهي نية، كل واحدة بكميتها، وافصل بينهم بفاصلة أو "و".</FieldDescription>
        </Field>

        {items.length > 0 && (
          <ParsedItems
            items={items}
            onChange={(i, item) => setEdits({ items: items.map((x, j) => (j === i ? item : x)) })}
            onRemove={(i) => setEdits({ items: items.filter((_, j) => j !== i) })}
          />
        )}

        <Field data-invalid={tried && !servingsOk ? true : undefined}>
          <FieldLabel htmlFor="recipe-servings">الحلة بتعمل كام طبق؟</FieldLabel>
          <Input
            id="recipe-servings"
            className="h-11 rounded-xl"
            inputMode="numeric"
            value={servingsText}
            onChange={(e) => setServingsText(e.target.value)}
            aria-invalid={tried && !servingsOk}
          />
        </Field>

        {found.length > 0 && servingsOk && (
          <div className="flex flex-col gap-2 rounded-2xl bg-lime p-4 text-lime-ink">
            <span className="text-sm font-medium opacity-75">الطبق الواحد</span>
            <p className="flex items-baseline gap-2">
              <NumberTicker value={perPlate} startValue={perPlate} className="text-4xl font-extrabold" />
              <span className="opacity-75">سعرة</span>
            </p>
            <MacroChips p={total.p / servings} c={total.c / servings} f={total.f / servings} className="[&_.text-muted-foreground]:text-lime-ink/70" />
          </div>
        )}

        <Button type="submit" size="xl" className="rounded-full">
          احفظ الطبخة
        </Button>
      </FieldGroup>
    </form>
  )
}
