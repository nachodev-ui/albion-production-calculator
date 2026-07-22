import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppRoute } from '@app/types'
import { fetchSavedCalculations } from '@features/account/api/savedDataApi'
import type { SavedCalculation } from '@features/account/api/savedDataApi'
import { accountAuthConfig } from '@features/account/config/accountAuthConfig'
import {
  deleteEconomicProfile,
  fetchEconomicProfile,
  saveEconomicProfile,
} from '../api/economicProfileApi'
import {
  DEFAULT_ECONOMIC_PROFILE,
  ECONOMIC_CITY_LABELS,
  ECONOMIC_SERVER_LABELS,
  SPECIALIZATION_BRANCHES,
  buildFocusRecommendations,
} from '../economicProfile'
import type {
  EconomicCity,
  EconomicProfile,
  EconomicProfileInput,
  EconomicServer,
  EconomicSpecialization,
} from '../economicProfile'

interface Props {
  readonly onNavigate: (route: AppRoute) => void
}

type LoadState = 'loading' | 'ready' | 'error'
type SaveState = 'idle' | 'saving' | 'saved' | 'deleting' | 'error'

const silverFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 1,
})

function formatSilver(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${silverFormatter.format(Math.abs(value))} plata`
}

function sanitizeInteger(value: string, maximum: number): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(maximum, Math.max(0, parsed))
}

function sanitizeDecimal(value: string, maximum: number): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  if (!Number.isFinite(parsed)) return 0
  return Math.min(maximum, Math.max(0, parsed))
}

function normalizeProfile(profile: EconomicProfile | null): EconomicProfileInput {
  if (!profile) return DEFAULT_ECONOMIC_PROFILE
  return {
    server: profile.server,
    premiumActive: profile.premiumActive,
    dailyFocusBalance: profile.dailyFocusBalance,
    homeCity: profile.homeCity,
    guildHasIsland: profile.guildHasIsland,
    salesTaxRate: profile.salesTaxRate,
    transportCost: profile.transportCost,
    specializations: profile.specializations,
  }
}

export function EconomicProfilePanel({ onNavigate }: Props) {
  const { getAccessTokenSilently } = useAuth0()
  const [form, setForm] = useState<EconomicProfileInput>(
    DEFAULT_ECONOMIC_PROFILE,
  )
  const [calculations, setCalculations] = useState<
    readonly SavedCalculation[]
  >([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [hasSavedProfile, setHasSavedProfile] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)
  const [draftBranchKey, setDraftBranchKey] = useState(
    SPECIALIZATION_BRANCHES[0]?.key ?? '',
  )

  const token = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: accountAuthConfig.audience,
          scope: accountAuthConfig.scope,
        },
      }),
    [getAccessTokenSilently],
  )

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState('loading')
      setError(null)
      try {
        const accessToken = await token()
        const [profile, savedCalculations] = await Promise.all([
          fetchEconomicProfile(accessToken, signal),
          fetchSavedCalculations(accessToken, 100, signal),
        ])
        if (signal?.aborted) return
        setForm(normalizeProfile(profile))
        setHasSavedProfile(profile !== null)
        setCalculations(savedCalculations)
        setLoadState('ready')
      } catch (caught: unknown) {
        if (signal?.aborted) return
        setError(
          caught instanceof Error
            ? caught.message
            : 'No fue posible cargar el perfil económico.',
        )
        setLoadState('error')
      }
    },
    [token],
  )

  useEffect(() => {
    const controller = new AbortController()
    // La carga depende de Auth0 y de la API remota.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const recommendations = useMemo(
    () => buildFocusRecommendations(calculations, form),
    [calculations, form],
  )

  const unusedBranches = useMemo(() => {
    const selected = new Set(
      form.specializations.map((specialization) => specialization.branchKey),
    )
    return SPECIALIZATION_BRANCHES.filter((branch) => !selected.has(branch.key))
  }, [form.specializations])

  useEffect(() => {
    if (
      unusedBranches.length > 0 &&
      !unusedBranches.some((branch) => branch.key === draftBranchKey)
    ) {
      // Mantiene el selector apuntando a una rama disponible.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftBranchKey(unusedBranches[0]?.key ?? '')
    }
  }, [draftBranchKey, unusedBranches])

  function updateSpecialization(
    branchKey: string,
    patch: Partial<EconomicSpecialization>,
  ) {
    setForm((current) => ({
      ...current,
      specializations: current.specializations.map((specialization) =>
        specialization.branchKey === branchKey
          ? { ...specialization, ...patch }
          : specialization,
      ),
    }))
  }

  function addSpecialization() {
    const branch = SPECIALIZATION_BRANCHES.find(
      (candidate) => candidate.key === draftBranchKey,
    )
    if (!branch) return
    setForm((current) => ({
      ...current,
      specializations: [
        ...current.specializations,
        {
          branchKey: branch.key,
          branchName: branch.label,
          level: 0,
          focusCostEfficiency: 0,
        },
      ],
    }))
  }

  function removeSpecialization(branchKey: string) {
    setForm((current) => ({
      ...current,
      specializations: current.specializations.filter(
        (specialization) => specialization.branchKey !== branchKey,
      ),
    }))
  }

  async function save() {
    setSaveState('saving')
    setError(null)
    try {
      const accessToken = await token()
      const saved = await saveEconomicProfile(accessToken, form)
      setForm(normalizeProfile(saved))
      setHasSavedProfile(true)
      setDeleteConfirmation(false)
      setSaveState('saved')
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible guardar el perfil económico.',
      )
      setSaveState('error')
    }
  }

  async function remove() {
    if (!deleteConfirmation) {
      setDeleteConfirmation(true)
      return
    }
    setSaveState('deleting')
    setError(null)
    try {
      const accessToken = await token()
      await deleteEconomicProfile(accessToken)
      setForm(DEFAULT_ECONOMIC_PROFILE)
      setHasSavedProfile(false)
      setDeleteConfirmation(false)
      setSaveState('idle')
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible eliminar el perfil económico.',
      )
      setSaveState('error')
    }
  }

  if (loadState === 'loading') {
    return (
      <section className="mx-auto w-full max-w-[1500px] px-5 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-text-faint">
          Cargando perfil económico…
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] px-5 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-accent-border/70 bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.16)]">
        <div className="border-b border-border bg-[radial-gradient(circle_at_0%_0%,rgba(214,170,42,0.12),transparent_48%)] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                Perfil privado de tu cuenta
              </p>
              <h2 className="mt-2 font-display text-3xl text-text">
                Perfil económico
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
                Datos manuales y privados, independientes del personaje público.
              </p>
              <p className="mt-2 text-xs text-text-faint">
                {hasSavedProfile
                  ? 'Configuración sincronizada en tu cuenta.'
                  : 'Aún no has guardado una configuración económica.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saveState === 'saving' || saveState === 'deleting'}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg disabled:opacity-50"
              >
                {saveState === 'saving'
                  ? 'Guardando…'
                  : saveState === 'saved'
                    ? 'Guardado'
                    : 'Guardar perfil'}
              </button>
              {hasSavedProfile && (
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={saveState === 'saving' || saveState === 'deleting'}
                  className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-2.5 text-sm font-semibold text-negative disabled:opacity-50"
                >
                  {saveState === 'deleting'
                    ? 'Eliminando…'
                    : deleteConfirmation
                      ? 'Confirmar eliminación'
                      : 'Eliminar'}
                </button>
              )}
            </div>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
              {error}
            </p>
          )}
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1.5 text-xs font-medium text-text-muted">
                Servidor principal
                <select
                  value={form.server}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      server: event.target.value as EconomicServer,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                >
                  {Object.entries(ECONOMIC_SERVER_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="space-y-1.5 text-xs font-medium text-text-muted">
                Ciudad habitual
                <select
                  value={form.homeCity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      homeCity: event.target.value as EconomicCity,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                >
                  {Object.entries(ECONOMIC_CITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs font-medium text-text-muted">
                Saldo de foco diario
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={form.dailyFocusBalance}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dailyFocusBalance: sanitizeInteger(
                        event.target.value,
                        100000,
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                />
              </label>

              <label className="space-y-1.5 text-xs font-medium text-text-muted">
                Impuesto de venta habitual (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.salesTaxRate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      salesTaxRate: sanitizeDecimal(event.target.value, 100),
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                />
              </label>

              <label className="space-y-1.5 text-xs font-medium text-text-muted">
                Transporte estimado por lote
                <input
                  type="number"
                  min={0}
                  max={1000000000000}
                  value={form.transportCost}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      transportCost: sanitizeInteger(
                        event.target.value,
                        1_000_000_000_000,
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                />
              </label>

              <div className="grid gap-2 rounded-xl border border-border bg-surface-raised p-3 text-sm text-text">
                <label className="flex items-center justify-between gap-3">
                  <span>Premium activo</span>
                  <input
                    type="checkbox"
                    checked={form.premiumActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        premiumActive: event.target.checked,
                        salesTaxRate:
                          current.salesTaxRate === 8 ||
                          current.salesTaxRate === 4
                            ? event.target.checked
                              ? 4
                              : 8
                            : current.salesTaxRate,
                      }))
                    }
                    className="h-4 w-4 accent-accent"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Gremio con isla</span>
                  <input
                    type="checkbox"
                    checked={form.guildHasIsland}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        guildHasIsland: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-accent"
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-semibold text-text">
                    Especializaciones de fabricación
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-faint">
                    Añade el nivel y la eficiencia de foco visibles para cada rama.
                  </p>
                </div>
                {unusedBranches.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={draftBranchKey}
                      onChange={(event) =>
                        setDraftBranchKey(event.target.value)
                      }
                      className="min-w-0 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-text"
                    >
                      {unusedBranches.map((branch) => (
                        <option key={branch.key} value={branch.key}>
                          {branch.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addSpecialization}
                      className="shrink-0 rounded-xl border border-accent-border bg-accent-muted px-3 py-2 text-xs font-semibold text-accent"
                    >
                      Añadir rama
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {form.specializations.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-text-faint">
                    Añade al menos una rama para obtener recomendaciones por foco.
                  </p>
                ) : (
                  form.specializations.map((specialization) => (
                    <article
                      key={specialization.branchKey}
                      className="grid gap-3 rounded-2xl border border-border bg-surface-raised p-4 sm:grid-cols-[minmax(180px,1fr)_130px_180px_auto] sm:items-end"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {specialization.branchName}
                        </p>
                        <p className="mt-1 text-[11px] text-text-faint">
                          Datos declarados por ti; no verificados por el personaje público.
                        </p>
                      </div>
                      <label className="space-y-1 text-[11px] font-medium text-text-muted">
                        Nivel
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={specialization.level}
                          onChange={(event) =>
                            updateSpecialization(specialization.branchKey, {
                              level: sanitizeInteger(event.target.value, 100),
                            })
                          }
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                        />
                      </label>
                      <label className="space-y-1 text-[11px] font-medium text-text-muted">
                        Eficiencia de foco
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          value={specialization.focusCostEfficiency}
                          onChange={(event) =>
                            updateSpecialization(specialization.branchKey, {
                              focusCostEfficiency: sanitizeInteger(
                                event.target.value,
                                100000,
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          removeSpecialization(specialization.branchKey)
                        }
                        className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-negative/50 hover:text-negative"
                      >
                        Quitar
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-surface-raised p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Con tus especializaciones actuales
            </p>
            <h3 className="mt-2 font-display text-2xl text-text">
              Beneficio por 10.000 de foco
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-text-faint">
              Se recalcula desde tus capturas guardadas, usando el precio de venta,
              el costo neto, tu eficiencia actual, {numberFormatter.format(form.salesTaxRate)}%
              de impuesto y {silverFormatter.format(form.transportCost)} de transporte por lote.
            </p>

            {recommendations.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
                <p>
                  No hay cálculos compatibles todavía. Guarda cálculos completos con
                  foco y precio de venta para las ramas configuradas.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('crafting')}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg"
                  >
                    Abrir calculadora
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('presets')}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text"
                  >
                    Ver cálculos guardados
                  </button>
                </div>
              </div>
            ) : (
              <ol className="mt-5 space-y-3">
                {recommendations.slice(0, 5).map((recommendation, index) => (
                  <li
                    key={recommendation.calculationId}
                    className="rounded-xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-accent">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold text-text">
                            {recommendation.itemName} {recommendation.tierLabel}
                          </p>
                          <p
                            className={`text-sm font-bold ${
                              recommendation.profitPer10kFocus >= 0
                                ? 'text-positive'
                                : 'text-negative'
                            }`}
                          >
                            {formatSilver(recommendation.profitPer10kFocus)}
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-text-faint">
                          {recommendation.branchName} · nivel{' '}
                          {recommendation.specializationLevel} · eficiencia{' '}
                          {silverFormatter.format(
                            recommendation.focusCostEfficiency,
                          )}
                        </p>
                        <p className="mt-2 text-xs text-text-muted">
                          Lote: {formatSilver(recommendation.estimatedProfit)} con{' '}
                          {silverFormatter.format(
                            recommendation.totalFocusRequired,
                          )}{' '}
                          de foco recalculado.
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-text-faint">
              Compara tus cálculos guardados y revisa los precios antes de fabricar.
            </p>
          </aside>
        </div>
      </div>
    </section>
  )
}
