import { useState } from "react"
import { motion } from "motion/react"

import { BodySection } from "@/components/progress/body-section"
import { ReportSection } from "@/components/progress/report-section"
import { cn } from "@/lib/utils"
import { WeightSection } from "@/screens/weight"

const SECTIONS = [
  { id: "weight", label: "الوزن" },
  { id: "body", label: "الجسم" },
  { id: "report", label: "التقرير" },
] as const

type Section = (typeof SECTIONS)[number]["id"]

export function ProgressScreen() {
  const [section, setSection] = useState<Section>("weight")
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <h1 className="text-[1.9rem] font-bold tracking-tight lg:text-[2.6rem]">التقدم</h1>
        <div className="flex items-center gap-1 rounded-full border bg-card p-1" role="tablist" aria-label="أقسام التقدم">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                section === s.id ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {section === s.id && (
                <motion.span layoutId="progress-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <motion.div
        key={section}
        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.22 }}
      >
        {section === "weight" && <WeightSection />}
        {section === "body" && <BodySection />}
        {section === "report" && <ReportSection />}
      </motion.div>
    </div>
  )
}
