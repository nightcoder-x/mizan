import { useState } from "react"
import { Trash2Icon } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { addDays, dateKey, formatDay, formatShortDay, num, parseNum } from "@/lib/format"
import { trendChange, withTrend } from "@/lib/weights"
import { useMizan } from "@/store"

const chartConfig = {
  kg: { label: "الميزان", color: "var(--muted-foreground)" },
  avg: { label: "متوسط ٧ أيام", color: "var(--foreground)" },
} satisfies ChartConfig

const RANGES = [
  { id: "30", label: "شهر", days: 30 },
  { id: "90", label: "٣ شهور", days: 90 },
  { id: "all", label: "الكل", days: Infinity },
]

export function WeightScreen() {
  const weights = useMizan((s) => s.weights)
  const logWeight = useMizan((s) => s.logWeight)
  const removeWeight = useMizan((s) => s.removeWeight)
  const today = dateKey()
  const todays = weights.find((w) => w.date === today)
  const [text, setText] = useState("")
  const [tried, setTried] = useState(false)
  const [range, setRange] = useState("30")

  const kg = parseNum(text)
  const valid = Number.isFinite(kg) && kg >= 25 && kg <= 300

  const save = () => {
    setTried(true)
    if (!valid) return
    logWeight(Math.round(kg * 10) / 10)
    setText("")
    setTried(false)
    toast.add({ title: `اتسجل ${num(kg, 1)} كجم`, type: "success" })
  }

  const days = RANGES.find((r) => r.id === range)?.days ?? 30
  const from = Number.isFinite(days) ? addDays(today, -(days - 1)) : ""
  const data = withTrend(weights)
    .filter((w) => w.date >= from)
    .map((w) => ({ ...w, avg: Math.round(w.avg * 10) / 10 }))
  const change = trendChange(weights)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="pt-2 text-3xl font-extrabold">الوزن</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field data-invalid={tried && !valid ? true : undefined}>
          <FieldLabel htmlFor="weight-input">{todays ? "عدّل وزن النهارده" : "وزن النهارده"}</FieldLabel>
          <div className="flex gap-2">
            <InputGroup className="h-12 flex-1 rounded-xl">
              <InputGroupInput
                id="weight-input"
                inputMode="decimal"
                placeholder={todays ? num(todays.kg, 1) : "٨٠٫٥"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-invalid={tried && !valid}
                className="text-lg font-bold"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>كجم</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <Button type="submit" size="xl" className="rounded-full">
              سجّل
            </Button>
          </div>
          <FieldDescription>
            {tried && !valid ? "اكتب وزن بين ٢٥ و٣٠٠ كجم." : "أدق وقت: الصبح بعد الحمام وقبل الأكل."}
          </FieldDescription>
        </Field>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الاتجاه</CardTitle>
          <CardDescription>
            {change === null
              ? "النقط وزنك كل يوم، والخط المتوسط. سجّل أسبوع عشان الخط يبان."
              : `المتوسط ${change < 0 ? "نزل" : "زاد"} ${num(Math.abs(change), 1)} كجم آخر أسبوع.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleGroup
            value={[range]}
            onValueChange={(v) => v[0] && setRange(v[0])}
            variant="solid"
            className="grid w-full grid-cols-3"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.id} value={r.id}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {data.length < 2 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">سجّل وزنك يومين على الأقل عشان الرسم يظهر.</p>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-[4/3] w-full">
              <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  reversed
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickFormatter={(d: string) => formatShortDay(d)}
                />
                <YAxis
                  orientation="right"
                  domain={["dataMin - 0.5", "dataMax + 0.5"]}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v: number) => num(v, 1)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const d = payload?.[0]?.payload?.date as string | undefined
                        return d ? formatDay(d) : ""
                      }}
                    />
                  }
                />
                <Line dataKey="kg" stroke="none" dot={{ r: 3, fill: "var(--color-kg)" }} isAnimationActive={false} />
                <Line dataKey="avg" type="monotone" stroke="var(--color-avg)" strokeWidth={3} dot={false} isAnimationActive={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {weights.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="weigh-ins">
          <h2 id="weigh-ins" className="font-semibold">
            كل الأوزان
          </h2>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {[...weights].reverse().map((w) => (
              <li key={w.date} className="flex items-center gap-3 ps-4 pe-1 py-1">
                <span className="flex-1 text-sm">{formatDay(w.date)}</span>
                <span className="font-semibold tabular-nums">{num(w.kg, 1)} كجم</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`امسح وزن ${formatDay(w.date)}`}
                  onClick={() => {
                    removeWeight(w.date)
                    toast.add({
                      title: "اتمسح الوزن",
                      actionProps: { children: "رجّعه", onClick: () => logWeight(w.kg, w.date) },
                    })
                  }}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
