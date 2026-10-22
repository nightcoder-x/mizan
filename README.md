# ميزان

A personal calorie, macro and weight tracker that runs as an iPhone home-screen app. Arabic, right to left.

- Log food by searching a list of about 170 Egyptian dishes and ingredients, or by writing a sentence like
  "فطرت ٢ رغيف وطبق فول وبيضتين". It is parsed on the device, with no AI or server.
- Add your own foods from a nutrition label, or from a recipe's ingredients and the number of plates it makes.
- Daily targets from Mifflin-St Jeor and your goal (cut, maintain, bulk).
- Weight log with a 7-day moving average.

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
