import { useState } from 'react'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { RefiningCalculatorPage as RefiningSingleTierCalculatorPage } from './RefiningSingleTierCalculatorPage'
import { RefiningMultilevelPlanner } from './RefiningMultilevelPlanner'

interface RefiningCalculatorPageProps {
  readonly repository: ItemRepository
}

type RefiningWorkspaceView = 'multilevel' | 'single'

export function RefiningCalculatorPage({
  repository,
}: RefiningCalculatorPageProps) {
  const [view, setView] = useState<RefiningWorkspaceView>('multilevel')

  return (
    <>
      <div className="mx-auto w-full max-w-[92rem] px-5 pb-3 sm:px-6">
        <div className="flex flex-wrap rounded-xl border border-border bg-surface-raised p-1">
          <button
            type="button"
            onClick={() => setView('multilevel')}
            className={`rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
              view === 'multilevel'
                ? 'bg-accent text-bg'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Planificación multinivel
          </button>
          <button
            type="button"
            onClick={() => setView('single')}
            className={`rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
              view === 'single'
                ? 'bg-accent text-bg'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Cálculo de un tier
          </button>
        </div>
      </div>

      {view === 'multilevel' ? (
        <RefiningMultilevelPlanner repository={repository} />
      ) : (
        <RefiningSingleTierCalculatorPage repository={repository} />
      )}
    </>
  )
}
