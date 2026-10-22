import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /mizan/.
  base: command === "build" ? "/mizan/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // index.html already sets light and dark theme colors.
      pwaAssets: { config: true, injectThemeColor: false },
      manifest: {
        name: "ميزان",
        short_name: "ميزان",
        description: "تتبع سعراتك وأكلك ووزنك",
        lang: "ar",
        dir: "rtl",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0d0d0f",
        theme_color: "#0d0d0f",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,wasm}"],
        // The barcode decoder is about 1 MB; let it be cached for offline scanning.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
}))
