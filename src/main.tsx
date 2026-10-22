import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { DirectionProvider } from "@base-ui/react/direction-provider"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "@/components/ui/toast"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectionProvider direction="rtl">
      <ThemeProvider>
        <Toaster timeout={4000}>
          <App />
        </Toaster>
      </ThemeProvider>
    </DirectionProvider>
  </StrictMode>
)
