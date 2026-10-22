const formatters = new Map<number, Intl.NumberFormat>()

/** Formats with Arabic-Indic digits, e.g. 2300 -> ٢٬٣٠٠ */
export function num(value: number, fractionDigits = 0) {
  let formatter = formatters.get(fractionDigits)
  if (!formatter) {
    formatter = new Intl.NumberFormat("ar-EG", {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: 0,
    })
    formatters.set(fractionDigits, formatter)
  }
  return formatter.format(value)
}

/** Reads numbers typed with Arabic-Indic, Persian or Latin digits. Returns NaN when empty. */
export function parseNum(input: string) {
  const latin = input
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, ".")
    .replace(/٬/g, "")
  if (latin === "") return NaN
  return Number(latin)
}

/** Local calendar day as YYYY-MM-DD. */
export function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number) {
  const date = keyToDate(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

const dayFormat = new Intl.DateTimeFormat("ar-EG", {
  weekday: "long",
  day: "numeric",
  month: "long",
})
const shortDayFormat = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "short",
})
const timeFormat = new Intl.DateTimeFormat("ar-EG", {
  hour: "numeric",
  minute: "2-digit",
})

export const formatDay = (key: string) => dayFormat.format(keyToDate(key))
export const formatShortDay = (key: string) =>
  shortDayFormat.format(keyToDate(key))
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))

export function daysBetween(fromKey: string, toKey: string) {
  const ms = keyToDate(toKey).getTime() - keyToDate(fromKey).getTime()
  return Math.round(ms / 86_400_000)
}

/** Strips the differences that make Arabic search miss: hamza forms, taa marbuta, alef maqsura, tashkeel. */
export function normalizeArabic(text: string) {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim()
}
