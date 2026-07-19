import { useEffect } from "react";

const SITE_ORIGIN = "https://albioncalculator.app";
const INDEXABLE_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const PRIVATE_DESCRIPTION =
  "Herramienta de crafteo, mercado y ganancias para Albion Online.";

const PUBLIC_SEO: Readonly<Record<string, readonly [string, string]>> = {
  "/": [
    "Albion Calculator | Crafteo y ganancias en Albion Online",
    "Calcula costos, retorno de materiales, impuestos y ganancias de crafteo en Albion Online. Compara ciudades, precios y rentabilidad antes de fabricar.",
  ],
  "/black-market": [
    "Black Market Calculator | Albion Calculator",
    "Encuentra oportunidades rentables entre ciudades y el Black Market de Caerleon con precios, impuestos, transporte, liquidez y beneficio estimado.",
  ],
  "/plans": [
    "Planes Free y Pro | Albion Calculator",
    "Compara las herramientas gratuitas y Pro de Albion Calculator para crafteo, historial de precios, Black Market y optimización de ganancias.",
  ],
};

function updateSeoMetadata(): void {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const page = PUBLIC_SEO[path];
  const description = page?.[1] ?? PRIVATE_DESCRIPTION;

  document.title = page?.[0] ?? "Albion Calculator";
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute("content", description);
  document
    .querySelector<HTMLMetaElement>('meta[name="robots"]')
    ?.setAttribute("content", page ? INDEXABLE_ROBOTS : "noindex, nofollow");
  document
    .querySelector<HTMLLinkElement>('link[rel="canonical"]')
    ?.setAttribute("href", `${SITE_ORIGIN}${page ? path : "/"}`);
}

export function SeoMetadata() {
  useEffect(() => {
    updateSeoMetadata();
    window.addEventListener("popstate", updateSeoMetadata);
    return () => window.removeEventListener("popstate", updateSeoMetadata);
  }, []);

  return null;
}
