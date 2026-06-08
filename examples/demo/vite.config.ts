import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

// Develop against the package SOURCE (HMR, no build step). The more specific
// styles.css alias must come first so it isn't swallowed by the bare "glass-lens-react".
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "glass-lens-react/styles.css",
        replacement: resolve(__dirname, "../../src/glass-kit.css"),
      },
      { find: "glass-lens-react", replacement: resolve(__dirname, "../../src/index.ts") },
    ],
  },
})
