import { CITIES } from '@core/domain/entities/City'
import type { CityId } from '@core/domain/entities/City'
import type { NodeReturnRateConfig } from '@core/domain/entities/CraftCostNode'
import { calculateReturnRate } from '@core/domain/entities/ReturnRate'

interface ReturnRateConfigPanelProps {
  readonly config: NodeReturnRateConfig
  readonly onChange: (config: NodeReturnRateConfig) => void
}

/**
 * Selector de Resource Return Rate para UN nodo expandido del árbol:
 * ciudad, bono de especialidad, foco y bono diario.
 *
 * `specialtyKind` (refinado vs. crafteo) no se expone como selector
 * propio: lo decide quien llama a este panel según la categoría del
 * ítem del nodo (`isRefiningContext`), porque el dataset actual no
 * captura `craftingcategory` por ítem para auto-detectar si ESA
 * ciudad puntual da bono a ESE ítem puntual — pedirle al usuario que
 * tilde "tiene bono acá" es más honesto que adivinar.
 */
export function ReturnRateConfigPanel({ config, onChange }: ReturnRateConfigPanelProps) {
  const rrr = calculateReturnRate(config)

  function update(patch: Partial<NodeReturnRateConfig>) {
    onChange({ ...config, ...patch })
  }

  function handleCityChange(cityId: CityId) {
    update({ cityId, isIsland: cityId === 'island' })
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-text-faint shrink-0">Ciudad</label>
        <select
          value={config.cityId}
          onChange={(event) => handleCityChange(event.target.value as CityId)}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          {CITIES.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <label className={`flex items-center justify-between gap-2 text-xs ${config.isIsland ? 'opacity-40' : ''}`}>
        <span className="text-text-faint">Bono de especialidad acá</span>
        <input
          type="checkbox"
          disabled={config.isIsland}
          checked={config.hasSpecialtyBonus}
          onChange={(event) => update({ hasSpecialtyBonus: event.target.checked })}
          className="accent-accent"
        />
      </label>

      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-text-faint">Usar Foco de crafteo</span>
        <input
          type="checkbox"
          checked={config.useFocus}
          onChange={(event) => update({ useFocus: event.target.checked })}
          className="accent-accent"
        />
      </label>

      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-text-faint">Bono de producción diario</span>
        <input
          type="checkbox"
          checked={config.hasDailyBonus}
          onChange={(event) => update({ hasDailyBonus: event.target.checked })}
          className="accent-accent"
        />
      </label>

      {config.hasDailyBonus && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-text-faint">Magnitud del bono</span>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {([0.1, 0.2] as const).map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => update({ dailyBonusAmount: amount })}
                className={`px-2 py-1 text-[11px] font-mono tabular ${
                  config.dailyBonusAmount === amount
                    ? 'bg-accent text-bg'
                    : 'bg-transparent text-text-muted hover:text-text'
                }`}
              >
                +{amount * 100}%
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="text-text-faint">Return Rate resultante</span>
        <span className="font-mono tabular text-positive">{Math.round(rrr * 100)}%</span>
      </div>
    </div>
  )
}
