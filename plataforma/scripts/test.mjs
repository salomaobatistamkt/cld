// Empacota os testes TypeScript com esbuild (já vem com o wrangler) e roda com o test runner do Node.
import { buildSync } from "esbuild";
import { readdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const out = mkdtempSync(join(tmpdir(), "meridia-tests-"));
const files = readdirSync("tests").filter(f => f.endsWith(".test.ts"));
buildSync({ entryPoints: files.map(f => join("tests", f)), outdir: out, bundle: true, platform: "node", format: "esm", outExtension: { ".js": ".mjs" }, logLevel: "error" });
const r = spawnSync(process.execPath, ["--test", ...files.map(f => join(out, f.replace(/\.ts$/, ".mjs")))], { stdio: "inherit" });
process.exit(r.status ?? 1);
