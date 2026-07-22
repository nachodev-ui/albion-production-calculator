import { JsonItemRepository } from '@data/repositories/JsonItemRepository'
import { RefiningCalculatorPage } from './RefiningCalculatorPage'

interface RefiningComingSoonPageProps {
  readonly onOpenCrafting: () => void
}

/**
 * Conserva temporalmente el nombre del punto de carga para no modificar el shell
 * en el mismo cambio. El contenido ya no es un placeholder: monta el MVP real.
 */
const repository = new JsonItemRepository()

export function RefiningComingSoonPage({
  onOpenCrafting: _onOpenCrafting,
}: RefiningComingSoonPageProps) {
  void onOpenCrafting
  return <RefiningCalculatorPage repository={repository} />
}
