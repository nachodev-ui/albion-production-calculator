import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import type { AppRoute } from '../../../app/types'
import { BlackMarketOpportunityScannerPage } from './BlackMarketOpportunityScannerPage'

interface BlackMarketPageProps {
  readonly repository: ItemRepository
  readonly onNavigate: (route: AppRoute) => void
}

export function BlackMarketPage({
  repository,
  onNavigate,
}: BlackMarketPageProps) {
  return (
    <BlackMarketOpportunityScannerPage
      repository={repository}
      onNavigate={onNavigate}
      onOpenCrafting={() => onNavigate('crafting')}
    />
  )
}
