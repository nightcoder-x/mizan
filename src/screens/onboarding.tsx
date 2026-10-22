import { useState } from "react"

import { BlurFade } from "@/components/ui/blur-fade"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ProfileForm } from "@/components/profile-form"
import { TickBar } from "@/components/tick-bar"
import { useMizan } from "@/store"

export function OnboardingScreen() {
  const saveProfile = useMizan((s) => s.saveProfile)
  const logWeight = useMizan((s) => s.logWeight)
  const setName = useMizan((s) => s.setName)
  const [name, setNameText] = useState("")

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start">
      <BlurFade className="lg:sticky lg:top-10 lg:col-span-5">
        <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-lime p-6 text-lime-ink lg:p-10">
          <div aria-hidden="true" className="absolute -top-24 -left-16 -z-10 size-72 rounded-full bg-white/45 blur-3xl" />
          <h1 className="text-5xl font-extrabold tracking-tight lg:text-7xl">ميزان</h1>
          <p className="mt-3 max-w-[30ch] text-lg">سجّل أكلك بجملة، وتابع سعراتك ووزنك من غير ما تعد حاجة بإيدك.</p>
          <TickBar value={0.62} className="mt-6" filledClassName="bg-lime-ink" emptyClassName="bg-lime-ink/15" label="مثال على شريط السعرات" />
        </section>
      </BlurFade>

      <BlurFade delay={0.08} className="flex flex-col gap-4 rounded-[1.5rem] border bg-card p-5 lg:col-span-7 lg:p-8">
        <h2 className="text-xl font-bold">عرّفني بيك عشان أحسب هدفك</h2>
        <Field>
          <FieldLabel htmlFor="onboarding-name">اسمك (اختياري)</FieldLabel>
          <Input
            id="onboarding-name"
            className="h-11 rounded-xl"
            value={name}
            onChange={(e) => setNameText(e.target.value)}
            placeholder="هيظهر في التحية بس"
            autoComplete="given-name"
          />
        </Field>
        <ProfileForm
          initial={null}
          submitLabel="يلا نبدأ"
          onSubmit={(profile) => {
            setName(name)
            saveProfile(profile)
            logWeight(profile.weightKg)
            window.scrollTo({ top: 0 })
          }}
        />
      </BlurFade>
    </div>
  )
}
