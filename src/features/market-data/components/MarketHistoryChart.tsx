import { useId, useState } from 'react'
import type { MarketHistoryPoint } from '../types/MarketHistory'
import './MarketHistoryChart.css'

interface MarketHistoryChartProps {
  readonly points: readonly MarketHistoryPoint[]
}

interface PriceGeometry {
  readonly linePath: string
  readonly areaPath: string
}

const WIDTH = 920
const HEIGHT = 390
const LEFT = 76
const RIGHT = 28
const TOP = 38
const PRICE_BOTTOM = 248
const VOLUME_TOP = 286
const BOTTOM = 342

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
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}

function formatSilver(value: number): string {
  return `${new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(value)} plata`
}

function buildPriceGeometry(
  points: readonly MarketHistoryPoint[],
  xForIndex: (index: number) => number,
  yForPrice: (price: number) => number,
): readonly PriceGeometry[] {
  const groups: { readonly x: number; readonly y: number }[][] = []
  let current: { readonly x: number; readonly y: number }[] = []

  points.forEach((point, index) => {
    if (point.averagePrice === null) {
      if (current.length > 0) groups.push(current)
      current = []
      return
    }

    current.push({
      x: xForIndex(index),
      y: yForPrice(point.averagePrice),
    })
  })

  if (current.length > 0) groups.push(current)

  return groups.map((group) => {
    const linePath = group
      .map(
        ({ x, y }, index) =>
          `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`,
      )
      .join(' ')
    const first = group[0]
    const last = group.at(-1) ?? first
    const areaPath = `${linePath} L${last.x.toFixed(2)},${PRICE_BOTTOM} L${first.x.toFixed(2)},${PRICE_BOTTOM} Z`

    return { linePath, areaPath }
  })
}

function getLabelIndexes(length: number, maximumLabels = 5): readonly number[] {
  if (length <= 1) return [0]

  const count = Math.min(maximumLabels, length)
  return Array.from(
    new Set(
      Array.from({ length: count }, (_, index) =>
        Math.round((index / (count - 1)) * (length - 1)),
      ),
    ),
  )
}

export function MarketHistoryChart({ points }: MarketHistoryChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const rawId = useId()
  const gradientId = `market-price-area-${rawId.replaceAll(':', '')}`
  const volumeGradientId = `market-volume-${rawId.replaceAll(':', '')}`
  const priceValues = points
    .map((point) => point.averagePrice)
    .filter((price): price is number => price !== null && price > 0)
  const maximumVolume = Math.max(0, ...points.map((point) => point.itemCount))

  if (points.length === 0 || (priceValues.length === 0 && maximumVolume === 0)) {
    return (
      <div className="market-history-empty">
        <div className="market-history-empty__icon" aria-hidden="true">
          ↗
        </div>
        <div>
          <p className="market-history-empty__title">
            Aún no hay una serie para mostrar
          </p>
          <p className="market-history-empty__copy">
            El servicio local no tiene ventas capturadas para esta combinación
            exacta de objeto, ciudad y calidad. Abre ese objeto en el mercado de
            Albion o prueba otra calidad o ciudad.
          </p>
        </div>
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
    (maximumObservedPrice - minimumObservedPrice) * 0.14,
  )
  const minimumPrice = Math.max(0, minimumObservedPrice - pricePadding)
  const maximumPrice = maximumObservedPrice + pricePadding
  const priceRange = Math.max(1, maximumPrice - minimumPrice)

  const yForPrice = (price: number): number =>
    PRICE_BOTTOM -
    ((price - minimumPrice) / priceRange) * (PRICE_BOTTOM - TOP)

  const priceGeometry = buildPriceGeometry(points, xForIndex, yForPrice)
  const barSlotWidth = plotWidth / Math.max(1, points.length)
  const barWidth = Math.max(5, Math.min(22, barSlotWidth * 0.58))
  const gridPrices = Array.from({ length: 4 }, (_, index) =>
    maximumPrice - (index / 3) * priceRange,
  )
  const labelIndexes = getLabelIndexes(points.length)
  const weightedVolume = points.reduce(
    (total, point) =>
      point.averagePrice === null ? total : total + Math.max(0, point.itemCount),
    0,
  )
  const weightedAverage =
    priceValues.length === 0
      ? null
      : weightedVolume > 0
        ? points.reduce(
            (total, point) =>
              point.averagePrice === null
                ? total
                : total + point.averagePrice * Math.max(0, point.itemCount),
            0,
          ) / weightedVolume
        : priceValues.reduce((total, price) => total + price, 0) /
          priceValues.length
  const observedPriceDays = priceValues.length
  const activeVolumeDays = points.filter((point) => point.itemCount > 0).length
  const activePoint = activeIndex === null ? null : points[activeIndex] ?? null
  const maximumPointIndex = points.findIndex(
    (point) => point.averagePrice === maximumObservedPrice,
  )
  const minimumPointIndex = points.findIndex(
    (point) => point.averagePrice === minimumObservedPrice,
  )
  const peakVolume = Math.max(...points.map((point) => point.itemCount))

  const tooltip = (() => {
    if (activePoint === null || activeIndex === null) return null

    const anchorX = xForIndex(activeIndex)
    const anchorY =
      activePoint.averagePrice === null
        ? PRICE_BOTTOM
        : yForPrice(activePoint.averagePrice)
    const width = 190
    const height = 70
    const x = Math.min(
      WIDTH - RIGHT - width,
      Math.max(LEFT, anchorX - width / 2),
    )
    const y =
      anchorY < TOP + height + 18 ? anchorY + 18 : anchorY - height - 16

    return { x, y, width, height }
  })()

  return (
    <div className="market-history-chart" data-market-history-chart>
      <div className="market-history-chart__header">
        <div>
          <p className="market-history-chart__eyebrow">Lectura del mercado</p>
          <h4 className="market-history-chart__title">
            Evolución diaria de precio y volumen
          </h4>
          <p className="market-history-chart__subtitle">
            Pasa el cursor o navega con Tab para consultar cada día. Los espacios
            vacíos indican días sin precio registrado.
          </p>
        </div>

        <div
          className="market-history-chart__legend"
          aria-label="Leyenda del gráfico"
        >
          <span>
            <i className="market-history-chart__legend-line" aria-hidden="true" />
            Precio promedio
          </span>
          <span>
            <i className="market-history-chart__legend-bar" aria-hidden="true" />
            Unidades vendidas
          </span>
          <span>
            <i className="market-history-chart__legend-gap" aria-hidden="true" />
            Sin precio
          </span>
        </div>
      </div>

      <div className="market-history-chart__viewport">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Evolución interactiva del precio promedio diario y volumen histórico de ventas"
          className="market-history-chart__svg"
        >
          <title>Precio promedio diario y volumen histórico de ventas</title>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent)"
                stopOpacity="0.24"
              />
              <stop
                offset="72%"
                stopColor="var(--color-accent)"
                stopOpacity="0.05"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent)"
                stopOpacity="0"
              />
            </linearGradient>
            <linearGradient
              id={volumeGradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--color-accent)"
                stopOpacity="0.64"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent)"
                stopOpacity="0.18"
              />
            </linearGradient>
            <filter
              id={`${gradientId}-glow`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            x={LEFT}
            y={TOP}
            width={plotWidth}
            height={PRICE_BOTTOM - TOP}
            rx="14"
            className="market-history-chart__price-panel"
          />
          <rect
            x={LEFT}
            y={VOLUME_TOP}
            width={plotWidth}
            height={BOTTOM - VOLUME_TOP}
            rx="10"
            className="market-history-chart__volume-panel"
          />

          {points.map((point, index) =>
            point.averagePrice !== null ? null : (
              <rect
                key={`missing-${point.timestamp}`}
                x={xForIndex(index) - barSlotWidth / 2}
                y={TOP}
                width={barSlotWidth}
                height={PRICE_BOTTOM - TOP}
                className="market-history-chart__missing-band"
              />
            ),
          )}

          {gridPrices.map((price) => {
            const y = yForPrice(price)

            return (
              <g key={price}>
                <line
                  x1={LEFT}
                  x2={WIDTH - RIGHT}
                  y1={y}
                  y2={y}
                  className="market-history-chart__grid-line"
                />
                <text
                  x={LEFT - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="market-history-chart__axis-label"
                >
                  {formatCompact(price)}
                </text>
              </g>
            )
          })}

          {weightedAverage !== null && (
            <g>
              <line
                x1={LEFT}
                x2={WIDTH - RIGHT}
                y1={yForPrice(weightedAverage)}
                y2={yForPrice(weightedAverage)}
                className="market-history-chart__average-line"
              />
              <text
                x={WIDTH - RIGHT - 8}
                y={yForPrice(weightedAverage) - 7}
                textAnchor="end"
                className="market-history-chart__average-label"
              >
                Promedio {formatCompact(weightedAverage)}
              </text>
            </g>
          )}

          {priceGeometry.map((geometry, index) => (
            <path
              key={`price-area-${index}`}
              d={geometry.areaPath}
              fill={`url(#${gradientId})`}
            />
          ))}

          {points.map((point, index) => {
            const x = xForIndex(index)
            const barHeight =
              maximumVolume > 0
                ? Math.max(
                    0,
                    (point.itemCount / maximumVolume) *
                      (BOTTOM - VOLUME_TOP - 8),
                  )
                : 0

            return point.itemCount > 0 ? (
              <rect
                key={`volume-${point.timestamp}`}
                x={x - barWidth / 2}
                y={BOTTOM - barHeight}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={`url(#${volumeGradientId})`}
                className={
                  activeIndex === index
                    ? 'market-history-chart__volume-bar is-active'
                    : 'market-history-chart__volume-bar'
                }
              />
            ) : (
              <line
                key={`volume-zero-${point.timestamp}`}
                x1={x - barWidth / 3}
                x2={x + barWidth / 3}
                y1={BOTTOM - 1}
                y2={BOTTOM - 1}
                className="market-history-chart__zero-volume"
              />
            )
          })}

          {priceGeometry.map((geometry, index) => (
            <path
              key={`price-line-glow-${index}`}
              d={geometry.linePath}
              fill="none"
              className="market-history-chart__price-line-glow"
            />
          ))}
          {priceGeometry.map((geometry, index) => (
            <path
              key={`price-segment-${index}`}
              d={geometry.linePath}
              fill="none"
              className="market-history-chart__price-line"
              filter={`url(#${gradientId}-glow)`}
            />
          ))}

          {activePoint !== null && activeIndex !== null && (
            <line
              x1={xForIndex(activeIndex)}
              x2={xForIndex(activeIndex)}
              y1={TOP}
              y2={BOTTOM}
              className="market-history-chart__crosshair"
            />
          )}

          {points.map((point, index) =>
            point.averagePrice === null ? (
              <circle
                key={`gap-${point.timestamp}`}
                cx={xForIndex(index)}
                cy={PRICE_BOTTOM - 10}
                r="4"
                className="market-history-chart__gap-dot"
              />
            ) : (
              <circle
                key={`price-${point.timestamp}`}
                cx={xForIndex(index)}
                cy={yForPrice(point.averagePrice)}
                r={activeIndex === index ? 5.5 : 4}
                className={
                  activeIndex === index
                    ? 'market-history-chart__price-dot is-active'
                    : 'market-history-chart__price-dot'
                }
              />
            ),
          )}

          {maximumPointIndex >= 0 && maximumPointIndex !== minimumPointIndex && (
            <g className="market-history-chart__extreme-label">
              <text
                x={xForIndex(maximumPointIndex)}
                y={yForPrice(maximumObservedPrice) - 12}
                textAnchor="middle"
              >
                Máximo
              </text>
            </g>
          )}
          {minimumPointIndex >= 0 && maximumPointIndex !== minimumPointIndex && (
            <g className="market-history-chart__extreme-label">
              <text
                x={xForIndex(minimumPointIndex)}
                y={yForPrice(minimumObservedPrice) + 20}
                textAnchor="middle"
              >
                Mínimo
              </text>
            </g>
          )}

          {labelIndexes.map((index) => {
            const point = points[index]
            if (!point) return null

            return (
              <text
                key={`label-${point.timestamp}`}
                x={xForIndex(index)}
                y={HEIGHT - 12}
                textAnchor={
                  index === 0
                    ? 'start'
                    : index === points.length - 1
                      ? 'end'
                      : 'middle'
                }
                className="market-history-chart__date-label"
              >
                {formatDate(point.timestamp)}
              </text>
            )
          })}

          <text x={LEFT} y={22} className="market-history-chart__section-label">
            PRECIO PROMEDIO · PLATA
          </text>
          <text
            x={LEFT}
            y={VOLUME_TOP - 12}
            className="market-history-chart__section-label"
          >
            VOLUMEN DIARIO
          </text>
          <text
            x={WIDTH - RIGHT}
            y={VOLUME_TOP - 12}
            textAnchor="end"
            className="market-history-chart__volume-scale"
          >
            pico {formatCompact(maximumVolume)} unidades
          </text>

          {tooltip !== null && activePoint !== null && (
            <g className="market-history-chart__tooltip" pointerEvents="none">
              <rect
                x={tooltip.x}
                y={tooltip.y}
                width={tooltip.width}
                height={tooltip.height}
                rx="10"
              />
              <text
                x={tooltip.x + 14}
                y={tooltip.y + 20}
                className="market-history-chart__tooltip-date"
              >
                {formatExactDate(activePoint.timestamp)}
              </text>
              <text
                x={tooltip.x + 14}
                y={tooltip.y + 42}
                className="market-history-chart__tooltip-price"
              >
                {activePoint.averagePrice === null
                  ? 'Sin precio registrado'
                  : formatSilver(activePoint.averagePrice)}
              </text>
              <text
                x={tooltip.x + 14}
                y={tooltip.y + 59}
                className="market-history-chart__tooltip-volume"
              >
                {activePoint.itemCount.toLocaleString('es-CL')} unidades vendidas
              </text>
            </g>
          )}

          {points.map((point, index) => (
            <rect
              key={`hit-${point.timestamp}`}
              x={xForIndex(index) - barSlotWidth / 2}
              y={TOP}
              width={barSlotWidth}
              height={BOTTOM - TOP}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${formatExactDate(point.timestamp)}: ${
                point.averagePrice === null
                  ? 'sin precio registrado'
                  : formatSilver(point.averagePrice)
              }, ${point.itemCount.toLocaleString('es-CL')} unidades vendidas`}
              className="market-history-chart__hit-zone"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          ))}
        </svg>
      </div>

      <div
        className="market-history-chart__footer"
        aria-label="Resumen de cobertura del gráfico"
      >
        <span>
          <strong>{observedPriceDays}</strong> de {points.length} días con precio
        </span>
        <span>
          <strong>{activeVolumeDays}</strong> días con ventas registradas
        </span>
        <span>
          Pico diario: <strong>{peakVolume.toLocaleString('es-CL')} unidades</strong>
        </span>
      </div>
    </div>
  )
}
