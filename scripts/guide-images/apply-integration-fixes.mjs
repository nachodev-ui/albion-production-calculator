import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const guidePath = join(
  projectRoot,
  "src",
  "features",
  "seo-content",
  "components",
  "SeoGuidePage.tsx",
);
let source = await readFile(guidePath, "utf8");

const before = `  const image = GUIDE_IMAGES[activeHref];

  return (`;
const after = `  const image = GUIDE_IMAGES[activeHref];
  if (!image) {
    throw new Error(\`No existe una imagen configurada para la guía: \${activeHref}\`);
  }

  return (`;

if (!source.includes(after)) {
  if (!source.includes(before)) {
    throw new Error("No se encontró la selección de imagen de GuideShell.");
  }
  source = source.replace(before, after);
  await writeFile(guidePath, source, "utf8");
  console.log("Added GuideShell image guard.");
} else {
  console.log("GuideShell image guard is already current.");
}
