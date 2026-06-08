// Post-build: ship the CSS, and prepend the "use client" directive to the bundle
// (the whole package is client-side UI — hooks, refs, DOM, WebGL — so React Server
// Components consumers must treat it as a client module). esbuild strips a leading
// directive while bundling, so it can't be a tsup `banner`; we add it here.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs"

copyFileSync("src/glass-kit.css", "dist/glass-kit.css")

const file = "dist/index.js"
const code = readFileSync(file, "utf8")
if (!/^["']use client["']/.test(code)) {
  writeFileSync(file, '"use client";\n' + code)
}
console.log('postbuild: css copied, "use client" prepended')
