import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

// Develop against the package SOURCE (HMR, no build step). The more specific
// styles.css alias must come first so it isn't swallowed by the bare "glass-kit".
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "glass-kit/styles.css",
        replacement: resolve(__dirname, "../../src/glass-kit.css"),
      },
      { find: "glass-kit", replacement: resolve(__dirname, "../../src/index.ts") },
    ],
  },
})
