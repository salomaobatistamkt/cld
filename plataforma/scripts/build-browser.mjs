// Gera dist-navegavel/: site + painel rodando 100% no navegador (para demonstração e testes).
// Uso: npm run build:browser
import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const OUT = "dist-navegavel";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT + "/admin", { recursive: true });
for (const d of ["css", "js", "data", "vendor"]) cpSync("public/" + d, `${OUT}/${d}`, { recursive: true });
cpSync("node_modules/sql.js/dist/sql-wasm.js", `${OUT}/vendor/sql-wasm.js`);
cpSync("node_modules/sql.js/dist/sql-wasm.wasm", `${OUT}/vendor/sql-wasm.wasm`);

await build({
  entryPoints: ["browser/runtime.ts"], outfile: `${OUT}/runtime.js`, bundle: true, format: "iife",
  platform: "browser", target: "es2020", loader: { ".sql": "text" }, minify: true, logLevel: "error",
});

const banner = root => `<div class="demo-bar" role="note">Demonstração: os preços mostrados são de exemplo, não são reais. <button type="button" onclick="meridiaReset()">Recomeçar do zero</button></div>`;
const barCss = `<style>.demo-bar{background:var(--amber-soft);color:var(--fg);font-size:15px;padding:8px max(16px,env(safe-area-inset-left,0px));display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:center;text-align:center}.demo-bar button{font:inherit;font-size:15px;border:2px solid var(--amber);background:transparent;color:var(--amber);border-radius:8px;padding:6px 12px;cursor:pointer}</style>`;

function adapt(html, root, home, adminHref, isMain) {
  let s = html
    .replace(/(href|src)="\/(css|js|vendor|data)\//g, `$1="${root}$2/`)
    .replace(/href="\/admin\/"/g, `href="${adminHref}"`)
    .replace(/href="\/"/g, `href="${home}"`)
    .replace("</head>", `${barCss}\n<script src="${root}vendor/sql-wasm.js"></script>\n<script src="${root}runtime.js" data-root="${root}"></script>\n</head>`)
    .replace(/<body>/, `<body>\n${banner(root)}`);
  if (isMain) {
    // A página principal do Artifact recebe o esqueleto do documento na publicação: tiramos o nosso.
    s = s.replace(/<!doctype html>\s*/i, "").replace(/<html[^>]*>\s*/i, "").replace(/<\/html>\s*$/i, "")
      .replace(/<head>\s*/i, "").replace(/<\/head>\s*/i, "").replace(/<body>\s*/i, "").replace(/<\/body>\s*/i, "")
      .replace(/<meta charset="utf-8">\s*/i, "").replace(/<meta name="viewport"[^>]*>\s*/i, "");
    s = `<meta name="claude:viewport-fit-sides" content="cover">\n` + s;
  }
  return s;
}

writeFileSync(`${OUT}/index.html`, adapt(readFileSync("public/index.html", "utf8"), "./", "index.html", "admin/index.html", true));
writeFileSync(`${OUT}/admin/index.html`, adapt(readFileSync("public/admin/index.html", "utf8"), "../", "../index.html", "index.html", false));
console.log("ok →", OUT);
