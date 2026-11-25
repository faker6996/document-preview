/** Maps file extensions to Prism grammar IDs and lazily loads only the requested grammar. */

export type PrismLanguageId =
  | "markup"
  | "css"
  | "clike"
  | "javascript"
  | "json"
  | "jsx"
  | "typescript"
  | "tsx"
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"
  | "ruby"
  | "php"
  | "sql"
  | "bash"
  | "yaml"
  | "toml"
  | "ini"
  | "scss"
  | "graphql"
  | "diff"
  | "docker"
  | "markdown";

const EXTENSION_TO_PRISM: Record<string, PrismLanguageId> = {
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  css: "css",
  less: "css",
  scss: "scss",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  json: "json",
  py: "python",
  java: "java",
  kt: "java",
  kts: "java",
  swift: "clike",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cc: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  conf: "ini",
  env: "ini",
  editorconfig: "ini",
  graphql: "graphql",
  gql: "graphql",
  diff: "diff",
  patch: "diff",
  dockerfile: "docker",
  makefile: "bash",
  gitignore: "bash",
  dockerignore: "bash",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
};

export function resolvePrismLanguage(extension?: string | null): PrismLanguageId | null {
  const ext = String(extension || "").trim().replace(/^\./, "").toLowerCase();
  return EXTENSION_TO_PRISM[ext] ?? null;
}

const BUILTIN_LANGUAGES = new Set<PrismLanguageId>(["markup", "css", "clike", "javascript"]);

const GRAMMAR_LOADERS: Partial<Record<PrismLanguageId, () => Promise<unknown>>> = {
  json: () => import("prismjs/components/prism-json.js"),
  jsx: () => import("prismjs/components/prism-jsx.js"),
  typescript: () => import("prismjs/components/prism-typescript.js"),
  tsx: async () => {
    await import("prismjs/components/prism-jsx.js");
    await import("prismjs/components/prism-typescript.js");
    await import("prismjs/components/prism-tsx.js");
  },
  python: () => import("prismjs/components/prism-python.js"),
  java: () => import("prismjs/components/prism-java.js"),
  c: () => import("prismjs/components/prism-c.js"),
  cpp: async () => {
    await import("prismjs/components/prism-c.js");
    await import("prismjs/components/prism-cpp.js");
  },
  csharp: () => import("prismjs/components/prism-csharp.js"),
  go: () => import("prismjs/components/prism-go.js"),
  rust: () => import("prismjs/components/prism-rust.js"),
  ruby: () => import("prismjs/components/prism-ruby.js"),
  php: async () => {
    await import("prismjs/components/prism-markup-templating.js");
    await import("prismjs/components/prism-php.js");
  },
  sql: () => import("prismjs/components/prism-sql.js"),
  bash: () => import("prismjs/components/prism-bash.js"),
  yaml: () => import("prismjs/components/prism-yaml.js"),
  toml: () => import("prismjs/components/prism-toml.js"),
  ini: () => import("prismjs/components/prism-ini.js"),
  scss: () => import("prismjs/components/prism-scss.js"),
  graphql: () => import("prismjs/components/prism-graphql.js"),
  diff: () => import("prismjs/components/prism-diff.js"),
  docker: () => import("prismjs/components/prism-docker.js"),
  markdown: () => import("prismjs/components/prism-markdown.js"),
};

type PrismInstance = typeof import("prismjs");

/** Loads the requested Prism grammar on demand and returns it (or null if unavailable). */
export async function loadPrismGrammar(language: PrismLanguageId): Promise<{ Prism: PrismInstance; grammar: PrismInstance["languages"][string] } | null> {
  const { default: Prism } = await import("prismjs");
  // Prism component files register themselves onto globalThis.Prism.
  (globalThis as { Prism?: PrismInstance }).Prism = Prism;

  if (!BUILTIN_LANGUAGES.has(language) && !Prism.languages[language]) {
    const loader = GRAMMAR_LOADERS[language];
    if (loader) {
      try {
        await loader();
      } catch {
        // Fall through to fallback grammar.
      }
    }
  }

  const grammar = Prism.languages[language] ?? (language === "json" ? Prism.languages.javascript : undefined);
  return grammar ? { Prism, grammar } : null;
}
