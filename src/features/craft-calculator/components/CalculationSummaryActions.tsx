import { useEffect, useRef, useState } from 'react'
import { CITIES } from '@core/domain/entities/City'
import type {
  CraftCalculation,
  NodeReturnRateConfig,
} from '@core/domain/entities/CraftCostNode'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { Item } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { calculateReturnRate } from '@core/domain/entities/ReturnRate'
import { CRAFTING_STATION_LABELS } from '@core/domain/entities/ProductionEconomy'
import type {
  CraftingSpecializationConfig,
  StationFeeConfig,
} from '@core/domain/entities/ProductionEconomy'
import { InfoHint } from '@shared/components/InfoHint'
import {
  buildCalculationSummary,
  createCalculationSummaryFileName,
  createCalculationSummarySnapshot,
} from '../utils/calculationSummary'
import type { CalculationSummaryInput } from '../utils/calculationSummary'
import { saveCalculationPrintSummary } from '../utils/printSummaryStorage'

interface CalculationSummaryActionsProps {
  readonly item: Item
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
  readonly calculation: CraftCalculation
  readonly productionConfig: NodeReturnRateConfig
  readonly stationFeeConfig: StationFeeConfig
  readonly craftingSpecializationConfig: CraftingSpecializationConfig
  readonly isPremium: boolean
  readonly unitSellPrice: number | null
  readonly repository: ItemRepository
}

type FeedbackState = 'idle' | 'copied' | 'downloaded' | 'print-opened' | 'error'

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('No fue posible copiar el resumen')
  }
}

export function CalculationSummaryActions({
  item,
  enchantment,
  quantity,
  calculation,
  productionConfig,
  stationFeeConfig,
  craftingSpecializationConfig,
  isPremium,
  unitSellPrice,
  repository,
}: CalculationSummaryActionsProps) {
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const feedbackTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current)
      }
    }
  }, [])

  function showFeedback(next: FeedbackState) {
    setFeedback(next)

    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current)
    }

    feedbackTimer.current = window.setTimeout(() => {
      setFeedback('idle')
      feedbackTimer.current = null
    }, 2500)
  }

  function createSummaryInput(): CalculationSummaryInput {
    const city = CITIES.find(
      (candidate) => candidate.id === productionConfig.cityId,
    )

    return {
      generatedAt: new Date(),
      itemName: item.name,
      tier: item.tier,
      enchantment,
      quantity,
      cityName: city?.name ?? productionConfig.cityId,
      hasSpecialtyBonus: productionConfig.hasSpecialtyBonus,
      useFocus: productionConfig.useFocus,
      hasDailyBonus: productionConfig.hasDailyBonus,
      dailyBonusAmount: productionConfig.dailyBonusAmount,
      returnRate: calculateReturnRate(productionConfig),
      stationName:
        CRAFTING_STATION_LABELS[calculation.stationFeeBreakdown.station],
      stationAccessLabel:
        stationFeeConfig.accessType === 'free'
          ? 'Sin tarifa / isla'
          : stationFeeConfig.accessType === 'associate'
            ? 'Asociado'
            : 'Usuario',
      itemValue: calculation.stationFeeBreakdown.itemValue,
      nutritionPerCraft: calculation.stationFeeBreakdown.nutritionPerCraft,
      nutritionTotal: calculation.stationFeeBreakdown.nutritionTotal,
      appliedFeePer100Nutrition:
        calculation.stationFeeBreakdown.feePer100Nutrition,
      stationFeeSource: calculation.stationFeeBreakdown.source,
      estimatedStationUsageFee:
        calculation.stationFeeBreakdown.estimatedTotalFee,
      stationUsageFee: calculation.stationUsageFee,
      focusCostEfficiency: craftingSpecializationConfig.focusCostEfficiency,
      availableFocus: craftingSpecializationConfig.availableFocus,
      qualityIncrease: craftingSpecializationConfig.qualityIncrease,
      baseFocusPerCraft: calculation.focusCostBreakdown.baseFocusPerCraft,
      effectiveFocusPerCraft:
        calculation.focusCostBreakdown.effectiveFocusPerCraft,
      totalFocusRequired: calculation.focusCostBreakdown.totalFocusRequired,
      maxItemsWithAvailableFocus:
        calculation.focusCostBreakdown.maxItemsWithAvailableFocus,
      totalCost: calculation.grandTotal,
      silverSaved: calculation.totalSilverSavedByReturnRate,
      stationFees: calculation.totalStationFees,
      isComplete: calculation.isComplete,
      missingPrices: calculation.missingPriceItems.map((missing) => ({
        name:
          repository.getById(missing.itemId)?.name ?? String(missing.itemId),
        enchantment: missing.enchantment,
      })),
      returnedMaterials: calculation.returnedMaterials.map((material) => ({
        name:
          repository.getById(material.itemId)?.name ?? String(material.itemId),
        enchantment: material.enchantment,
        grossQuantity: material.grossQuantity,
        returnedQuantity: material.returnedQuantity,
        netQuantity: material.netQuantity,
        silverValue: material.silverValue,
      })),
      isPremium,
      unitSellPrice,
    }
  }

  function createSummary(): string {
    return buildCalculationSummary(createSummaryInput())
  }

  async function handleCopy() {
    try {
      await copyText(createSummary())
      showFeedback('copied')
    } catch {
      showFeedback('error')
    }
  }

  function handleDownload() {
    try {
      const content = createSummary()
      const blob = new Blob([content], {
        type: 'text/plain;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = url
      anchor.download = createCalculationSummaryFileName(
        item.name,
        item.tier,
        enchantment,
      )

      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 0)

      showFeedback('downloaded')
    } catch {
      showFeedback('error')
    }
  }

  function handlePrint() {
    try {
      const snapshot = createCalculationSummarySnapshot(createSummaryInput())
      const token = saveCalculationPrintSummary(snapshot)
      const printUrl = new URL(window.location.href)

      printUrl.hash = ''
      printUrl.search = ''
      printUrl.searchParams.set('printSummary', token)

      const printWindow = window.open(printUrl.toString(), '_blank')

      if (!printWindow) {
        throw new Error('El navegador bloqueó la vista de impresión')
      }

      printWindow.opener = null
      showFeedback('print-opened')
    } catch {
      showFeedback('error')
    }
  }

  const feedbackText =
    feedback === 'copied'
      ? 'Resumen copiado.'
      : feedback === 'downloaded'
        ? 'Archivo descargado.'
        : feedback === 'print-opened'
          ? 'Vista para PDF abierta.'
          : feedback === 'error'
            ? 'No se pudo completar la acción.'
            : calculation.isComplete
              ? 'Listo para compartir.'
              : 'Se exportará marcado como cálculo incompleto.'

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-text">
              Compartir resumen
            </h3>

            <InfoHint
              label="Compartir resumen"
              text="Copia, descarga o imprime un resumen con el objeto, la configuración de producción, los costos, los materiales recuperados, las comisiones y el resultado económico."
              align="left"
            />
          </div>

          <p className="mt-1 text-xs leading-relaxed text-text-faint">
            Para crear un PDF, elige “Guardar como PDF” en el diálogo de
            impresión.
          </p>

          <p
            aria-live="polite"
            className={`mt-1 text-xs ${
              feedback === 'error'
                ? 'text-negative'
                : feedback !== 'idle'
                  ? 'text-positive'
                  : 'text-text-muted'
            }`}
          >
            {feedbackText}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {feedback === 'copied' ? 'Copiado' : 'Copiar resumen'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            Descargar .txt
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-accent-border bg-accent-muted px-3.5 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            Exportar PDF
          </button>
        </div>
      </div>
    </section>
  )
}
