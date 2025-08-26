import { build, emptyDir } from "@deno/dnt";
import { bgGreen } from "@std/fmt/colors";

const denoInfo = JSON.parse(
  Deno.readTextFileSync(new URL("../deno.json", import.meta.url)),
);
const version = denoInfo.version;

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
    lib: ["ES2021"],
  },
  package: {
    name: "monopole",
    version,
    description:
      "A versatile dependency injection container with features like value bindings, resolvers, aliases, and support for singleton, transient, and scoped lifetimes.",
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
});

// post build steps
Deno.copyFileSync("README.md", ".npm/README.md");
