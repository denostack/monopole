import { build, emptyDir } from "@deno/dnt";
import { bgGreen } from "@std/fmt/colors";
import denoJson from "../deno.json" with { type: "json" };

const version = denoJson.version;

console.log(bgGreen(`version: ${version}`));

await emptyDir("./.npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./.npm",
  shims: {
    deno: false,
  },
  test: false,
  compilerOptions: {
    lib: ["ES2021", "ESNext.Disposable", "ESNext.Decorators"],
  },
  package: {
    name: "monopole",
    version,
    description:
      "A modern, module-first DI container for TypeScript/JavaScript. Monopole supports async resolution, TC39 Stage 3 decorator property injection, and comprehensive lifecycle management for flexible, production-ready apps.",
    keywords: [
      "di",
      "ioc",
      "dependency-injection",
      "container",
      "scoped-lifetimes",
      "circular-dependency",
      "scoped",
      "lifecycle",
    ],
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/denostack/monopole.git",
    },
    bugs: {
      url: "https://github.com/denostack/monopole/issues",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", ".npm/LICENSE");
    Deno.copyFileSync("README.md", ".npm/README.md");
  },
});
