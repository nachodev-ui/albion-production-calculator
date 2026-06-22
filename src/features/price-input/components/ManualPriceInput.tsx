import { useState } from 'react'

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 1,
  }).format(amount)
}

interface ManualPriceInputProps {
  /** Override manual. `undefined` significa que puede usarse AODP. */
  readonly value: number | undefined
  readonly automaticValue?: number
  readonly automaticLabel?: string
  readonly isAutomaticLoading?: boolean
  readonly quantity: number
  readonly onChange: (unitPrice: number) => void
  readonly onClear: () => void
  readonly placeholder?: string
}

/**
 * Input de precio unitario con prioridad manual:
 *
 * 1. Si existe un valor manual, se usa ese precio.
 * 2. Si se limpia el override, vuelve al precio automático disponible.
 * 3. Si ninguna fuente tiene precio, la hoja queda pendiente.
 */
export function ManualPriceInput({
  value,
  automaticValue,
  automaticLabel = 'AODP',
  isAutomaticLoading = false,
  quantity,
  onChange,
  onClear,
  placeholder = '0',
}: ManualPriceInputProps) {
  const committedValue = value ?? automaticValue
  const [text, setText] = useState(
    committedValue !== undefined ? String(committedValue) : '',
  )

  const isManualOverride = value !== undefined
  const hasAutomaticValue = automaticValue !== undefined

  function commit() {
    const trimmed = text.trim()

    if (trimmed === '') {
      onClear()
      setText(
        automaticValue !== undefined ? String(automaticValue) : '',
      )
      return
    }

    const parsed = Number(trimmed.replace(',', '.'))

    if (!Number.isFinite(parsed) || parsed < 0) {
      setText(
        committedValue !== undefined ? String(committedValue) : '',
      )
      return
    }

    setText(String(parsed))
    onChange(parsed)
  }

  const parsedPreview = Number(text.replace(',', '.'))
  const hasText = text.trim() !== ''
  const hasValidPreview =
    hasText && Number.isFinite(parsedPreview) && parsedPreview >= 0
  const hasInvalidPreview = hasText && !hasValidPreview
  const isMissing = committedValue === undefined && !hasText
  const subtotal = hasValidPreview ? parsedPreview * quantity : 0

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text-faint">Plata c/u:</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          aria-label="Precio unitario del material"
          aria-invalid={isMissing || hasInvalidPreview}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              setText(
                committedValue !== undefined
                  ? String(committedValue)
                  : '',
              )
            }
          }}
          onClick={(event) => event.stopPropagation()}
          className={`w-28 rounded-md border bg-surface px-2 py-1 text-right text-sm tabular text-text outline-none transition-colors
            placeholder:text-text-faint placeholder:text-sm placeholder:font-normal
            hover:border-border-strong
            focus-visible:border-accent-border focus-visible:ring-2 focus-visible:ring-accent-border ${
              hasInvalidPreview
                ? 'border-negative'
                : 'border-border'
            }`}
        />
      </div>

      <div className="flex min-h-4 items-center justify-between gap-2 text-[11px]">
        <div className="min-w-0">
          {isManualOverride ? (
            hasAutomaticValue ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onClear()
                }}
                className="truncate text-accent underline decoration-accent/40 underline-offset-2 hover:text-text"
              >
                Usar precio AODP
              </button>
            ) : (
              <span className="text-text-faint">Precio manual</span>
            )
          ) : hasAutomaticValue ? (
            <span
              className="block max-w-32 truncate text-positive"
              title={automaticLabel}
            >
              {automaticLabel}
            </span>
          ) : isAutomaticLoading ? (
            <span className="text-text-faint">Consultando AODP…</span>
          ) : (
            <span aria-hidden="true" className="invisible">
              Sin fuente
            </span>
          )}
        </div>

        <div className="shrink-0 text-right">
          {hasInvalidPreview ? (
            <span className="text-negative">Valor inválido</span>
          ) : isMissing ? (
            <span className="text-accent">Precio requerido</span>
          ) : quantity > 1 ? (
            <span className="tabular text-text-faint">
              ×{quantity} ={' '}
              <span className="text-text-muted">
                {formatSilver(subtotal)}
              </span>
            </span>
          ) : (
            <span aria-hidden="true" className="invisible">
              Espacio reservado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
