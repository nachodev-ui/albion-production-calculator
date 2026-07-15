import { InfoHint } from "@shared/components/InfoHint";
import type {
  AlbionServer,
  BlackMarketCategory,
  BlackMarketOpportunityFilters,
  BlackMarketOpportunitySort,
} from "../types";
import {
  BLACK_MARKET_CATEGORY_OPTIONS,
  BLACK_MARKET_CONTROL_CLASS_NAME,
  BLACK_MARKET_QUALITY_LABELS,
  BLACK_MARKET_SCANNER_MARKETS,
  BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME,
  BLACK_MARKET_SERVER_OPTIONS,
} from "./blackMarketScannerConfig";

interface BlackMarketScannerControlsProps {
  readonly filters: BlackMarketOpportunityFilters;
  readonly onChange: (patch: Partial<BlackMarketOpportunityFilters>) => void;
}

function FieldLabel({
  children,
  hint,
}: {
  readonly children: string;
  readonly hint?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
      {children}
      {hint && (
        <InfoHint
          label={children}
          text={hint}
          align="left"
          openOnHover
          width={290}
        />
      )}
    </span>
  );
}

function MultiChoice({
  title,
  description,
  values,
  options,
  onChange,
}: {
  readonly title: string;
  readonly description: string;
  readonly values: readonly (string | number)[];
  readonly options: readonly {
    readonly value: string | number;
    readonly label: string;
  }[];
  readonly onChange: (values: readonly (string | number)[]) => void;
}) {
  function toggle(value: string | number) {
    const exists = values.includes(value);
    if (exists && values.length === 1) return;
    onChange(
      exists ? values.filter((item) => item !== value) : [...values, value],
    );
  }

  return (
    <fieldset className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <legend>
          <FieldLabel>{title}</FieldLabel>
          <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
            {description}
          </p>
        </legend>
        <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[9px] font-semibold tabular text-text-faint">
          {values.length} activos
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              aria-label={`${selected ? "Excluir" : "Incluir"} ${option.label}`}
              onClick={() => toggle(option.value)}
              className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised active:translate-y-0 ${
                selected
                  ? "border-accent-border bg-accent-muted text-accent shadow-sm"
                  : "border-border bg-surface text-text-muted hover:-translate-y-0.5 hover:border-accent-border hover:bg-accent-muted/60 hover:text-accent hover:shadow-sm"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] leading-none transition-colors ${
                  selected
                    ? "border-accent bg-accent text-bg"
                    : "border-border-strong text-transparent group-hover:border-accent-border group-hover:text-accent"
                }`}
              >
                ✓
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BlackMarketScannerControls({
  filters,
  onChange,
}: BlackMarketScannerControlsProps) {
  const marketOptions = BLACK_MARKET_SCANNER_MARKETS.map((market) => ({
    value: market.key,
    label: market.name,
  }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label>
          <FieldLabel hint="Selecciona la región donde se capturaron los datos. Los valores internos west/east se mantienen por compatibilidad con la API, pero se muestran con los nombres actuales del juego.">
            Servidor
          </FieldLabel>
          <select
            value={filters.server}
            onChange={(event) =>
              onChange({ server: event.target.value as AlbionServer })
            }
            className={`mt-2 ${BLACK_MARKET_CONTROL_CLASS_NAME} cursor-pointer`}
          >
            {BLACK_MARKET_SERVER_OPTIONS.map((server) => (
              <option key={server.value} value={server.value}>
                {server.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <FieldLabel hint="Beneficio neto mínimo por unidad después de descontar el impuesto de venta y el transporte configurado.">
            Beneficio mínimo
          </FieldLabel>
          <input
            type="number"
            min={0}
            value={filters.minimumProfit}
            onChange={(event) =>
              onChange({
                minimumProfit: Math.max(
                  0,
                  Math.floor(Number(event.target.value) || 0),
                ),
              })
            }
            className={`mt-2 ${BLACK_MARKET_CONTROL_CLASS_NAME} tabular`}
          />
        </label>

        <label>
          <FieldLabel hint="Retorno sobre costo: beneficio dividido por el precio de compra. Sirve para comparar oportunidades de distinto valor.">
            ROI mínimo
          </FieldLabel>
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              step={0.5}
              value={filters.minimumReturnOnCostPercent}
              onChange={(event) =>
                onChange({
                  minimumReturnOnCostPercent: Math.max(
                    0,
                    Number(event.target.value) || 0,
                  ),
                })
              }
              className={`${BLACK_MARKET_CONTROL_CLASS_NAME} pr-8 tabular`}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-text-faint">
              %
            </span>
          </div>
        </label>

        <label>
          <FieldLabel>Ordenar por</FieldLabel>
          <select
            value={filters.sort}
            onChange={(event) =>
              onChange({
                sort: event.target.value as BlackMarketOpportunitySort,
              })
            }
            className={`mt-2 ${BLACK_MARKET_CONTROL_CLASS_NAME} cursor-pointer`}
          >
            <option value="profit">Mayor beneficio</option>
            <option value="roi">Mayor ROI</option>
            <option value="freshness">Mayor frescura</option>
          </select>
        </label>

        <label>
          <FieldLabel>Resultados por página</FieldLabel>
          <select
            value={filters.limit}
            onChange={(event) => onChange({ limit: Number(event.target.value) })}
            className={`mt-2 ${BLACK_MARKET_CONTROL_CLASS_NAME} cursor-pointer`}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </label>
      </div>

      <section className="rounded-xl border border-border bg-surface-raised/55 p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-2 border-b border-border pb-4 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Filtros de búsqueda
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-text-faint">
              Los botones dorados están activos. Pasa el cursor para ver el estado interactivo y haz clic para incluir o excluir una opción.
            </p>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-faint">
            Siempre debe quedar al menos una opción activa
          </p>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <MultiChoice
            title="Mercados de compra"
            description="Ciudades donde buscar el precio de venta más barato."
            values={filters.purchaseMarketKeys}
            options={marketOptions}
            onChange={(values) =>
              onChange({ purchaseMarketKeys: values as readonly string[] })
            }
          />
          <MultiChoice
            title="Categorías"
            description="Tipos de equipamiento que se incluirán en el escaneo."
            values={filters.categories}
            options={BLACK_MARKET_CATEGORY_OPTIONS.map((category) => ({
              value: category.key,
              label: category.label,
            }))}
            onChange={(values) =>
              onChange({
                categories: values as readonly BlackMarketCategory[],
              })
            }
          />
        </div>

        <div className="mt-6 grid gap-6 border-t border-border pt-5 md:grid-cols-3">
          <MultiChoice
            title="Tier"
            description="Nivel base de los objetos que deseas comparar."
            values={filters.tiers}
            options={[4, 5, 6, 7, 8].map((value) => ({
              value,
              label: `T${value}`,
            }))}
            onChange={(values) =>
              onChange({ tiers: values as readonly number[] })
            }
          />
          <MultiChoice
            title="Encantamiento"
            description="Nivel de encantamiento desde .0 hasta .4."
            values={filters.enchantments}
            options={[0, 1, 2, 3, 4].map((value) => ({
              value,
              label: value === 0 ? ".0" : `.${value}`,
            }))}
            onChange={(values) =>
              onChange({ enchantments: values as readonly number[] })
            }
          />
          <MultiChoice
            title="Calidad de compra"
            description="Calidades aceptadas para el precio de origen."
            values={filters.qualities}
            options={[1, 2, 3, 4, 5].map((value) => ({
              value,
              label: BLACK_MARKET_QUALITY_LABELS[value] ?? String(value),
            }))}
            onChange={(values) =>
              onChange({ qualities: values as readonly number[] })
            }
          />
        </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <FieldLabel hint="Antigüedad máxima, en minutos, aceptada para el precio de venta de la ciudad. Un valor menor exige capturas más recientes, pero puede reducir los resultados.">
              Edad ciudad
            </FieldLabel>
            <div className="relative mt-2">
              <input
                type="number"
                min={1}
                max={10080}
                value={filters.maximumCityAgeMinutes}
                onChange={(event) =>
                  onChange({
                    maximumCityAgeMinutes: Math.max(
                      1,
                      Math.floor(Number(event.target.value) || 1),
                    ),
                  })
                }
                className={`${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} pr-12 tabular`}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-text-faint">
                min
              </span>
            </div>
          </label>

          <label>
            <FieldLabel hint="Antigüedad máxima, en minutos, aceptada para la orden de compra del Black Market. Si la captura supera este límite, no se considera una oportunidad válida.">
              Edad Black Market
            </FieldLabel>
            <div className="relative mt-2">
              <input
                type="number"
                min={1}
                max={10080}
                value={filters.maximumBlackMarketAgeMinutes}
                onChange={(event) =>
                  onChange({
                    maximumBlackMarketAgeMinutes: Math.max(
                      1,
                      Math.floor(Number(event.target.value) || 1),
                    ),
                  })
                }
                className={`${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} pr-12 tabular`}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-text-faint">
                min
              </span>
            </div>
          </label>

          <label>
            <FieldLabel hint="Porcentaje descontado del precio pagado por el Black Market. Ajusta este valor según tu condición de Premium y las reglas vigentes dentro del juego.">
              Impuesto de venta
            </FieldLabel>
            <div className="relative mt-2">
              <input
                type="number"
                min={0}
                max={99.99}
                step={0.1}
                value={filters.salesTaxPercent}
                onChange={(event) =>
                  onChange({
                    salesTaxPercent: Math.min(
                      99.99,
                      Math.max(0, Number(event.target.value) || 0),
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
            <FieldLabel hint="Costo estimado en plata por cada unidad transportada desde la ciudad de compra hasta Caerleon. Se resta del beneficio. Usa 0 si prefieres no considerar viaje, riesgo o desgaste.">
              Transporte por unidad
            </FieldLabel>
            <input
              type="number"
              min={0}
              value={filters.transportCostPerUnit}
              onChange={(event) =>
                onChange({
                  transportCostPerUnit: Math.max(
                    0,
                    Math.floor(Number(event.target.value) || 0),
                  ),
                })
              }
              className={`mt-2 ${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} tabular`}
            />
          </label>
        </div>
      </section>
    </>
  );
}
