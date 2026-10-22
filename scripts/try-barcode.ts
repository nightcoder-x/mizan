// Quick manual check of the Open Food Facts lookup: npx tsx --tsconfig tsconfig.app.json scripts/try-barcode.ts
import { lookupProduct } from "../src/lib/open-food-facts"

for (const code of ["5449000000996", "6223001360032", "0000000000000"]) {
  console.log(code, JSON.stringify(await lookupProduct(code)))
}
