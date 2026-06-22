import { ENCHANTMENT_LEVELS, formatEnchantment } from '@core/domain/entities/Enchantment'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'

interface EnchantmentSelectorProps {
  readonly value: EnchantmentLevel
  readonly onChange: (level: EnchantmentLevel) => void
  readonly maxEnchantment: EnchantmentLevel
}

/**
 * Selector de nivel de encantamiento (.0 a .4), deshabilitando los
 * niveles que el ítem seleccionado no admite (`maxEnchantment`) en
 * vez de ocultarlos — así el usuario ve el rango completo del
 * sistema y entiende por qué ciertos niveles no están disponibles
 * para ESTE ítem en particular.
 */
export function EnchantmentSelector({ value, onChange, maxEnchantment }: EnchantmentSelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-raised p-1 gap-1">
      {ENCHANTMENT_LEVELS.map((level) => {
        const disabled = level > maxEnchantment
        const isActive = level === value
        return (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level)}
            aria-pressed={isActive}
            className={`min-w-[2.75rem] rounded-md px-3 py-1.5 text-xs font-mono tabular transition-all ${
              isActive
                ? 'bg-accent text-bg shadow-sm font-semibold'
                : disabled
                  ? 'text-text-faint cursor-not-allowed opacity-50'
                  : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
          >
            {level === 0 ? 'T0' : formatEnchantment(level)}
          </button>
        )
      })}
    </div>
  )
}