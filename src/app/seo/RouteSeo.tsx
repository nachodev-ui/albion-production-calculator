import { useEffect } from "react";
import type { AppRoute } from "../types";

const ORIGIN = "https://albioncalculator.app";

type SeoEntry = readonly [
  path: string,
  title: string,
  description: string,
  index: boolean,
];

const ROUTE_SEO: Readonly<Record<AppRoute, SeoEntry>> = {
  crafting: [
    "/",
    "Calculadora de Crafteo Albion Online | Albion Calculator",
    "Calcula el costo real de fabricar en Albion Online con retorno de materiales, foco, tarifas, impuestos, precios por ciudad y ganancia neta.",
    true,
  ],
  refining: [
    "/refining",
    "Calculadora de Refinamiento Albion Online | Próximamente",
    "Próximo módulo para calcular costos, retorno de materiales y rentabilidad de refinamiento en Albion Online.",
    false,
  ],
  "black-market": [
    "/black-market",
    "Calculadora Black Market Albion Online | Beneficio y ROI",
    "Compara precios de ciudades con órdenes del Black Market de Caerleon y calcula impuesto, transporte, liquidez, beneficio y ROI por objeto.",
    true,
  ],
  presets: [
    "/presets",
    "Presets de Producción | Albion Calculator",
    "Administra configuraciones locales de ciudad, foco, especialización, bono diario y Premium para tus cálculos de Albion Online.",
    false,
  ],
  guides: [
    "/guias",
    "Guías de Economía de Albion Online | Albion Calculator",
    "Explora guías prácticas sobre rentabilidad de crafteo, retorno de materiales y Black Market de Caerleon, con fórmulas y enlaces a las calculadoras.",
    true,
  ],
  plans: [
    "/plans",
    "Planes Free y Pro para Albion Online | Albion Calculator",
    "Compara los planes Free y Pro para crafteo, historial de precios, Black Market, optimización de ganancias y configuraciones en la nube.",
    true,
  ],
  account: [
    "/account",
    "Mi Cuenta | Albion Calculator",
    "Consulta tu identidad, plan y permisos habilitados en Albion Calculator.",
    false,
  ],
  profile: [
    "/profile",
    "Mi Perfil de Albion Online | Albion Calculator",
    "Vincula tu personaje y consulta estadísticas públicas, resumen PvP y actividad reciente de Albion Online.",
    false,
  ],
  admin: [
    "/admin",
    "Administración | Albion Calculator",
    "Área privada de administración de usuarios, permisos y acceso Pro.",
    false,
  ],
  "guide-crafting-profit": [
    "/guias/rentabilidad-crafteo-albion-online",
    "Rentabilidad de Crafteo Albion Online | Guía y Fórmula",
    "Aprende a calcular costo real, retorno de materiales, tarifa, impuestos, beneficio, ROI y precio de equilibrio al craftear en Albion Online.",
    true,
  ],
  "guide-resource-return-rate": [
    "/guias/retorno-materiales-rrr-albion-online",
    "Retorno de Materiales RRR en Albion Online | Guía",
    "Entiende la fórmula del RRR, Production Bonus, foco, materiales recuperables y ahorro esperado por lote al fabricar en Albion Online.",
    true,
  ],
  "guide-black-market-profit": [
    "/guias/black-market-caerleon-rentable",
    "Black Market Caerleon: Cómo Calcular Rentabilidad",
    "Calcula si comprar o fabricar para el Black Market de Caerleon es rentable después de impuesto, transporte, RRR, liquidez y riesgo.",
    true,
  ],
};

function meta(
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

export function RouteSeo({ route }: { readonly route: AppRoute }) {
  useEffect(() => {
    const [path, title, description, index] = ROUTE_SEO[route];
    const canonical = `${ORIGIN}${path === "/" ? "/" : path}`;
    let link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );

    document.documentElement.lang = "es";
    document.title = title;
    meta("name", "description", description);
    meta(
      "name",
      "robots",
      index
        ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        : "noindex, nofollow, noarchive",
    );
    meta("property", "og:title", title);
    meta("property", "og:description", description);
    meta("property", "og:url", canonical);
    meta("name", "twitter:title", title);
    meta("name", "twitter:description", description);

    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.append(link);
    }
    link.href = canonical;
  }, [route]);

  return null;
}
