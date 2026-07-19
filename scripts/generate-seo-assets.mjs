import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(projectRoot, "src", "app", "seo", "route-seo.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const routes = Object.entries(config.routes);
const requestedTargets = new Set(process.argv.slice(2));
const generatePublic = requestedTargets.size === 0 || requestedTargets.has("--public");
const generateDist = requestedTargets.size === 0 || requestedTargets.has("--dist");
const lastModified = process.env.SEO_LASTMOD ?? new Date().toISOString().slice(0, 10);

function canonicalFor(entry) {
  return `${config.site.origin}${entry.path === "/" ? "/" : entry.path}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", "&apos;");
}

function validateConfig() {
  const paths = new Set();
  const canonicals = new Set();

  for (const [route, entry] of routes) {
    if (!entry.path.startsWith("/")) {
      throw new Error(`La ruta SEO ${route} debe comenzar con /.`);
    }
    if (entry.path !== "/" && entry.path.endsWith("/")) {
      throw new Error(`La ruta SEO ${route} no debe terminar con /.`);
    }
    if (paths.has(entry.path)) {
      throw new Error(`Ruta SEO duplicada: ${entry.path}`);
    }

    const canonical = canonicalFor(entry);
    if (canonicals.has(canonical)) {
      throw new Error(`Canónica SEO duplicada: ${canonical}`);
    }
    if (entry.title.length < 20 || entry.title.length > 65) {
      throw new Error(`El título SEO de ${route} debe tener entre 20 y 65 caracteres.`);
    }
    if (entry.description.length < 50 || entry.description.length > 170) {
      throw new Error(
        `La descripción SEO de ${route} debe tener entre 50 y 170 caracteres.`,
      );
    }
    if (
      entry.schemaType === "Article" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(entry.datePublished ?? "") ||
        !/^\d{4}-\d{2}-\d{2}$/.test(entry.dateModified ?? ""))
    ) {
      throw new Error(
        `La ruta Article ${route} requiere datePublished y dateModified en formato YYYY-MM-DD.`,
      );
    }

    paths.add(entry.path);
    canonicals.add(canonical);

    for (const alias of entry.aliases ?? []) {
      if (!alias.startsWith("/") || alias === "/" || alias.endsWith("/")) {
        throw new Error(`Alias SEO no válido en ${route}: ${alias}`);
      }
      if (paths.has(alias)) {
        throw new Error(`Ruta o alias SEO duplicado: ${alias}`);
      }
      paths.add(alias);
    }
  }
}

function buildStructuredData(route, entry) {
  const canonical = canonicalFor(entry);
  const webpage = {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: entry.schemaName,
    description: entry.description,
    inLanguage: config.site.language,
    isPartOf: {
      "@id": `${config.site.origin}/#website`,
    },
  };

  if (route === "crafting") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${config.site.origin}/#website`,
          url: `${config.site.origin}/`,
          name: config.site.name,
          alternateName: config.site.alternateName,
          description: entry.description,
          inLanguage: config.site.language,
        },
        webpage,
        {
          "@type": "WebApplication",
          "@id": `${canonical}#application`,
          url: canonical,
          name: entry.schemaName,
          applicationCategory: "GameApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description: entry.description,
          inLanguage: config.site.language,
          isAccessibleForFree: true,
          about: {
            "@type": "VideoGame",
            name: "Albion Online",
          },
        },
      ],
    };
  }

  if (entry.schemaType === "WebApplication") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        webpage,
        {
          "@type": "WebApplication",
          "@id": `${canonical}#application`,
          url: canonical,
          name: entry.schemaName,
          applicationCategory: "GameApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description: entry.description,
          inLanguage: config.site.language,
          about: {
            "@type": "VideoGame",
            name: "Albion Online",
          },
        },
      ],
    };
  }

  if (entry.schemaType === "Article") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        webpage,
        {
          "@type": "Article",
          "@id": `${canonical}#article`,
          headline: entry.schemaName,
          description: entry.description,
          url: canonical,
          inLanguage: config.site.language,
          datePublished: entry.datePublished,
          dateModified: entry.dateModified,
          mainEntityOfPage: {
            "@id": `${canonical}#webpage`,
          },
          author: {
            "@type": "Organization",
            name: config.site.name,
            url: `${config.site.origin}/`,
          },
          publisher: {
            "@type": "Organization",
            name: config.site.name,
            url: `${config.site.origin}/`,
          },
          about: {
            "@type": "VideoGame",
            name: "Albion Online",
          },
        },
      ],
    };
  }

  return {
    "@context": "https://schema.org",
    ...webpage,
  };
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`No se encontró ${label} en dist/index.html.`);
  }
  return html.replace(pattern, replacement);
}

function createRouteHtml(sourceHtml, route, entry) {
  const canonical = canonicalFor(entry);
  const robots = entry.index
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow, noarchive";
  let html = sourceHtml;

  html = replaceRequired(
    html,
    /<html\s+lang="[^"]*">/,
    `<html lang="${escapeHtml(config.site.language)}">`,
    "el idioma del documento",
  );
  html = replaceRequired(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(entry.title)}</title>`,
    "el título",
  );
  html = replaceRequired(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(entry.description)}" />`,
    "la meta description",
  );
  html = replaceRequired(
    html,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${robots}" />`,
    "la directiva robots",
  );
  html = replaceRequired(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`,
    "la URL canónica",
  );
  html = replaceRequired(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeHtml(entry.title)}" />`,
    "og:title",
  );
  html = replaceRequired(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeHtml(entry.description)}" />`,
    "og:description",
  );
  html = replaceRequired(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`,
    "og:url",
  );
  html = replaceRequired(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(entry.title)}" />`,
    "twitter:title",
  );
  html = replaceRequired(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(entry.description)}" />`,
    "twitter:description",
  );
  html = replaceRequired(
    html,
    /<script(?:\s+id="route-seo-structured-data")?\s+type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="route-seo-structured-data" type="application/ld+json">\n${JSON.stringify(
      buildStructuredData(route, entry),
      null,
      2,
    )}\n    </script>`,
    "los datos estructurados",
  );

  return html;
}

function createSitemap() {
  const urls = routes
    .filter(([, entry]) => entry.index)
    .map(([, entry]) => {
      return [
        "  <url>",
        `    <loc>${escapeXml(canonicalFor(entry))}</loc>`,
        `    <lastmod>${entry.dateModified ?? lastModified}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${Number(entry.priority).toFixed(1)}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function createRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${config.site.origin}/sitemap.xml`,
    "",
  ].join("\n");
}

function createRedirects() {
  const lines = ["/index.html / 301"];

  for (const [, entry] of routes) {
    if (entry.path !== "/") {
      lines.push(`${entry.path}/ ${entry.path} 301`);
      lines.push(`${entry.path}.html ${entry.path} 301`);
    }

    for (const alias of entry.aliases ?? []) {
      lines.push(`${alias} ${entry.path} 301`);
      lines.push(`${alias}/ ${entry.path} 301`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function writeDiscoveryFiles(directory) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "sitemap.xml"), createSitemap(), "utf8");
  await writeFile(join(directory, "robots.txt"), createRobots(), "utf8");
  await writeFile(join(directory, "_redirects"), createRedirects(), "utf8");
}

validateConfig();

if (generatePublic) {
  await writeDiscoveryFiles(join(projectRoot, "public"));
}

if (generateDist) {
  const distDirectory = join(projectRoot, "dist");
  const sourcePath = join(distDirectory, "index.html");
  const sourceHtml = await readFile(sourcePath, "utf8");

  for (const [route, entry] of routes) {
    const targetPath =
      entry.path === "/"
        ? sourcePath
        : join(distDirectory, `${entry.path.slice(1)}.html`);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(
      targetPath,
      createRouteHtml(sourceHtml, route, entry),
      "utf8",
    );
  }

  await writeDiscoveryFiles(distDirectory);
}

console.log(
  `SEO generado para ${routes.length} rutas (${routes.filter(([, entry]) => entry.index).length} indexables).`,
);
