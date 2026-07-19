import { useEffect } from "react";
import type { AppRoute } from "../types";
import routeSeoJson from "./route-seo.json";

type ChangeFrequency = "daily" | "weekly" | "monthly" | "yearly";
type SchemaType = "WebApplication" | "WebPage";

interface RouteSeoEntry {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly index: boolean;
  readonly changefreq: ChangeFrequency;
  readonly priority: number;
  readonly schemaType: SchemaType;
  readonly schemaName: string;
}

interface RouteSeoDocument {
  readonly site: {
    readonly name: string;
    readonly alternateName: string;
    readonly origin: string;
    readonly language: string;
    readonly locale: string;
  };
  readonly routes: Readonly<Record<AppRoute, RouteSeoEntry>>;
}

const routeSeo = routeSeoJson as RouteSeoDocument;

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }

  element.content = content;
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.append(element);
  }

  element.href = href;
}

function buildStructuredData(route: AppRoute, entry: RouteSeoEntry) {
  const { site } = routeSeo;
  const canonical = `${site.origin}${entry.path === "/" ? "/" : entry.path}`;
  const webpage = {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: entry.schemaName,
    description: entry.description,
    inLanguage: site.language,
    isPartOf: {
      "@id": `${site.origin}/#website`,
    },
  };

  if (route === "crafting") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${site.origin}/#website`,
          url: `${site.origin}/`,
          name: site.name,
          alternateName: site.alternateName,
          description: entry.description,
          inLanguage: site.language,
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
          inLanguage: site.language,
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
          inLanguage: site.language,
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

function upsertStructuredData(route: AppRoute, entry: RouteSeoEntry): void {
  const scriptId = "route-seo-structured-data";
  let element = document.head.querySelector<HTMLScriptElement>(`#${scriptId}`);

  if (!element) {
    element = document.createElement("script");
    element.id = scriptId;
    element.type = "application/ld+json";
    document.head.append(element);
  }

  element.textContent = JSON.stringify(buildStructuredData(route, entry));
}

export function RouteSeo({ route }: { readonly route: AppRoute }) {
  useEffect(() => {
    const entry = routeSeo.routes[route];
    const canonical = `${routeSeo.site.origin}${
      entry.path === "/" ? "/" : entry.path
    }`;
    const robots = entry.index
      ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      : "noindex, nofollow, noarchive";

    document.documentElement.lang = routeSeo.site.language;
    document.title = entry.title;

    upsertMeta("name", "description", entry.description);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "application-name", routeSeo.site.name);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", routeSeo.site.name);
    upsertMeta("property", "og:locale", routeSeo.site.locale);
    upsertMeta("property", "og:title", entry.title);
    upsertMeta("property", "og:description", entry.description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", entry.title);
    upsertMeta("name", "twitter:description", entry.description);
    upsertCanonical(canonical);
    upsertStructuredData(route, entry);
  }, [route]);

  return null;
}
