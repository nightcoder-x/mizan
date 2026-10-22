import { defineConfig, minimal2023Preset as preset } from "@vite-pwa/assets-generator/config"

// The icon is already a full-bleed square on the app's near-black, so no padding.
const dark = { background: "#111113", fit: "contain" } as const

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, padding: 0, resizeOptions: dark },
    apple: { ...preset.apple, padding: 0, resizeOptions: dark },
  },
  images: ["public/icon.svg"],
})
