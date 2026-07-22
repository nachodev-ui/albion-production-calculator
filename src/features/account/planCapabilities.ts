import { ENTITLEMENT_KEYS, type EntitlementKey } from "./types";

export type CapabilityAvailability = "available" | "coming-soon";

export interface PlanCapability {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly availability: CapabilityAvailability;
  readonly entitlementKey?: EntitlementKey;
}

export const FREE_PLAN_CAPABILITIES = [
  {
    id: "history-7-days",
    label: "Hasta 7 días de historial de mercado",
    description: "Consulta precios recientes y su evolución para validar cálculos básicos.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.historyMaxDays,
  },
  {
    id: "cloud-presets-3",
    label: "Hasta 3 presets sincronizados",
    description:
      "Con una cuenta iniciada, tus configuraciones se guardan en la nube y quedan disponibles en otros dispositivos.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.savedConfigurationsMax,
  },
  {
    id: "base-profitability",
    label: "Comparación de precios y rentabilidad base",
    description:
      "Compara costos, precio de venta, beneficio y ROI antes de fabricar.",
    availability: "available",
  },
  {
    id: "crafting-calculation",
    label: "Cálculo de retorno, tarifas, fama y progreso",
    description:
      "Incluye RRR, foco, costos del puesto y proyección de especialización.",
    availability: "available",
  },
] as const satisfies readonly PlanCapability[];

export const PRO_PLAN_CAPABILITIES = [
  {
    id: "black-market-analytics",
    label: "Black Market Analytics",
    description:
      "Escanea oportunidades, compara compra y fabricación, y muestra historial, confianza y riesgo.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.blackMarketAnalytics,
  },
  {
    id: "history-28-days",
    label: "Hasta 28 días de historial de mercado",
    description:
      "Amplía la ventana histórica para evaluar liquidez, mediana y comportamiento reciente.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.historyMaxDays,
  },
  {
    id: "liquidity-optimizer",
    label: "Optimizador con análisis de liquidez",
    description:
      "Prioriza alternativas utilizando cobertura, antigüedad, observaciones y volumen disponible.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.optimizerLiquidity,
  },
  {
    id: "cloud-presets-100",
    label: "Hasta 100 presets sincronizados",
    description:
      "Guarda configuraciones reutilizables en la nube junto con el historial de cálculos de tu cuenta.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.savedConfigurationsMax,
  },
  {
    id: "csv-export",
    label: "Exportación CSV del planificador batch",
    description:
      "Descarga filas, resumen económico, materiales consolidados y orden de fabricación.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.exportsCsv,
  },
  {
    id: "batch-planner",
    label: "Planificador batch y lista de compra",
    description:
      "Analiza hasta 25 objetos por lote y consolida beneficio, capital, confianza, materiales y ciudades recomendadas.",
    availability: "available",
    entitlementKey: ENTITLEMENT_KEYS.optimizerBatchLimit,
  },
  {
    id: "market-alerts",
    label: "Hasta 10 alertas de mercado",
    description:
      "Las reglas automáticas y sus notificaciones todavía están en desarrollo y no aparecen como una herramienta utilizable.",
    availability: "coming-soon",
    entitlementKey: ENTITLEMENT_KEYS.marketAlertsMax,
  },
] as const satisfies readonly PlanCapability[];

const COMING_SOON_ENTITLEMENT_KEYS: ReadonlySet<string> = new Set(
  PRO_PLAN_CAPABILITIES.filter(
    (capability) => capability.availability === "coming-soon",
  ).flatMap((capability) =>
    capability.entitlementKey ? [capability.entitlementKey] : [],
  ),
);

export function isComingSoonEntitlement(entitlementKey: string): boolean {
  return COMING_SOON_ENTITLEMENT_KEYS.has(entitlementKey);
}
