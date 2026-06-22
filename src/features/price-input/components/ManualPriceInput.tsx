import { useState } from 'react'

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(amount)
}

interface ManualPriceInputProps {
  readonly value: number | undefined
  readonly quantity: number
  readonly onChange: (unitPrice: number) => void
  readonly onClear: () => void
  readonly placeholder?: string
}

/**
 * Input de precio UNITARIO (por una sola unidad del ítem) para una
 * hoja del árbol de cálculo. El total de esa rama es `precio × quantity`,
 * calculado y mostrado como subtotal debajo del input.
 *
 * La ausencia de una clave en el store significa "precio pendiente".
 * Un valor 0 ingresado explícitamente sí es válido, por ejemplo cuando
 * el usuario ya posee ese material y desea tratarlo como costo cero.
 */
export function ManualPriceInput({
  value,
  quantity,
  onChange,
  onClear,
  placeholder = 'Ingresar precio',
}: ManualPriceInputProps) {
  const [text, setText] = useState(value !== undefined ? String(value) : '')

  function commit() {
    const trimmed = text.trim()

    if (trimmed === '') {
      onClear()
      return
    }

    const parsed = Number(trimmed.replace(',', '.'))

    if (!Number.isFinite(parsed) || parsed < 0) {
      setText('')
      onClear()
      return
    }

    setText(String(parsed))
    onChange(parsed)
  }

  const parsedPreview = Number(text.replace(',', '.'))
  const hasText = text.trim() !== ''
  const hasValidPreview = hasText && Number.isFinite(parsedPreview) && parsedPreview >= 0
  const hasInvalidPreview = hasText && !hasValidPreview
  const isMissing = value === undefined && !hasText
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
              setText(value !== undefined ? String(value) : '')
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


      <div className="min-h-4">
        {isMissing ? (
          <p className="text-right text-[11px] text-accent">
            Precio requerido
          </p>
        ) : hasInvalidPreview ? (
          <p className="text-right text-[11px] text-negative">
            Ingresa un valor válido
          </p>
        ) : quantity > 1 ? (
          <p className="text-right text-[11px] tabular text-text-faint">
            {hasValidPreview ? (
              <>
                ×{quantity} ={' '}
                <span className="text-text-muted">
                  {formatSilver(subtotal)}
                </span>
              </>
            ) : (
              <>×{quantity} unidades</>
            )}
          </p>
        ) : (
          <p
            aria-hidden="true"
            className="invisible text-right text-[11px]"
          >
            Espacio reservado
          </p>
        )}
      </div>

    </div>
  )
}
