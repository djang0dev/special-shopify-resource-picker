import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: "/special-shopify-resource-picker/",
  plugins: [react()],
})
