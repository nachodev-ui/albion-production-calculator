import type { MarketHistoryPoint } from '../types/MarketHistory'

interface MarketHistoryChartProps {
  readonly points: readonly MarketHistoryPoint[]
}

const WIDTH = 760
const HEIGHT = 260
const LEFT = 58
const RIGHT = 18
const TOP = 18
const PRICE_BOTTOM = 174
const VOLUME_TOP = 194
const BOTTOM = 226

function formatCompact(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}

function formatExactDate(timestamp: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}

function buildPriceSegments(
  points: readonly MarketHistoryPoint[],
  xForIndex: (index: number) => number,
  yForPrice: (price: number) => number,
): readonly string[] {
  const segments: string[] = []
  let current = ''

  points.forEach((point, index) => {
    if (point.averagePrice === null) {
      if (current) segments.push(current)
      current = ''
      return
    }

    const command = current ? 'L' : 'M'
    current += `${command}${xForIndex(index).toFixed(2)},${yForPrice(point.averagePrice).toFixed(2)} `
  })

  if (current) segments.push(current)
  return segments
}

export function MarketHistoryChart({ points }: MarketHistoryChartProps) {
  const priceValues = points
    .map((point) => point.averagePrice)
    .filter((price): price is number => price !== null && price > 0)
  const maximumVolume = Math.max(0, ...points.map((point) => point.itemCount))

  if (points.length === 0 || (priceValues.length === 0 && maximumVolume === 0)) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-border bg-surface px-4 text-center text-xs text-text-faint">
        <span className="max-w-xl leading-relaxed">
          El servicio local no tiene ventas capturadas para esta combinación
          exacta de objeto, ciudad y calidad. Abre ese objeto en el mercado de
          Albion o prueba otra calidad o ciudad.
        </span>
      </div>
    )
  }

  const plotWidth = WIDTH - LEFT - RIGHT
  const xForIndex = (index: number): number =>
    points.length <= 1
      ? LEFT + plotWidth / 2
      : LEFT + (index / (points.length - 1)) * plotWidth

  const minimumObservedPrice =
    priceValues.length > 0 ? Math.min(...priceValues) : 0
  const maximumObservedPrice =
    priceValues.length > 0 ? Math.max(...priceValues) : 1
  const pricePadding = Math.max(
    1,
    (maximumObservedPrice - minimumObservedPrice) * 0.08,
  )
  const minimumPrice = Math.max(0, minimumObservedPrice - pricePadding)
  const maximumPrice = maximumObservedPrice + pricePadding
  const priceRange = Math.max(1, maximumPrice - minimumPrice)

  const yForPrice = (price: number): number =>
    PRICE_BOTTOM -
    ((price - minimumPrice) / priceRange) * (PRICE_BOTTOM - TOP)

  const priceSegments = buildPriceSegments(points, xForIndex, yForPrice)
  const barSlotWidth = plotWidth / Math.max(1, points.length)
  const barWidth = Math.max(3, Math.min(18, barSlotWidth * 0.62))
  const gridPrices = [maximumPrice, (maximumPrice + minimumPrice) / 2, minimumPrice]
  const labelIndexes = Array.from(
    new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]),
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Evolución del precio promedio diario y volumen histórico de órdenes de venta"
        className="h-auto min-w-[620px] w-full"
      >
        <title>
          Precio promedio diario y volumen histórico de órdenes de venta
        </title>

        {gridPrices.map((price) => {
          const y = yForPrice(price)

          return (
            <g key={price}>
              <line
                x1={LEFT}
                x2={WIDTH - RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text
                x={LEFT - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-faint)"
                fontSize="10"
              >
                {formatCompact(price)}
              </text>
            </g>
          )
        })}

        <line
          x1={LEFT}
          x2={WIDTH - RIGHT}
          y1={VOLUME_TOP - 8}
          y2={VOLUME_TOP - 8}
          stroke="var(--color-border)"
          strokeWidth="1"
        />

        {points.map((point, index) => {
          const x = xForIndex(index)
          const barHeight =
            maximumVolume > 0
              ? (point.itemCount / maximumVolume) * (BOTTOM - VOLUME_TOP)
              : 0

          return (
            <rect
              key={`volume-${point.timestamp}`}
              x={x - barWidth / 2}
              y={BOTTOM - barHeight}
              width={barWidth}
              height={barHeight}
              rx="1.5"
              fill="var(--color-border-strong)"
              opacity="0.8"
            >
              <title>
                {`${formatExactDate(point.timestamp)}: ${point.itemCount.toLocaleString('es-CL')} unidades registradas`}
              </title>
            </rect>
          )
        })}

        {priceSegments.map((segment, index) => (
          <path
            key={`price-segment-${index}`}
            d={segment}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {points.map((point, index) =>
          point.averagePrice === null ? null : (
            <circle
              key={`price-${point.timestamp}`}
              cx={xForIndex(index)}
              cy={yForPrice(point.averagePrice)}
              r="3"
              fill="var(--color-accent)"
              stroke="var(--color-surface)"
              strokeWidth="1.5"
            >
              <title>
                {`${formatExactDate(point.timestamp)}: ${point.averagePrice.toLocaleString('es-CL', { maximumFractionDigits: 0 })} plata · ${point.itemCount.toLocaleString('es-CL')} unidades`}
              </title>
            </circle>
          ),
        )}

        {labelIndexes.map((index) => {
          const point = points[index]
          if (!point) return null

          return (
            <text
              key={`label-${point.timestamp}`}
              x={xForIndex(index)}
              y={HEIGHT - 10}
              textAnchor={
                index === 0
                  ? 'start'
                  : index === points.length - 1
                    ? 'end'
                    : 'middle'
              }
              fill="var(--color-text-faint)"
              fontSize="10"
            >
              {formatDate(point.timestamp)}
            </text>
          )
        })}

        <text
          x={LEFT}
          y={12}
          fill="var(--color-accent)"
          fontSize="10"
          fontWeight="600"
        >
          Precio promedio
        </text>
        <text
          x={LEFT}
          y={VOLUME_TOP - 12}
          fill="var(--color-text-faint)"
          fontSize="10"
          fontWeight="600"
        >
          Volumen diario
        </text>
      </svg>
    </div>
  )
}
