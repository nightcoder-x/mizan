import type { Macros } from "@/lib/nutrition"

export type Product = {
  code: string
  name: string
  per100: Macros
  /** Grams in one serving, when the label says. */
  servingGrams: number | null
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0)

/**
 * Looks a barcode up on Open Food Facts, the free open product database.
 * Returns null when the product isn't there or has no calories listed.
 */
export async function lookupProduct(code: string): Promise<Product | null> {
  const fields = "product_name,product_name_ar,brands,nutriments,serving_quantity"
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`)
  if (!res.ok) return null
  const body = (await res.json()) as {
    status?: number
    product?: {
      product_name?: string
      product_name_ar?: string
      brands?: string
      serving_quantity?: number | string
      nutriments?: Record<string, number | string>
    }
  }
  const p = body.product
  if (body.status !== 1 || !p?.nutriments) return null
  const n = p.nutriments
  const kcal = num(n["energy-kcal_100g"]) || num(n["energy_100g"]) / 4.184
  if (!kcal) return null
  const base = (p.product_name_ar || p.product_name || "").trim()
  const brand = p.brands?.split(",")[0]?.trim()
  return {
    code,
    name: [base || "منتج", brand && !base.includes(brand) ? brand : ""].filter(Boolean).join(" - "),
    per100: {
      kcal,
      p: num(n["proteins_100g"]),
      c: num(n["carbohydrates_100g"]),
      f: num(n["fat_100g"]),
    },
    servingGrams: num(p.serving_quantity) || null,
  }
}
