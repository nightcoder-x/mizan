import { lazy, Suspense, useEffect, useState } from "react"
import confetti from "canvas-confetti"
import { PlusIcon } from "lucide-react"
import { AnimatePresence, motion, MotionConfig } from "motion/react"

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { toast } from "@/components/ui/toast"
import { BottomNav, NavPill, type Tab } from "@/components/bottom-nav"
import { LogFoodDrawer, type DrawerStart } from "@/components/log-food-drawer"
import { useTheme } from "@/components/theme-provider"
import { useIsDesktop } from "@/hooks/use-media-query"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"
import { dateKey, num } from "@/lib/format"
import { GOALS } from "@/lib/nutrition"
import { OnboardingScreen } from "@/screens/onboarding"
import { SettingsScreen } from "@/screens/settings"
import { TodayScreen } from "@/screens/today"
import { useMizan, type Entry } from "@/store"

// The weight chart pulls in recharts, so it loads only when opened.
const WeightScreen = lazy(() => import("@/screens/weight").then((m) => ({ default: m.WeightScreen })))

const TABS: Tab[] = ["today", "weight", "settings"]

function readTab(): Tab {
  const hash = window.location.hash.slice(1)
  return TABS.includes(hash as Tab) ? (hash as Tab) : "today"
}

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
        <rect width="40" height="40" rx="20" fill="var(--foreground)" />
        <path d="M20 9 A11 11 0 1 1 9 20" fill="none" stroke="var(--lime)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3" fill="var(--lime)" />
      </svg>
      <span className="text-lg font-bold">ميزان</span>
    </span>
  )
}

/** Laptop only: the person's initial and name, like the profile chip in the reference dashboard. */
function UserChip() {
  const name = useMizan((s) => s.name)
  const goal = useMizan((s) => GOALS.find((g) => g.id === s.profile?.goal)?.label)
  return (
    <span className="flex items-center gap-2 rounded-full border bg-card py-1 ps-1 pe-4">
      <span className="grid size-8 place-items-center rounded-full bg-foreground text-sm font-bold text-background" aria-hidden="true">
        {name ? name[0] : "م"}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">{name || "أهلاً"}</span>
        {goal && <span className="text-xs text-muted-foreground">هدفك {goal}</span>}
      </span>
    </span>
  )
}

function ThemeButton() {
  const { setTheme } = useTheme()
  const resolved = useResolvedTheme()
  return (
    <AnimatedThemeToggler
      theme={resolved}
      onThemeChange={setTheme}
      duration={550}
      aria-label={resolved === "dark" ? "الوضع الفاتح" : "الوضع الغامق"}
      className="grid size-10 place-items-center rounded-full border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4.5"
    />
  )
}

export function App() {
  const profile = useMizan((s) => s.profile)
  const isDesktop = useIsDesktop()
  const [tab, setTab] = useState<Tab>(readTab)
  const [drawer, setDrawer] = useState<DrawerStart | null>(null)

  useEffect(() => {
    const onHash = () => setTab(readTab())
    window.addEventListener("hashchange", onHash)
    // Ask Safari not to evict local data; installed home-screen apps usually get this.
    void navigator.storage?.persist?.()
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const goTo = (next: Tab) => {
    if (next === tab) return
    window.history.replaceState(null, "", next === "today" ? window.location.pathname : `#${next}`)
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  const onLogged = (logged: Entry[]) => {
    const { entries, targets, removeEntry } = useMizan.getState()
    const today = entries.filter((e) => e.date === dateKey())
    const after = today.reduce((s, e) => s + e.p, 0)
    const before = after - logged.reduce((s, e) => s + e.p, 0)
    const kcal = logged.reduce((s, e) => s + e.kcal, 0)

    toast.add({
      title: logged.length === 1 ? `اتسجّل ${logged[0].name}` : `اتسجّل ${num(logged.length)} حاجات`,
      description: `${num(Math.round(kcal))} سعرة`,
      actionProps: { children: "تراجع", onClick: () => logged.forEach((e) => removeEntry(e.id)) },
    })

    if (tab !== "today") goTo("today")

    if (before < targets.protein && after >= targets.protein) {
      setTimeout(() => {
        const css = getComputedStyle(document.documentElement)
        void confetti({
          particleCount: 140,
          spread: 75,
          origin: { y: 0.35 },
          colors: [css.getPropertyValue("--lime").trim(), css.getPropertyValue("--foreground").trim(), "#a3a3ab"],
          disableForReducedMotion: true,
        })
        toast.add({ title: "كمّلت بروتين النهارده", type: "success" })
      }, 450)
    }
  }

  if (!profile) {
    return (
      <MotionConfig reducedMotion="user">
        <main className="mx-auto max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-16 lg:max-w-6xl lg:px-8 lg:pt-10">
          <OnboardingScreen />
        </main>
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <header className="mx-auto flex max-w-lg items-center justify-between gap-4 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 lg:max-w-7xl lg:px-8 lg:pt-6 lg:pb-6">
        <Logo />
        {isDesktop && <NavPill tab={tab} onTab={goTo} showAllLabels className="bg-card" />}
        <div className="flex items-center gap-2">
          <ThemeButton />
          {isDesktop && (
            <>
              <button
                type="button"
                onClick={() => setDrawer("pick")}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-lime px-4 text-sm font-semibold text-lime-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/60 active:scale-[0.98]"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                سجّل أكل
              </button>
              <UserChip />
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-32 lg:max-w-7xl lg:px-8 lg:pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {tab === "today" && (
              <TodayScreen
                onLog={() => setDrawer("pick")}
                onWrite={() => setDrawer("write")}
                onOpenWeight={() => goTo("weight")}
                onOpenSettings={() => goTo("settings")}
              />
            )}
            {tab === "weight" && (
              <Suspense fallback={null}>
                <WeightScreen />
              </Suspense>
            )}
            {tab === "settings" && <SettingsScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isDesktop && <BottomNav tab={tab} onTab={goTo} onAdd={() => setDrawer("pick")} />}
      <LogFoodDrawer
        start={drawer}
        onOpenChange={(open) => !open && setDrawer(null)}
        onLogged={onLogged}
      />
    </MotionConfig>
  )
}

export default App
