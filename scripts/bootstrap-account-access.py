from pathlib import Path

for relative_path in (
    'src/features/account/components/AccountMenu.tsx',
    'src/features/account/components/AccountPage.tsx',
    'src/features/account/components/PlansPage.tsx',
):
    component_path = Path(relative_path)
    component_text = component_path.read_text(encoding='utf-8')
    component_text = component_text.replace(
        '../context/AccountSessionContext',
        '../hooks/useAccountSession',
    )
    component_path.write_text(component_text, encoding='utf-8')

path = Path('src/features/craft-calculator/components/recipe/ItemRecipeCard.tsx')
text = path.read_text(encoding='utf-8')

import_anchor = "import { useEffect, useMemo, useState } from 'react'\n"
imports = """import { useEffect, useMemo, useState } from 'react'
import { FeatureGate } from '@features/account/components/FeatureGate'
import { useBooleanEntitlement } from '@features/account/hooks/useAccountEntitlement'
import { ENTITLEMENT_KEYS } from '@features/account/types'
import { navigateToRoute } from '../../../../app/routing'
"""
if '@features/account/components/FeatureGate' not in text:
    if import_anchor not in text:
        raise SystemExit('Could not locate ItemRecipeCard import anchor')
    text = text.replace(import_anchor, imports, 1)

state_anchor = """  const [historyComparison, setHistoryComparison] = useState<Pick<
    MarketConfig,
    'saleCity' | 'quality'
  > | null>(null)

  const isVanity = isVanityPlaceholder(item)
"""
state_replacement = """  const [historyComparison, setHistoryComparison] = useState<Pick<
    MarketConfig,
    'saleCity' | 'quality'
  > | null>(null)
  const optimizerLiquidityEnabled = useBooleanEntitlement(
    ENTITLEMENT_KEYS.optimizerLiquidity,
  )

  const isVanity = isVanityPlaceholder(item)
"""
if 'const optimizerLiquidityEnabled' not in text:
    if state_anchor not in text:
        raise SystemExit('Could not locate ItemRecipeCard state anchor')
    text = text.replace(state_anchor, state_replacement, 1)

config_anchor = """    markets: market.markets,
    config: market.config,
  })
"""
config_replacement = """    markets: market.markets,
    config: market.config,
    enabled: optimizerLiquidityEnabled,
  })
"""
if 'enabled: optimizerLiquidityEnabled' not in text:
    if config_anchor not in text:
        raise SystemExit('Could not locate liquidity hook anchor')
    text = text.replace(config_anchor, config_replacement, 1)

card_anchor = """          <ProfitabilityOptimizerCard
            recommendation={profitabilityRecommendation}
            markets={market.markets}
            marketStatus={market.status}
            liquidityStatus={profitabilityLiquidityHistory.status}
            liquidityError={profitabilityLiquidityHistory.error}
            liquidityWarnings={profitabilityLiquidityHistory.warnings}
            liquidityProgress={profitabilityLiquidityHistory.progress}
            onRefreshLiquidity={profitabilityLiquidityHistory.refresh}
            currentTotalCost={calculation.grandTotal}
            optimizedTotalCost={optimizedCalculation.grandTotal}
            purchaseSavings={optimizerPurchaseSavings}
            currentEconomicResult={
              currentAutomaticEconomicSummary?.economicResult ?? null
            }
            optimizedEconomicResult={
              optimizedEconomicSummary?.economicResult ?? null
            }
            resultImprovement={optimizerResultImprovement}
            isManualSellPrice={hasManualSellPrice}
            manualMaterialPriceCount={manualMaterialPriceCount}
            onApply={() =>
              market.applyMarketRecommendation(
                profitabilityRecommendation.materialCities,
                profitabilityRecommendation.saleCity,
              )
            }
          />
"""
card_replacement = """          <FeatureGate
            entitlementKey={ENTITLEMENT_KEYS.optimizerLiquidity}
            title="Optimizador con liquidez"
            description="El plan Pro analiza el historial de cada mercado candidato para descartar opciones sin profundidad suficiente antes de recomendar una compra o venta."
            onViewPlans={() => navigateToRoute('plans')}
          >
            <ProfitabilityOptimizerCard
              recommendation={profitabilityRecommendation}
              markets={market.markets}
              marketStatus={market.status}
              liquidityStatus={profitabilityLiquidityHistory.status}
              liquidityError={profitabilityLiquidityHistory.error}
              liquidityWarnings={profitabilityLiquidityHistory.warnings}
              liquidityProgress={profitabilityLiquidityHistory.progress}
              onRefreshLiquidity={profitabilityLiquidityHistory.refresh}
              currentTotalCost={calculation.grandTotal}
              optimizedTotalCost={optimizedCalculation.grandTotal}
              purchaseSavings={optimizerPurchaseSavings}
              currentEconomicResult={
                currentAutomaticEconomicSummary?.economicResult ?? null
              }
              optimizedEconomicResult={
                optimizedEconomicSummary?.economicResult ?? null
              }
              resultImprovement={optimizerResultImprovement}
              isManualSellPrice={hasManualSellPrice}
              manualMaterialPriceCount={manualMaterialPriceCount}
              onApply={() =>
                market.applyMarketRecommendation(
                  profitabilityRecommendation.materialCities,
                  profitabilityRecommendation.saleCity,
                )
              }
            />
          </FeatureGate>
"""
if 'title="Optimizador con liquidez"' not in text:
    if card_anchor not in text:
        raise SystemExit('Could not locate optimizer card anchor')
    text = text.replace(card_anchor, card_replacement, 1)

path.write_text(text, encoding='utf-8')
