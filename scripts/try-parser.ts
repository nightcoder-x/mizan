// Quick manual check of the food sentence parser: npx tsx --tsconfig tsconfig.app.json scripts/try-parser.ts
import { BASE_FOODS } from "../src/data/foods"
import { parseFoodText } from "../src/lib/parse-food-text"

const samples = [
  "٢ رغيف وطبق فول بالزيت وبيضتين",
  "فطرت 3 طعمية ورغيفين وكوباية شاي بلبن",
  "رز ٢٠٠ جرام وربع فرخة مشوية",
  "نص كيلو لحمة مفرومة نية، ٢ كوب رز ني، ٣ معالق زيت، بصلة",
  "ورق عنب ٦ صوابع",
  "تفاحتين وموزة",
  "سكوب واي بروتين مع كوباية لبن خالي الدسم",
  "حاجة مش موجودة خالص",
  "اتغديت رز ٢٠٠ جرام وربع فرخة مشوية وسلطة وكبسة بالجمبري",
  "واحد ونص رغيف وبيتزا وسط",
  "٢ بيضة وورق عنب ٥ صوابع",
]

for (const s of samples) {
  const { items, meal } = parseFoodText(s, BASE_FOODS)
  console.log(`\n> ${s}${meal ? `  (meal: ${meal})` : ""}`)
  for (const item of items) {
    const kcal = item.food ? Math.round((item.food.per100.kcal * item.grams) / 100) : 0
    console.log(
      `  [${item.text}] -> ${item.food?.name ?? "???"} | ${item.qty} ${item.unit} | ${Math.round(item.grams)} g | ${kcal} kcal`
    )
  }
}
