import { useEffect, useState } from 'react'
import type { Item } from '@core/domain/entities/Item'
import type { CraftingBranchCatalog, CraftingBranchId } from '../data/craftingBranches'
import { CraftingBranchSection } from './CraftingBranchSection'

interface CraftingBranchBrowserProps {
  readonly catalog: CraftingBranchCatalog
  readonly selectedId: string | null
  readonly onSelect: (item: Item) => void
}

export function CraftingBranchBrowser({
  catalog,
  selectedId,
  onSelect,
}: CraftingBranchBrowserProps) {
  const [openBranchId, setOpenBranchId] = useState<CraftingBranchId | null>(
    catalog.branches[0]?.id ?? null,
  )


  useEffect(() => {
    if (!selectedId) return

    const selectedBranch = catalog.branches.find((branch) =>
      branch.families.some((family) => family.items.some((item) => item.id === selectedId)),
    )

    if (!selectedBranch) return

    /*
     * Solo sincroniza la rama cuando cambia el ítem seleccionado.
     * No depende de `openBranchId`, para que el usuario pueda cerrar la
     * rama seleccionada o abrir otra sin que el efecto revierta su acción.
     */
    const frame = window.requestAnimationFrame(() => {
      setOpenBranchId(selectedBranch.id)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [catalog.branches, selectedId])

  function toggleBranch(branchId: CraftingBranchId) {
    setOpenBranchId((current) => (current === branchId ? null : branchId))
  }

  if (catalog.branches.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-text-muted">{catalog.emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-3">
      <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
        <p className="text-xs leading-relaxed text-text-muted">{catalog.introText}</p>
      </div>

      {catalog.sections.map((section) => (
        <div key={section.id}>
          <div className="mb-2 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-faint">
              {section.label}
            </p>
            <p className="mt-0.5 text-[11px] text-text-faint">{section.description}</p>
          </div>

          <div className="space-y-2">
            {section.branches.map((branch) => (
              <CraftingBranchSection
                key={branch.id}
                branch={branch}
                isOpen={openBranchId === branch.id}
                selectedId={selectedId}
                onToggle={() => toggleBranch(branch.id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
