import { useState } from "react"

import { Input } from "@/components/ui/input"
import { parseNum } from "@/lib/format"

/**
 * A number input that keeps what's typed ("82." or "٨٢٫") while committing
 * the parsed number, so half-typed decimals don't get swallowed.
 */
export function NumberField({
  value,
  onCommit,
  decimal = true,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "inputMode"> & {
  value: number
  onCommit: (value: number) => void
  decimal?: boolean
}) {
  const [text, setText] = useState(String(value))
  const [seen, setSeen] = useState(value)
  // Follow changes made elsewhere (e.g. a new set copied from the last one).
  if (value !== seen) {
    setSeen(value)
    if (parseNum(text) !== value) setText(String(value))
  }
  return (
    <Input
      {...props}
      inputMode={decimal ? "decimal" : "numeric"}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const v = parseNum(e.target.value)
        const next = Number.isFinite(v) ? v : 0
        setSeen(next)
        onCommit(next)
      }}
      onFocus={(e) => e.target.select()}
    />
  )
}
