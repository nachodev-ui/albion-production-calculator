import { useRef } from 'react'
import {
  asBaseItemId,
  buildItemIconUrl,
} from '@core/domain/entities/Item'
import type { CraftingJournalProfile } from '@core/usecases/calculateCraftingProgress'

interface CraftingJournalSelectorProps {
  readonly profiles: readonly CraftingJournalProfile[]
  readonly selectedProfile: CraftingJournalProfile
  readonly automaticProfile: CraftingJournalProfile
  readonly isAutomatic: boolean
  readonly onSelect: (profile: CraftingJournalProfile) => void
  readonly onResetAutomatic: () => void
}

function getJournalIconUrl(profile: CraftingJournalProfile): string {
  return buildItemIconUrl(asBaseItemId(profile.emptyItemId), 0, 96)
}

export function CraftingJournalSelector({
  profiles,
  selectedProfile,
  automaticProfile,
  isAutomatic,
  onSelect,
  onResetAutomatic,
}: CraftingJournalSelectorProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  const selectProfile = (profile: CraftingJournalProfile) => {
    onSelect(profile)
    detailsRef.current?.removeAttribute('open')
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-text-faint">Diario vacío compatible</span>

        {!isAutomatic && (
          <button
            type="button"
            onClick={onResetAutomatic}
            className="text-[10px] font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            Usar recomendado
          </button>
        )}
      </div>

      <details ref={detailsRef} className="group relative mt-1">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2.5 outline-none transition-colors hover:border-border-strong hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent-border [&::-webkit-details-marker]:hidden">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
            <img
              src={getJournalIconUrl(selectedProfile)}
              alt={`${selectedProfile.name} T${selectedProfile.tier} vacío`}
              className="size-11 object-contain"
              loading="lazy"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xs font-medium text-text">
                {selectedProfile.name}
              </p>
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[9px] font-semibold text-text-muted">
                T{selectedProfile.tier}
              </span>
              <span className="rounded border border-positive/25 bg-positive-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-positive">
                Vacío
              </span>
            </div>

            <p className="mt-1 text-[10px] text-text-faint">
              Capacidad:{' '}
              {selectedProfile.capacity.toLocaleString('es-CL')} de fama
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${
              isAutomatic
                ? 'border border-accent-border bg-accent-muted text-accent'
                : 'border border-border bg-surface text-text-muted'
            }`}
          >
            {isAutomatic ? 'Automático' : 'Manual'}
          </span>

          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4 shrink-0 text-text-faint transition-transform group-open:rotate-180"
          >
            <path
              d="m5 7.5 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </summary>

        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl shadow-black/35">
          <div className="border-b border-border bg-surface px-3 py-2.5">
            <p className="text-[11px] font-medium text-text">
              Diarios de fabricación T{selectedProfile.tier}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-text-faint">
              Solo se muestran variantes vacías. El tier coincide con el objeto
              seleccionado; puedes corregir manualmente la profesión.
            </p>
          </div>

          <div className="grid gap-1 p-2 sm:grid-cols-2">
            {profiles.map((profile) => {
              const isSelected = profile.kind === selectedProfile.kind
              const isRecommended = profile.kind === automaticProfile.kind

              return (
                <button
                  key={profile.emptyItemId}
                  type="button"
                  onClick={() => selectProfile(profile)}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-border ${
                    isSelected
                      ? 'border-accent-border bg-accent-muted'
                      : 'border-transparent hover:border-border hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                    <img
                      src={getJournalIconUrl(profile)}
                      alt=""
                      className="size-9 object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[11px] font-medium text-text">
                        {profile.name}
                      </p>
                      <span className="font-mono text-[9px] font-semibold text-text-muted">
                        T{profile.tier}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[9px] text-text-faint">
                      {isRecommended ? 'Recomendado para este objeto' : 'Vacío'}
                    </p>
                  </div>

                  {isSelected && (
                    <span className="font-mono text-xs font-bold text-accent">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </details>
    </div>
  )
}
