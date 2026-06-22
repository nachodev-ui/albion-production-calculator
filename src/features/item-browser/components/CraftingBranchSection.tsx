import type { Item } from '@core/domain/entities/Item'
import type { CraftingBranch } from '../data/craftingBranches'
import { ItemFamilyRow } from './ItemFamilyRow'

interface CraftingBranchSectionProps {
  readonly branch: CraftingBranch
  readonly isOpen: boolean
  readonly selectedId: string | null
  readonly onToggle: () => void
  readonly onSelect: (item: Item) => void
}

export function CraftingBranchSection({
  branch,
  isOpen,
  selectedId,
  onToggle,
  onSelect,
}: CraftingBranchSectionProps) {
  const panelId = `crafting-branch-${branch.id}`
  const familyLabel = branch.families.length === 1 ? 'familia' : 'familias'

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface"
      >
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-faint transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text">{branch.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-text-faint">
            {branch.description}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block rounded-md bg-accent-muted px-2 py-0.5 font-mono text-[10px] font-medium text-accent">
            {branch.tierLabel}
          </span>
          <span className="mt-1 block text-[10px] tabular text-text-faint">
            {branch.families.length} {familyLabel}
          </span>
        </span>
      </button>

      {isOpen && (
        <div id={panelId} className="space-y-2 border-t border-border p-2.5">
          {branch.families.map((family) => (
            <ItemFamilyRow
              key={family.id}
              family={family}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  )
}
