import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { NumberTicker } from "@/components/ui/number-ticker"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { num, parseNum } from "@/lib/format"
import {
  ACTIVITY_LEVELS,
  GOALS,
  computeTargets,
  tdee,
  type ActivityLevel,
  type Goal,
  type Profile,
  type Sex,
} from "@/lib/nutrition"

const LIMITS = {
  age: { min: 14, max: 90, unit: "سنة", label: "السن" },
  height: { min: 120, max: 230, unit: "سم", label: "الطول" },
  weight: { min: 30, max: 300, unit: "كجم", label: "الوزن" },
} as const

type NumKey = keyof typeof LIMITS

export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: Profile | null
  submitLabel: string
  onSubmit: (profile: Profile) => void
}) {
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "male")
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity ?? "moderate")
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "cut")
  const [text, setText] = useState<Record<NumKey, string>>({
    age: initial ? String(initial.age) : "",
    height: initial ? String(initial.heightCm) : "",
    weight: initial ? String(initial.weightKg) : "",
  })
  const [tried, setTried] = useState(false)

  const value = (k: NumKey) => parseNum(text[k])
  const ok = (k: NumKey) => {
    const v = value(k)
    return Number.isFinite(v) && v >= LIMITS[k].min && v <= LIMITS[k].max
  }
  const allOk = ok("age") && ok("height") && ok("weight")
  const profile: Profile | null = allOk
    ? { sex, age: Math.round(value("age")), heightCm: value("height"), weightKg: value("weight"), activity, goal }
    : null
  const preview = profile ? computeTargets(profile) : null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (profile) onSubmit(profile)
      }}
    >
      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">النوع</FieldLegend>
          <ToggleGroup
            value={[sex]}
            onValueChange={(v) => v[0] && setSex(v[0] as Sex)}
            variant="solid"
            size="xl"
            className="grid w-full grid-cols-2"
          >
            <ToggleGroupItem value="male">ذكر</ToggleGroupItem>
            <ToggleGroupItem value="female">أنثى</ToggleGroupItem>
          </ToggleGroup>
        </FieldSet>

        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(LIMITS) as NumKey[]).map((k) => {
            const invalid = tried && !ok(k)
            return (
              <Field key={k} data-invalid={invalid ? true : undefined}>
                <FieldLabel htmlFor={`profile-${k}`}>{LIMITS[k].label}</FieldLabel>
                <InputGroup className="h-11 rounded-xl">
                  <InputGroupInput
                    id={`profile-${k}`}
                    inputMode={k === "age" ? "numeric" : "decimal"}
                    value={text[k]}
                    onChange={(e) => setText((t) => ({ ...t, [k]: e.target.value }))}
                    aria-invalid={invalid}
                    className="font-semibold"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>{LIMITS[k].unit}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            )
          })}
        </div>
        {tried && !allOk && (
          <FieldDescription className="text-destructive">
            اكتب السن من ١٤ لـ ٩٠، والطول من ١٢٠ لـ ٢٣٠ سم، والوزن من ٣٠ لـ ٣٠٠ كجم.
          </FieldDescription>
        )}

        <FieldSet>
          <FieldLegend variant="label">نشاطك</FieldLegend>
          <ToggleGroup
            value={[activity]}
            onValueChange={(v) => v[0] && setActivity(v[0] as ActivityLevel)}
            variant="solid"
            orientation="vertical"
            className="w-full"
          >
            {ACTIVITY_LEVELS.map((a) => (
              <ToggleGroupItem key={a.id} value={a.id} className="h-auto justify-between px-4 py-3">
                <span className="font-semibold">{a.label}</span>
                <span className="text-xs font-normal opacity-75">{a.hint}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">هدفك</FieldLegend>
          <ToggleGroup
            value={[goal]}
            onValueChange={(v) => v[0] && setGoal(v[0] as Goal)}
            variant="solid"
            className="grid w-full grid-cols-3"
          >
            {GOALS.map((g) => (
              <ToggleGroupItem key={g.id} value={g.id} className="h-auto flex-col gap-0.5 py-3">
                <span className="font-semibold">{g.label}</span>
                <span className="text-[0.7rem] font-normal opacity-75">{g.hint}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>

        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4" aria-live="polite">
          {preview && profile ? (
            <>
              <p className="flex items-baseline gap-2">
                <NumberTicker value={preview.kcal} startValue={preview.kcal} className="text-4xl font-black" />
                <span className="text-muted-foreground">سعرة في اليوم</span>
              </p>
              <p className="text-sm text-muted-foreground">
                حرقك اليومي تقريباً {num(Math.round(tdee(profile) / 10) * 10)} سعرة. بروتين {num(preview.protein)} جم،
                كارب {num(preview.carbs)} جم، دهون {num(preview.fat)} جم.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">اكتب السن والطول والوزن وهدفك هيتحسب هنا.</p>
          )}
        </div>

        <Button type="submit" size="xl" className="rounded-full">
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
