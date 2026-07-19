import { useEffect } from "react";
import type { AppRoute } from "../types";
import routeSeoJson from "./route-seo.json";

interface RouteSeoEntry {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly index: boolean;
}

interface RouteSeoDocument {
  readonly site: {
    readonly origin: string;
    readonly language: string;
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

export function RouteSeo({ route }: { readonly route: AppRoute }) {
  useEffect(() => {
    const entry = routeSeo.routes[route];
    const canonical = `${routeSeo.site.origin}${
      entry.path === "/" ? "/" : entry.path
    }`;

    document.documentElement.lang = routeSeo.site.language;
    document.title = entry.title;

    upsertMeta("name", "description", entry.description);
    upsertMeta(
      "name",
      "robots",
      entry.index
        ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        : "noindex, nofollow, noarchive",
    );
    upsertMeta("property", "og:title", entry.title);
    upsertMeta("property", "og:description", entry.description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("name", "twitter:title", entry.title);
    upsertMeta("name", "twitter:description", entry.description);
    upsertCanonical(canonical);
  }, [route]);

  return null;
}
