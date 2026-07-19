import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distDirectory = join(projectRoot, "dist");
const sourcePath = join(distDirectory, "index.html");
const sourceHtml = await readFile(sourcePath, "utf8");

const pages = [
  {
    path: "black-market",
    title: "Albion Black Market Calculator | Profit Scanner",
    description:
      "Compara precios de ciudades con órdenes del Black Market de Caerleon. Calcula impuestos, transporte, liquidez, beneficio y ROI por objeto en Albion Online.",
    canonical: "https://albioncalculator.app/black-market",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": "https://albioncalculator.app/black-market#webpage",
          url: "https://albioncalculator.app/black-market",
          name: "Albion Black Market Calculator",
          description:
            "Escáner de oportunidades, transporte y rentabilidad del Black Market de Albion Online.",
          inLanguage: "es",
          isPartOf: {
            "@id": "https://albioncalculator.app/#website",
          },
        },
        {
          "@type": "WebApplication",
          "@id": "https://albioncalculator.app/black-market#application",
          url: "https://albioncalculator.app/black-market",
          name: "Albion Black Market Calculator",
          applicationCategory: "GameApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Compara precios, impuestos, transporte, liquidez, beneficio y ROI para vender en el Black Market de Caerleon.",
          inLanguage: "es",
          about: {
            "@type": "VideoGame",
            name: "Albion Online",
          },
        },
      ],
    },
  },
  {
    path: "plans",
    title: "Planes Free y Pro | Albion Calculator",
    description:
      "Compara los planes Free y Pro de Albion Calculator para crafteo, historial de precios, Black Market, optimización de ganancias y configuraciones en la nube.",
    canonical: "https://albioncalculator.app/plans",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://albioncalculator.app/plans#webpage",
      url: "https://albioncalculator.app/plans",
      name: "Planes Free y Pro de Albion Calculator",
      description:
        "Comparación de funciones gratuitas y Pro para crafteo, mercado y rentabilidad en Albion Online.",
      inLanguage: "es",
      isPartOf: {
        "@id": "https://albioncalculator.app/#website",
      },
    },
  },
];

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`No se encontró ${label} en dist/index.html`);
  }

  return html.replace(pattern, replacement);
}

function createRouteHtml(page) {
  let html = sourceHtml;

  html = replaceRequired(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${page.title}</title>`,
    "el título",
  );
  html = replaceRequired(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${page.description}" />`,
    "la meta description",
  );
  html = replaceRequired(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${page.canonical}" />`,
    "la URL canónica",
  );
  html = replaceRequired(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${page.title}" />`,
    "og:title",
  );
  html = replaceRequired(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${page.description}" />`,
    "og:description",
  );
  html = replaceRequired(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${page.canonical}" />`,
    "og:url",
  );
  html = replaceRequired(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${page.title}" />`,
    "twitter:title",
  );
  html = replaceRequired(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${page.description}" />`,
    "twitter:description",
  );
  html = replaceRequired(
    html,
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(page.structuredData, null, 2)}\n    </script>`,
    "los datos estructurados",
  );

  return html;
}

for (const page of pages) {
  await writeFile(
    join(distDirectory, `${page.path}.html`),
    createRouteHtml(page),
    "utf8",
  );
}

console.log(`Generated ${pages.length} route-specific SEO pages.`);
