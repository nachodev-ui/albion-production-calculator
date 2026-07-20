import { InfoHint } from "@shared/components/InfoHint";
import type {
  BlackMarketOpportunityFilters,
  BlackMarketStrategyFilter,
  BlackMarketStrategySort,
} from "../types";
import {
  BLACK_MARKET_CONTROL_CLASS_NAME,
  BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME,
} from "./blackMarketScannerConfig";

interface BlackMarketStrategyAssumptionsProps {
  readonly filters: BlackMarketOpportunityFilters;
  readonly onChange: (patch: Partial<BlackMarketOpportunityFilters>) => void;
}

function FieldLabel({
  children,
  hint,
}: {
  readonly children: string;
  readonly hint: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
      {children}
      <InfoHint
        label={children}
        text={hint}
        align="left"
        openOnHover
        width={310}
      />
    </span>
  );
}

function nonNegative(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function BlackMarketStrategyAssumptions({
  filters,
  onChange,
}: BlackMarketStrategyAssumptionsProps) {
  return (
    <section className="rounded-xl border border-accent-border/45 bg-accent-muted/20 p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-2 border-b border-accent-border/30 pb-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Análisis masivo de fabricación
          </p>
          <h3 className="mt-1 text-base font-semibold text-text">
            Foco, calidad y logística ajustados por riesgo
          </h3>
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-text-muted">
            La página consulta los materiales de todos los resultados en batch y
            reutiliza la configuración actual de la calculadora. Los valores de
            esta sección convierten el beneficio contable en beneficio económico
            ajustado.
          </p>
        </div>
        <span className="rounded-full border border-warning/30 bg-warning-muted px-3 py-1 text-[10px] text-warning">
          Máximo 100 resultados por página
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label>
          <FieldLabel hint="Filtra la tabla después de calcular comprar terminado, fabricar sin foco y fabricar con foco. La selección se aplica solo a la página actual.">
            Mejor estrategia
          </FieldLabel>
          <select
            value={filters.strategyFilter}
            onChange={(event) =>
              onChange({
                strategyFilter: event.target.value as BlackMarketStrategyFilter,
              })
            }
            className={`mt-2 ${BLACK_MARKET_CONTROL_CLASS_NAME} cursor-pointer`}
          >
            <option value="all">Todas</option>
            <option value="buy-finished">Comprar terminado</option>
            <option value="craft-without-focus">Fabricar sin foco</option>
            <option value="craft-with-focus">Fabricar con foco</option>
          </select>
        </label>

        <label>
          <FieldLabel hint="Orden local aplicado después de recibir la página desde la API. Mayor ventaja compara el beneficio ajustado con comprar el objeto terminado.">
            Orden de estrategias
          </FieldLabel>
          <select
            value={filters.strategySort}
            onChange={(event) =>
              onChange({
                strategySort: event.target.value as BlackMarketStrategySort,
              })
            }
            className={`mt-2 ${BLACK_MARKET_CONTROL_CLASS_NAME} cursor-pointer`}
          >
            <option value="best-profit">Mayor beneficio ajustado</option>
            <option value="best-roi">Mayor ROI ajustado</option>
            <option value="advantage">Mayor ventaja vs comprar</option>
            <option value="api">Conservar orden de la API</option>
          </select>
        </label>

        <label>
          <FieldLabel hint="Costo de oportunidad mínimo por cada punto de foco. La estrategia con foco descuenta foco requerido × este valor antes de competir con las demás.">
            Valor mínimo del foco
          </FieldLabel>
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              step={0.01}
              value={filters.focusValuePerPoint}
              onChange={(event) =>
                onChange({ focusValuePerPoint: nonNegative(event.target.value) })
              }
              className={`${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} pr-16 tabular`}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-text-faint">
              plata/foco
            </span>
          </div>
        </label>

        <label>
          <FieldLabel hint="Cuando la página no contiene una orden observada para una calidad inferior, usa este porcentaje del precio objetivo como recuperación conservadora. Cero evita inventar valor.">
            Recuperación calidad inferior
          </FieldLabel>
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={filters.lowerQualityFallbackPercent}
              onChange={(event) =>
                onChange({
                  lowerQualityFallbackPercent: Math.min(
                    100,
                    nonNegative(event.target.value),
                  ),
                })
              }
              className={`${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} pr-8 tabular`}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-text-faint">
              %
            </span>
          </div>
        </label>
      </div>

      <div className="mt-5 grid gap-4 border-t border-accent-border/25 pt-5 sm:grid-cols-2 xl:grid-cols-5">
        <label>
          <FieldLabel hint="Costo total de mover los materiales desde sus ciudades de compra hasta el lugar de fabricación. Se aplica una vez al lote base de cada fila.">
            Materiales → fabricación
          </FieldLabel>
          <input
            type="number"
            min={0}
            step={1}
            value={filters.materialTransportCostPerBatch}
            onChange={(event) =>
              onChange({
                materialTransportCostPerBatch: Math.floor(
                  nonNegative(event.target.value),
                ),
              })
            }
            className={`mt-2 ${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} tabular`}
          />
        </label>

        <label>
          <FieldLabel hint="Costo por cada objeto fabricado para transportarlo desde el lugar de producción hasta Caerleon.">
            Fabricación → Caerleon
          </FieldLabel>
          <input
            type="number"
            min={0}
            step={1}
            value={filters.finishedTransportCostPerUnit}
            onChange={(event) =>
              onChange({
                finishedTransportCostPerUnit: Math.floor(
                  nonNegative(event.target.value),
                ),
              })
            }
            className={`mt-2 ${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} tabular`}
          />
        </label>

        <label>
          <FieldLabel hint="Costo total de escolta, consumibles, montura o protección pagada para el lote.">
            Escolta y protección
          </FieldLabel>
          <input
            type="number"
            min={0}
            step={1}
            value={filters.escortCostPerBatch}
            onChange={(event) =>
              onChange({
                escortCostPerBatch: Math.floor(nonNegative(event.target.value)),
              })
            }
            className={`mt-2 ${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} tabular`}
          />
        </label>

        <label>
          <FieldLabel hint="Probabilidad estimada de perder el lote completo. La pérdida esperada es inversión directa × probabilidad.">
            Probabilidad de muerte
          </FieldLabel>
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={filters.deathProbabilityPercent}
              onChange={(event) =>
                onChange({
                  deathProbabilityPercent: Math.min(
                    100,
                    nonNegative(event.target.value),
                  ),
                })
              }
              className={`${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} pr-8 tabular`}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-text-faint">
              %
            </span>
          </div>
        </label>

        <label>
          <FieldLabel hint="Valor asignado al tiempo invertido en comprar, fabricar y transportar el lote. Se descuenta solo del beneficio ajustado.">
            Costo del tiempo
          </FieldLabel>
          <input
            type="number"
            min={0}
            step={1}
            value={filters.timeCostPerBatch}
            onChange={(event) =>
              onChange({
                timeCostPerBatch: Math.floor(nonNegative(event.target.value)),
              })
            }
            className={`mt-2 ${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} tabular`}
          />
        </label>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-text-faint">
        La probabilidad de calidad usa la tabla base de cinco calidades y el
        valor “Increase in Quality” de tu configuración como porcentaje de
        tiradas adicionales; solo cuenta la mejor tirada. El foco mejora el RRR,
        pero no añade una tirada de calidad en este modelo.
      </p>
    </section>
  );
}
