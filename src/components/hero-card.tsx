import { FlameIcon, PenLineIcon, PlusIcon } from "lucide-react"

import { NumberTicker } from "@/components/ui/number-ticker"
import { TickBar } from "@/components/tick-bar"
import { num } from "@/lib/format"

/** The lime card: what's left of today's calories, and the way to log more. */
export function HeroCard({
  eaten,
  target,
  onLog,
  onWrite,
}: {
  eaten: number
  target: number
  onLog: () => void
  onWrite: () => void
}) {
  const remaining = Math.round(target - eaten)
  const over = remaining < 0

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden rounded-[1.75rem] bg-lime p-5 text-lime-ink shadow-[0_18px_40px_-18px] shadow-lime/70"
    >
      {/* soft highlight, like light catching the card */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -left-16 -z-10 size-72 rounded-full bg-white/45 blur-3xl"
      />
      <div className="flex items-center justify-between">
        <span id="hero-title" className="rounded-full bg-white/45 px-3 py-1 text-sm font-medium">
          {over ? "عديت هدف النهارده" : "باقي النهارده"}
        </span>
        <span className="grid size-9 place-items-center rounded-full bg-lime-ink/10" aria-hidden="true">
          <FlameIcon className="size-4.5" />
        </span>
      </div>

      <p className="mt-5 flex items-baseline gap-2">
        <NumberTicker value={Math.abs(remaining)} startValue={0} className="text-6xl leading-none font-extrabold tracking-tight" />
        <span className="text-lg font-medium opacity-70">{over ? "سعرة زيادة" : "سعرة"}</span>
      </p>

      <TickBar
        value={eaten / target}
        className="mt-5"
        filledClassName="bg-lime-ink"
        emptyClassName="bg-lime-ink/15"
        label={`أكلت ${num(Math.round(eaten))} من ${num(target)} سعرة`}
      />
      <div className="mt-2 flex justify-between text-xs font-medium opacity-70">
        <span>أكلت {num(Math.round(eaten))}</span>
        <span>الهدف {num(target)}</span>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onLog}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-lime-ink text-sm font-semibold text-lime outline-none focus-visible:ring-3 focus-visible:ring-lime-ink/40 active:scale-[0.98]"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          سجّل أكل
        </button>
        <button
          type="button"
          onClick={onWrite}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white/55 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-lime-ink/40 active:scale-[0.98]"
        >
          <PenLineIcon className="size-4" aria-hidden="true" />
          اكتب اللي كلته
        </button>
      </div>
    </section>
  )
}
