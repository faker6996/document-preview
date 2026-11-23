import { defineConfig } from "tsup";

export default defineConfig([
  {
    // React components: keep "use client" so Next.js App Router treats them as client components.
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    banner: { js: '"use client";' },
    external: [/\.css$/],
  },
  {
    // Framework-free helpers.
    entry: { utils: "src/utils.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    target: "es2022",
  },
]);
