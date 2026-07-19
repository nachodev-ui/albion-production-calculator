import { useEffect } from "react";
import type { AppRoute } from "./types";

const SITE_NAME = "Albion Calculator";
const SITE_ORIGIN = "https://albioncalculator.app";

interface RouteSeoConfig {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly indexable: boolean;
}

const ROUTE_SEO: Readonly<Record<AppRoute, RouteSeoConfig>> = {
  crafting: {
    title: "Albion Calculator | Crafteo y ganancias en Albion Online",
    description:
      "Calcula costos, retorno de materiales, impuestos y ganancias de crafteo en Albion Online. Compara ciudades, precios y rentabilidad antes de fabricar.",
    path: "/",
    indexable: true,
  },
  refining: {
    title: "Calculadora de refinamiento | Albion Calculator",
    description:
      "Próximamente: calcula costos netos, retorno de recursos y rentabilidad de refinamiento en Albion Online.",
    path: "/refining",
    indexable: false,
  },
  "black-market": {
    title: "Black Market Calculator | Albion Calculator",
    description:
      "Encuentra oportunidades rentables entre ciudades y el Black Market de Caerleon con precios, impuestos, transporte, liquidez y beneficio estimado.",
    path: "/black-market",
    indexable: true,
  },
  presets: {
    title: "Presets de producción | Albion Calculator",
    description:
      "Administra configuraciones locales de ciudad, foco, Premium y bonos de producción para tus cálculos de Albion Online.",
    path: "/presets",
    indexable: false,
  },
  plans: {
    title: "Planes Free y Pro | Albion Calculator",
    description:
      "Compara las herramientas gratuitas y Pro de Albion Calculator para crafteo, historial de precios, Black Market y optimización de ganancias.",
    path: "/plans",
    indexable: true,
  },
  account: {
    title: "Mi cuenta | Albion Calculator",
    description: "Gestiona tu cuenta y tus permisos en Albion Calculator.",
    path: "/account",
    indexable: false,
  },
  profile: {
    title: "Mi perfil de Albion | Albion Calculator",
    description:
      "Consulta el personaje vinculado, estadísticas públicas y actividad reciente de Albion Online.",
    path: "/profile",
    indexable: false,
  },
  admin: {
    title: "Administración | Albion Calculator",
    description: "Panel privado de administración de Albion Calculator.",
    path: "/admin",
    indexable: false,
  },
};

function setMeta(selector: string, attribute: string, value: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    const [attributeName, attributeValue] = attribute.split("=");
    if (attributeName && attributeValue) {
      element.setAttribute(attributeName, attributeValue);
    }
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

function setCanonical(href: string): void {
  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = href;
}

export function applyRouteSeo(route: AppRoute): void {
  const config = ROUTE_SEO[route];
  const canonicalUrl = new URL(config.path, SITE_ORIGIN).toString();
  const robots = config.indexable
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow";

  document.title = config.title;
  document.documentElement.lang = "es";
  setCanonical(canonicalUrl);
  setMeta('meta[name="description"]', "name=description", config.description);
  setMeta('meta[name="robots"]', "name=robots", robots);
  setMeta('meta[property="og:type"]', "property=og:type", "website");
  setMeta('meta[property="og:site_name"]', "property=og:site_name", SITE_NAME);
  setMeta('meta[property="og:locale"]', "property=og:locale", "es_CL");
  setMeta('meta[property="og:title"]', "property=og:title", config.title);
  setMeta(
    'meta[property="og:description"]',
    "property=og:description",
    config.description,
  );
  setMeta('meta[property="og:url"]', "property=og:url", canonicalUrl);
  setMeta('meta[name="twitter:card"]', "name=twitter:card", "summary");
  setMeta('meta[name="twitter:title"]', "name=twitter:title", config.title);
  setMeta(
    'meta[name="twitter:description"]',
    "name=twitter:description",
    config.description,
  );
}

export function useRouteSeo(route: AppRoute): void {
  useEffect(() => {
    applyRouteSeo(route);
  }, [route]);
}
