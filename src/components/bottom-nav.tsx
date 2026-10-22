import { HouseIcon, PlusIcon, ScaleIcon, SettingsIcon } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

export type Tab = "today" | "weight" | "settings"

const NAV: { id: Tab; label: string; icon: typeof HouseIcon }[] = [
  { id: "today", label: "النهارده", icon: HouseIcon },
  { id: "weight", label: "الوزن", icon: ScaleIcon },
  { id: "settings", label: "الإعدادات", icon: SettingsIcon },
]

/** A white pill of tabs with a black highlight that slides to the active one, plus the lime add button. */
export function BottomNav({
  tab,
  onTab,
  onAdd,
}: {
  tab: Tab
  onTab: (tab: Tab) => void
  onAdd: () => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <nav
        aria-label="التنقل"
        className="pointer-events-auto flex items-center gap-1 rounded-full border bg-card/85 p-1.5 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)] backdrop-blur-xl"
      >
        {NAV.map((item) => {
          const active = item.id === tab
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                active ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative size-4.5" aria-hidden="true" />
              <span className={cn("relative", !active && "sr-only")}>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <button
        type="button"
        onClick={onAdd}
        aria-label="سجّل أكل"
        className="pointer-events-auto grid size-14 place-items-center rounded-full bg-lime text-lime-ink shadow-[0_12px_28px_-10px] shadow-lime/80 outline-none focus-visible:ring-3 focus-visible:ring-ring/60 active:scale-95"
      >
        <PlusIcon className="size-6" strokeWidth={2.5} />
      </button>
    </div>
  )
}
