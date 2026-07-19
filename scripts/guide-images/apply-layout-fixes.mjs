import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const generatorPath = join(projectRoot, "scripts", "guide-images", "generate.mjs");
let source = await readFile(generatorPath, "utf8");

const replacements = [
  [
    '.${ratioClass(format)}.profitability .breakdown { ${format.suffix === "1x1" ? "display:none;" : ""} }',
    '.${ratioClass(format)}.profitability .breakdown { ${compact ? "display:none;" : ""} }',
  ],
  [
    '.bm-layout { height:100%; display:grid; grid-template-columns:${square ? "1fr" : "repeat(2, 1fr)"}; gap:18px; }',
    '.bm-layout { height:100%; display:grid; grid-template-columns:repeat(2, 1fr); gap:18px; }',
  ],
  [
    '.${ratioClass(format)}.black-market .bm-layout { ${square ? "grid-template-rows:1fr 1fr;" : ""} }',
    '.${ratioClass(format)}.black-market .bm-layout { }',
  ],
];

for (const [before, after] of replacements) {
  if (source.includes(after)) {
    continue;
  }
  if (!source.includes(before)) {
    throw new Error(`No se encontró el patrón de layout esperado: ${before}`);
  }
  source = source.replace(before, after);
}

await writeFile(generatorPath, source, "utf8");
console.log("Guide image layouts normalized.");
