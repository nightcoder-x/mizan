import { useEffect, useRef, useState } from "react"
import { CameraOffIcon, LoaderIcon, ScanBarcodeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MacroChips } from "@/components/macro-chips"
import type { Food } from "@/data/foods"
import { lookupProduct, type Product } from "@/lib/open-food-facts"
import { num } from "@/lib/format"
import { useMizan } from "@/store"

type State =
  | { step: "scan" }
  | { step: "looking"; code: string }
  | { step: "found"; product: Product }
  | { step: "missing"; code: string }

/**
 * Point the back camera at a barcode. The product comes from Open Food Facts and is
 * saved as one of your foods, so the next scan of it works without the internet.
 */
export function BarcodeScanner({ onFood, onManual }: { onFood: (food: Food) => void; onManual: (name: string) => void }) {
  const customFoods = useMizan((s) => s.customFoods)
  const addCustomFood = useMizan((s) => s.addCustomFood)
  const [state, setState] = useState<State>({ step: "scan" })
  const [cameraError, setCameraError] = useState(false)
  const [typed, setTyped] = useState("")
  const video = useRef<HTMLVideoElement>(null)

  const handleCode = async (code: string) => {
    const known = customFoods.find((f) => f.aliases?.includes(code))
    if (known) return onFood(known)
    setState({ step: "looking", code })
    try {
      const product = await lookupProduct(code)
      setState(product ? { step: "found", product } : { step: "missing", code })
    } catch {
      setState({ step: "missing", code })
    }
  }

  useEffect(() => {
    if (state.step !== "scan") return
    let stream: MediaStream | null = null
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    void (async () => {
      try {
        const { createDetector } = await import("@/lib/barcode")
        const detector = createDetector()
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
        if (stopped || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const tick = async () => {
          if (stopped || !video.current) return
          try {
            const [hit] = await detector.detect(video.current)
            if (hit?.rawValue) {
              navigator.vibrate?.(60)
              void handleCode(hit.rawValue)
              return
            }
          } catch {
            // A frame that can't be read; try the next one.
          }
          timer = setTimeout(tick, 200)
        }
        void tick()
      } catch {
        setCameraError(true)
      }
    })()

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
    // handleCode only reads the latest foods; restarting the camera for it isn't wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step])

  const save = (product: Product) => {
    const food = addCustomFood({
      name: product.name,
      aliases: [product.code],
      per100: product.per100,
      units: product.servingGrams ? [{ name: "حصة", grams: product.servingGrams }] : [],
    })
    onFood(food)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-6 lg:px-6">
      {state.step === "scan" && (
        <>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-black">
            {cameraError ? (
              <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/80">
                <CameraOffIcon className="size-8" aria-hidden="true" />
                الكاميرا مش متاحة. اسمح لميزان يستخدمها من إعدادات Safari، أو اكتب الرقم اللي تحت الباركود.
              </div>
            ) : (
              <>
                <video ref={video} playsInline muted className="size-full object-cover" />
                <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-lime shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
              </>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground">وجّه الكاميرا للباركود اللي على العلبة.</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const code = typed.replace(/\D/g, "")
              if (code.length >= 8) void handleCode(code)
            }}
          >
            <Input
              inputMode="numeric"
              className="h-11 flex-1 rounded-full bg-card"
              placeholder="أو اكتب رقم الباركود"
              aria-label="رقم الباركود"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <Button type="submit" className="h-11 rounded-full px-5">
              دوّر
            </Button>
          </form>
        </>
      )}

      {state.step === "looking" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <LoaderIcon className="size-6 animate-spin" aria-hidden="true" />
          بدوّر على {num(Number(state.code))}…
        </div>
      )}

      {state.step === "found" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-[1.5rem] bg-lime p-5 text-lime-ink">
            <span className="text-sm opacity-75">لقيته</span>
            <h3 className="text-xl font-bold">{state.product.name}</h3>
            <p className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold">{num(Math.round(state.product.per100.kcal))}</span>
              <span className="opacity-75">سعرة في ١٠٠ جرام</span>
            </p>
            <MacroChips
              p={state.product.per100.p}
              c={state.product.per100.c}
              f={state.product.per100.f}
              className="[&_.text-muted-foreground]:text-lime-ink/70"
            />
            {state.product.servingGrams && (
              <span className="text-sm opacity-75">الحصة حسب العلبة: {num(state.product.servingGrams)} جرام</span>
            )}
          </div>
          <Button size="xl" className="rounded-full" onClick={() => save(state.product)}>
            احفظه واختار الكمية
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => setState({ step: "scan" })}>
            امسح حاجة تانية
          </Button>
          <p className="text-xs text-muted-foreground">البيانات من Open Food Facts. لو الأرقام مختلفة عن العلبة، صدّق العلبة.</p>
        </div>
      )}

      {state.step === "missing" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <ScanBarcodeIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold">المنتج ده مش موجود في القاعدة</p>
          <p className="text-sm text-muted-foreground">ضيفه بالأرقام اللي على العلبة مرة واحدة وخلاص.</p>
          <div className="flex gap-2">
            <Button className="rounded-full" onClick={() => onManual("")}>
              ضيفه بإيدي
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setState({ step: "scan" })}>
              جرّب تاني
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
