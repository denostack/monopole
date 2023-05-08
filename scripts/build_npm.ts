import { build, emptyDir } from "dnt/mod.ts";
import { bgGreen } from "fmt/colors.ts";

const cmd = new Deno.Command("git", {
  args: ["describe", "--tags", "--abbrev=0"],
  stdout: "piped",
  stderr: "piped",
});

const commandOutput = await cmd.spawn().output();

const version = new TextDecoder().decode(commandOutput.stdout).trim();

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
    lib: ["es2021", "dom"],
  },
  package: {
    name: "monopole",
    version,
    description:
      "Efficiently manage dependencies with a flexible container, featuring value bindings, resolvers, aliases, and support for singleton, transient, and scoped lifetimes.",
    keywords: [
      "di",
      "ioc",
      "dependency-injection",
      "container",
      "scoped-lifetimes",
      "circular-dependency",
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
