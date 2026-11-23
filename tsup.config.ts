import { defineConfig } from "tsup";

// dist is wiped once by `npm run build`; per-config `clean` raced and deleted the other entry's .d.ts files.

export default defineConfig([
  {
    // React components: keep "use client" so Next.js App Router treats them as client components.
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
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
