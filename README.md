# ميزان

A personal calorie, macro and weight tracker that runs as an iPhone home-screen app. Arabic, right to left.

- Log food by searching a list of about 170 Egyptian dishes and ingredients, or by writing a sentence like
  "فطرت ٢ رغيف وطبق فول وبيضتين". It is parsed on the device, with no AI or server.
- Add your own foods from a nutrition label, or from a recipe's ingredients and the number of plates it makes.
- Barcode scanning with the phone camera (ZXing in WebAssembly), products from Open Food Facts.
- Saved meals, "repeat yesterday", and quick add by calories.
- Daily targets from Mifflin-St Jeor and your goal (cut, maintain, bulk), optional calorie cycling
  for training and rest days, and a weekly check-in that re-fits targets to your measured expenditure
  (average intake minus the weight trend change × 7700 kcal/kg).
- Workout log: routines, sets with last-session prefill, estimated 1RM (Epley) and PR alerts,
  rest timer, plate calculator, weekly sets per muscle.
- Weight log with a 7-day moving average, body measurements with a US Navy body-fat estimate,
  progress photos kept in IndexedDB, water, steps, logging streak and a weekly report.

All data stays in the browser on the device. Settings has a backup button that hands a JSON file to the
share sheet, so it can be saved to Google Drive and restored later.

## Run

```bash
npm install
npm run dev
```

`npm run build` outputs the site to `dist/` with base path `/mizan/` for GitHub Pages. Pushing to `main`
deploys it through `.github/workflows/deploy.yml`.

`npx tsx --tsconfig tsconfig.app.json scripts/try-parser.ts` prints how sample sentences are parsed.

Built with Vite, React, Tailwind, shadcn/ui (Base UI), Magic UI and motion.
