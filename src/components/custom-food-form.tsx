import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Food } from "@/data/foods"
import { parseNum } from "@/lib/format"
import { useMizan } from "@/store"

type Basis = "100g" | "serving"

const MACRO_FIELDS = [
  { key: "kcal", label: "سعرات", required: true },
  { key: "p", label: "بروتين (جم)", required: false },
  { key: "c", label: "كارب (جم)", required: false },
  { key: "f", label: "دهون (جم)", required: false },
] as const

type MacroKey = (typeof MACRO_FIELDS)[number]["key"]

export function CustomFoodForm({
  defaultName,
  onSaved,
}: {
  defaultName: string
  onSaved: (food: Food) => void
}) {
  const addCustomFood = useMizan((s) => s.addCustomFood)
  const [name, setName] = useState(defaultName)
  const [basis, setBasis] = useState<Basis>("100g")
  const [servingName, setServingName] = useState("")
  const [servingGrams, setServingGrams] = useState("")
  const [values, setValues] = useState<Record<MacroKey, string>>({ kcal: "", p: "", c: "", f: "" })
  const [tried, setTried] = useState(false)

  const kcal = parseNum(values.kcal)
  const grams = basis === "serving" ? parseNum(servingGrams) : 100
  const nameOk = name.trim().length > 0
  const kcalOk = Number.isFinite(kcal) && kcal >= 0
  const servingOk = basis === "100g" || (servingName.trim().length > 0 && Number.isFinite(grams) && grams > 0)

  const save = () => {
    setTried(true)
    if (!nameOk || !kcalOk || !servingOk) return
    const read = (k: MacroKey) => {
      const v = parseNum(values[k])
      return Number.isFinite(v) && v >= 0 ? v : 0
    }
    // Everything is stored per 100 g so portions convert the same way as built-in foods.
    const factor = 100 / grams
    const food = addCustomFood({
      name: name.trim(),
      per100: {
        kcal: read("kcal") * factor,
        p: read("p") * factor,
        c: read("c") * factor,
        f: read("f") * factor,
      },
      units: basis === "serving" ? [{ name: servingName.trim(), grams }] : [],
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
        <Field data-invalid={tried && !nameOk ? true : undefined}>
          <FieldLabel htmlFor="food-name">اسم الأكلة</FieldLabel>
          <Input
            id="food-name"
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: ساندوتش كبدة من عند عم حسن"
            aria-invalid={tried && !nameOk}
          />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">القيم اللي معاك مكتوبة لكل</FieldLegend>
          <ToggleGroup
            value={[basis]}
            onValueChange={(v) => v[0] && setBasis(v[0] as Basis)}
            variant="solid"
            size="xl"
            className="grid w-full grid-cols-2"
          >
            <ToggleGroupItem value="100g">١٠٠ جرام</ToggleGroupItem>
            <ToggleGroupItem value="serving">حصة واحدة</ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            اللي على العلب غالباً لكل ١٠٠ جرام. لو بتعرف سعرات الحاجة كلها مرة واحدة، اختار حصة.
          </FieldDescription>
        </FieldSet>

        {basis === "serving" && (
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={tried && !servingName.trim() ? true : undefined}>
              <FieldLabel htmlFor="serving-name">اسم الحصة</FieldLabel>
              <Input
                id="serving-name"
                className="h-11"
                value={servingName}
                onChange={(e) => setServingName(e.target.value)}
                placeholder="ساندوتش"
                aria-invalid={tried && !servingName.trim()}
              />
            </Field>
            <Field data-invalid={tried && !servingOk && servingName.trim() ? true : undefined}>
              <FieldLabel htmlFor="serving-grams">وزنها بالجرام</FieldLabel>
              <Input
                id="serving-grams"
                className="h-11"
                inputMode="decimal"
                value={servingGrams}
                onChange={(e) => setServingGrams(e.target.value)}
                placeholder="٢٠٠"
                aria-invalid={tried && !servingOk}
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {MACRO_FIELDS.map((m) => {
            const invalid = m.key === "kcal" && tried && !kcalOk
            return (
              <Field key={m.key} data-invalid={invalid ? true : undefined}>
                <FieldLabel htmlFor={`macro-${m.key}`}>{m.label}</FieldLabel>
                <Input
                  id={`macro-${m.key}`}
                  className="h-11"
                  inputMode="decimal"
                  value={values[m.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value }))}
                  placeholder={m.required ? "مطلوب" : "٠"}
                  aria-invalid={invalid}
                />
              </Field>
            )
          })}
        </div>

        <Button type="submit" size="xl" className="rounded-full">
          احفظ الأكلة
        </Button>
      </FieldGroup>
    </form>
  )
}
