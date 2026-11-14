import { defineConfig } from "tsdown"

export default defineConfig([
  // Published library entries (ESM + types): what npm consumers import. One built file per
  // source module, so each React module keeps its "use client" directive.
  {
    entry: ["src/index.ts", "src/react/index.tsx", "src/browser/index.ts", "src/embeds.ts"],
    clean: true,
    dts: {
      resolve: true,
    },
    hash: false,
    minify: false,
    sourcemap: true,
    treeshake: true,
    unbundle: true,
    outExtensions: () => {
      return {
        js: ".js",
        dts: ".d.ts",
      }
    },
    external: ["react", "react/jsx-runtime"],
    checks: { moduleLevelDirective: false },
  },
  // Script bootstrap: a single minified IIFE synced to apps/app/public/embed.js. It must be
  // fully self-contained for a plain <script> tag.
  {
    entry: { embed: "src/browser/embed.ts" },
    clean: false,
    format: ["iife"],
    dts: false,
    hash: false,
    minify: true,
    sourcemap: false,
    treeshake: true,
    unbundle: false,
    outExtensions: () => {
      return {
        js: ".js",
      }
    },
  },
])
