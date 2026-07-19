import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

async function updateTextFile(relativePath, transform) {
  const path = join(projectRoot, relativePath);
  const source = await readFile(path, "utf8");
  const result = transform(source);
  if (result !== source) {
    await writeFile(path, result, "utf8");
    console.log(`Updated ${relativePath}`);
  } else {
    console.log(`Already current: ${relativePath}`);
  }
}

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) {
    return source;
  }
  if (!source.includes(before)) {
    throw new Error(`No se encontró ${label}.`);
  }
  return source.replace(before, after);
}

await updateTextFile(
  "src/features/seo-content/components/SeoGuidePage.tsx",
  (initialSource) => {
    let source = initialSource;

    source = replaceRequired(
      source,
      "const GUIDE_LINKS: readonly GuideLink[] = [",
      `interface GuideImage {
  readonly square: string;
  readonly fourThree: string;
  readonly wide: string;
  readonly alt: string;
  readonly caption: string;
}

const GUIDE_IMAGES: Readonly<Record<string, GuideImage>> = {
  "/guias/rentabilidad-crafteo-albion-online": {
    square: "/images/guides/rentabilidad-crafteo-1x1.png",
    fourThree: "/images/guides/rentabilidad-crafteo-4x3.png",
    wide: "/images/guides/rentabilidad-crafteo-16x9.png",
    alt: "Resumen ilustrativo de rentabilidad de crafteo con ingreso neto, costo efectivo, retorno, beneficio y ROI",
    caption:
      "Ejemplo visual del resumen de beneficio. Las cifras son ilustrativas y deben reemplazarse por precios recientes antes de fabricar.",
  },
  "/guias/retorno-materiales-rrr-albion-online": {
    square: "/images/guides/retorno-materiales-rrr-1x1.png",
    fourThree: "/images/guides/retorno-materiales-rrr-4x3.png",
    wide: "/images/guides/retorno-materiales-rrr-16x9.png",
    alt: "Ejemplo de materiales requeridos, devueltos y consumidos después de aplicar el RRR en Albion Online",
    caption:
      "Ejemplo visual del retorno esperado por material. Los redondeos reales dependen de cada tirada dentro del juego.",
  },
  "/guias/black-market-caerleon-rentable": {
    square: "/images/guides/black-market-caerleon-1x1.png",
    fourThree: "/images/guides/black-market-caerleon-4x3.png",
    wide: "/images/guides/black-market-caerleon-16x9.png",
    alt: "Comparación ilustrativa entre comprar y transportar o fabricar con RRR para vender en el Black Market de Caerleon",
    caption:
      "Comparación educativa de dos estrategias. La orden, el volumen y los costos deben comprobarse nuevamente antes de viajar a Caerleon.",
  },
};

const GUIDE_LINKS: readonly GuideLink[] = [`,
      "la configuración de imágenes de las guías",
    );

    source = replaceRequired(
      source,
      `  readonly children: ReactNode;
  readonly activeHref: string;
}) {
  return (`,
      `  readonly children: ReactNode;
  readonly activeHref: string;
}) {
  const image = GUIDE_IMAGES[activeHref];

  return (`,
      "la selección de imagen dentro de GuideShell",
    );

    source = replaceRequired(
      source,
      `        </header>

        <div className="prose-albion mt-8 space-y-6 text-[15px] leading-7 text-text-muted">`,
      `        </header>

        <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-bg shadow-lg shadow-black/15">
          <picture>
            <source media="(max-width: 639px)" srcSet={image.square} />
            <source media="(max-width: 1023px)" srcSet={image.fourThree} />
            <img
              src={image.wide}
              alt={image.alt}
              width={1600}
              height={900}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="block h-auto w-full"
            />
          </picture>
          <figcaption className="border-t border-border px-4 py-3 text-xs leading-5 text-text-faint sm:px-5">
            {image.caption}
          </figcaption>
        </figure>

        <div className="prose-albion mt-8 space-y-6 text-[15px] leading-7 text-text-muted">`,
      "el bloque visual representativo del artículo",
    );

    return source;
  },
);

const seoConfigPath = join(projectRoot, "src", "app", "seo", "route-seo.json");
const seoConfig = JSON.parse(await readFile(seoConfigPath, "utf8"));
const articleImages = {
  "guide-crafting-profit": {
    images: [
      "/images/guides/rentabilidad-crafteo-1x1.png",
      "/images/guides/rentabilidad-crafteo-4x3.png",
      "/images/guides/rentabilidad-crafteo-16x9.png",
    ],
    imageAlt:
      "Resumen ilustrativo de rentabilidad de crafteo con ingreso neto, costo efectivo, retorno, beneficio y ROI",
  },
  "guide-resource-return-rate": {
    images: [
      "/images/guides/retorno-materiales-rrr-1x1.png",
      "/images/guides/retorno-materiales-rrr-4x3.png",
      "/images/guides/retorno-materiales-rrr-16x9.png",
    ],
    imageAlt:
      "Ejemplo de materiales requeridos, devueltos y consumidos después de aplicar el RRR en Albion Online",
  },
  "guide-black-market-profit": {
    images: [
      "/images/guides/black-market-caerleon-1x1.png",
      "/images/guides/black-market-caerleon-4x3.png",
      "/images/guides/black-market-caerleon-16x9.png",
    ],
    imageAlt:
      "Comparación ilustrativa entre comprar y transportar o fabricar con RRR para vender en el Black Market de Caerleon",
  },
};

for (const [route, imageData] of Object.entries(articleImages)) {
  Object.assign(seoConfig.routes[route], imageData);
}
await writeFile(seoConfigPath, `${JSON.stringify(seoConfig, null, 2)}\n`, "utf8");
console.log("Updated src/app/seo/route-seo.json");

await updateTextFile("src/app/seo/RouteSeo.tsx", (initialSource) => {
  let source = initialSource;

  source = replaceRequired(
    source,
    `  description: string,
  index: boolean,
];`,
    `  description: string,
  index: boolean,
  imagePath?: string,
  imageAlt?: string,
];`,
    "los campos sociales opcionales de SeoEntry",
  );

  const routeImages = [
    [
      `    true,
  ],
  "guide-resource-return-rate": [`,
      `    true,
    "/images/guides/rentabilidad-crafteo-16x9.png",
    "Resumen ilustrativo de rentabilidad de crafteo con ingreso neto, costo efectivo, retorno, beneficio y ROI",
  ],
  "guide-resource-return-rate": [`,
      "la imagen social de rentabilidad de crafteo",
    ],
    [
      `    true,
  ],
  "guide-black-market-profit": [`,
      `    true,
    "/images/guides/retorno-materiales-rrr-16x9.png",
    "Ejemplo de materiales requeridos, devueltos y consumidos después de aplicar el RRR en Albion Online",
  ],
  "guide-black-market-profit": [`,
      "la imagen social del retorno de materiales",
    ],
    [
      `    "Calcula si comprar o fabricar para el Black Market de Caerleon es rentable después de impuesto, transporte, RRR, liquidez y riesgo.",
    true,
  ],`,
      `    "Calcula si comprar o fabricar para el Black Market de Caerleon es rentable después de impuesto, transporte, RRR, liquidez y riesgo.",
    true,
    "/images/guides/black-market-caerleon-16x9.png",
    "Comparación ilustrativa entre comprar y transportar o fabricar con RRR para vender en el Black Market de Caerleon",
  ],`,
      "la imagen social de Black Market",
    ],
  ];

  for (const [before, after, label] of routeImages) {
    source = replaceRequired(source, before, after, label);
  }

  source = replaceRequired(
    source,
    `function meta(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {`,
    `function removeMeta(attribute: "name" | "property", key: string): void {
  document.head
    .querySelector<HTMLMetaElement>(\`meta[\${attribute}="\${key}"]\`)
    ?.remove();
}

function meta(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {`,
    "el helper para retirar metadatos sociales obsoletos",
  );

  source = replaceRequired(
    source,
    `    const [path, title, description, index] = ROUTE_SEO[route];`,
    `    const [path, title, description, index, imagePath, imageAlt] =
      ROUTE_SEO[route];`,
    "la lectura de imagen social por ruta",
  );

  source = replaceRequired(
    source,
    `    meta("property", "og:url", canonical);
    meta("name", "twitter:title", title);
    meta("name", "twitter:description", description);

    if (!link) {`,
    `    meta("property", "og:url", canonical);
    meta("name", "twitter:title", title);
    meta("name", "twitter:description", description);

    const socialImage = imagePath ? \`\${ORIGIN}\${imagePath}\` : null;
    meta("property", "og:type", socialImage ? "article" : "website");
    meta("name", "twitter:card", socialImage ? "summary_large_image" : "summary");

    if (socialImage && imageAlt) {
      meta("property", "og:image", socialImage);
      meta("property", "og:image:type", "image/png");
      meta("property", "og:image:width", "1600");
      meta("property", "og:image:height", "900");
      meta("property", "og:image:alt", imageAlt);
      meta("name", "twitter:image", socialImage);
      meta("name", "twitter:image:alt", imageAlt);
    } else {
      removeMeta("property", "og:image");
      removeMeta("property", "og:image:type");
      removeMeta("property", "og:image:width");
      removeMeta("property", "og:image:height");
      removeMeta("property", "og:image:alt");
      removeMeta("name", "twitter:image");
      removeMeta("name", "twitter:image:alt");
    }

    if (!link) {`,
    "la gestión dinámica de Open Graph y Twitter Images",
  );

  return source;
});

await updateTextFile("scripts/generate-seo-assets.mjs", (initialSource) => {
  let source = initialSource;

  source = replaceRequired(
    source,
    `    if (
      entry.schemaType === "Article" &&
      (!/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.datePublished ?? "") ||
        !/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.dateModified ?? ""))
    ) {
      throw new Error(
        \`La ruta Article \${route} requiere datePublished y dateModified en formato YYYY-MM-DD.\`,
      );
    }

    if (entry.breadcrumbs !== undefined) {`,
    `    if (
      entry.schemaType === "Article" &&
      (!/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.datePublished ?? "") ||
        !/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.dateModified ?? ""))
    ) {
      throw new Error(
        \`La ruta Article \${route} requiere datePublished y dateModified en formato YYYY-MM-DD.\`,
      );
    }

    if (entry.schemaType === "Article") {
      const images = entry.images ?? [];
      const expectedRatios = ["-1x1.png", "-4x3.png", "-16x9.png"];
      if (
        images.length !== expectedRatios.length ||
        images.some(
          (image, index) =>
            !image.startsWith("/images/guides/") ||
            !image.endsWith(expectedRatios[index]),
        )
      ) {
        throw new Error(
          \`La ruta Article \${route} requiere imágenes PNG 1:1, 4:3 y 16:9 en ese orden.\`,
        );
      }
      if (!entry.imageAlt?.trim()) {
        throw new Error(\`La ruta Article \${route} requiere imageAlt.\`);
      }
    }

    if (entry.breadcrumbs !== undefined) {`,
    "la validación de imágenes Article",
  );

  source = replaceRequired(
    source,
    `          datePublished: entry.datePublished,
          dateModified: entry.dateModified,
          mainEntityOfPage: {`,
    `          datePublished: entry.datePublished,
          dateModified: entry.dateModified,
          image: entry.images.map(absoluteUrlFor),
          mainEntityOfPage: {`,
    "las imágenes dentro de Article JSON-LD",
  );

  source = replaceRequired(
    source,
    `  const robots = entry.index
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow, noarchive";
  let html = sourceHtml;`,
    `  const robots = entry.index
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow, noarchive";
  const socialImage = entry.images?.at(-1);
  const socialImageUrl = socialImage ? absoluteUrlFor(socialImage) : null;
  let html = sourceHtml;`,
    "la selección de imagen social en el HTML de ruta",
  );

  source = replaceRequired(
    source,
    `  html = replaceRequired(
    html,
    /<meta\\s+property="og:title"\\s+content="[^"]*"\\s*\\/?>/,
    \`<meta property="og:title" content="\${escapeHtml(entry.title)}" />\`,
    "og:title",
  );`,
    `  html = replaceRequired(
    html,
    /<meta\\s+property="og:type"\\s+content="[^"]*"\\s*\\/?>/,
    \`<meta property="og:type" content="\${entry.schemaType === "Article" ? "article" : "website"}" />\`,
    "og:type",
  );
  html = replaceRequired(
    html,
    /<meta\\s+property="og:title"\\s+content="[^"]*"\\s*\\/?>/,
    \`<meta property="og:title" content="\${escapeHtml(entry.title)}" />\`,
    "og:title",
  );`,
    "el tipo Open Graph de cada ruta",
  );

  source = replaceRequired(
    source,
    `  html = replaceRequired(
    html,
    /<meta\\s+name="twitter:title"\\s+content="[^"]*"\\s*\\/?>/,
    \`<meta name="twitter:title" content="\${escapeHtml(entry.title)}" />\`,
    "twitter:title",
  );`,
    `  html = replaceRequired(
    html,
    /<meta\\s+name="twitter:card"\\s+content="[^"]*"\\s*\\/?>/,
    \`<meta name="twitter:card" content="\${socialImageUrl ? "summary_large_image" : "summary"}" />\`,
    "twitter:card",
  );
  html = replaceRequired(
    html,
    /<meta\\s+name="twitter:title"\\s+content="[^"]*"\\s*\\/?>/,
    \`<meta name="twitter:title" content="\${escapeHtml(entry.title)}" />\`,
    "twitter:title",
  );`,
    "el formato de Twitter Card de cada ruta",
  );

  source = replaceRequired(
    source,
    `  html = replaceRequired(
    html,
    /<script(?:\\s+id="route-seo-structured-data")?\\s+type="application\\/ld\\+json">[\\s\\S]*?<\\/script>/,`,
    `  if (socialImageUrl) {
    const socialMetadata = [
      \`    <meta property="og:image" content="\${socialImageUrl}" />\`,
      '    <meta property="og:image:type" content="image/png" />',
      '    <meta property="og:image:width" content="1600" />',
      '    <meta property="og:image:height" content="900" />',
      \`    <meta property="og:image:alt" content="\${escapeHtml(entry.imageAlt)}" />\`,
      \`    <meta name="twitter:image" content="\${socialImageUrl}" />\`,
      \`    <meta name="twitter:image:alt" content="\${escapeHtml(entry.imageAlt)}" />\`,
    ].join("\\n");
    html = replaceRequired(
      html,
      /<\\/head>/,
      \`\${socialMetadata}\\n  </head>\`,
      "el cierre de head para metadatos de imagen",
    );
  }

  html = replaceRequired(
    html,
    /<script(?:\\s+id="route-seo-structured-data")?\\s+type="application\\/ld\\+json">[\\s\\S]*?<\\/script>/,`,
    "los metadatos sociales de imagen",
  );

  source = replaceRequired(
    source,
    `    .map(([, entry]) => {
      return [
        "  <url>",
        \`    <loc>\${escapeXml(canonicalFor(entry))}</loc>\`,
        \`    <lastmod>\${entry.dateModified ?? lastModified}</lastmod>\`,
        \`    <changefreq>\${entry.changefreq}</changefreq>\`,
        \`    <priority>\${Number(entry.priority).toFixed(1)}</priority>\`,
        "  </url>",
      ].join("\\n");
    })`,
    `    .map(([, entry]) => {
      const imageEntries = (entry.images ?? []).flatMap((image) => [
        "    <image:image>",
        \`      <image:loc>\${escapeXml(absoluteUrlFor(image))}</image:loc>\`,
        "    </image:image>",
      ]);
      return [
        "  <url>",
        \`    <loc>\${escapeXml(canonicalFor(entry))}</loc>\`,
        \`    <lastmod>\${entry.dateModified ?? lastModified}</lastmod>\`,
        \`    <changefreq>\${entry.changefreq}</changefreq>\`,
        \`    <priority>\${Number(entry.priority).toFixed(1)}</priority>\`,
        ...imageEntries,
        "  </url>",
      ].join("\\n");
    })`,
    "las imágenes dentro del sitemap",
  );

  source = replaceRequired(
    source,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    "el namespace de imágenes del sitemap",
  );

  return source;
});

const testPath = join(
  projectRoot,
  "src",
  "features",
  "seo-content",
  "components",
  "SeoGuidePage.test.tsx",
);
await writeFile(
  testPath,
  `import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SeoGuideRoute } from "@app/types";
import { SeoGuidePage } from "./SeoGuidePage";

const cases: readonly [SeoGuideRoute, string, string][] = [
  [
    "guide-crafting-profit",
    "rentabilidad-crafteo",
    "Resumen ilustrativo de rentabilidad de crafteo",
  ],
  [
    "guide-resource-return-rate",
    "retorno-materiales-rrr",
    "Ejemplo de materiales requeridos, devueltos y consumidos",
  ],
  [
    "guide-black-market-profit",
    "black-market-caerleon",
    "Comparación ilustrativa entre comprar y transportar",
  ],
];

describe("SeoGuidePage images", () => {
  it.each(cases)("renders responsive real imagery for %s", (route, slug, alt) => {
    const markup = renderToStaticMarkup(<SeoGuidePage route={route} />);

    expect(markup).toContain(\`/images/guides/\${slug}-1x1.png\`);
    expect(markup).toContain(\`/images/guides/\${slug}-4x3.png\`);
    expect(markup).toContain(\`/images/guides/\${slug}-16x9.png\`);
    expect(markup).toContain(alt);
    expect(markup).toContain('fetchPriority="high"');
  });
});
`,
  "utf8",
);
console.log("Updated SeoGuidePage.test.tsx");
