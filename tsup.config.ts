import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom"],
  // The "use client" directive is prepended in scripts/postbuild.mjs — esbuild
  // strips a leading directive while bundling, so a `banner` won't survive.
})
