import type { AppRoute } from '../../../app/types'
import { useAccountSession } from '../context/AccountSessionContext'
import {
  currentPlan,
  getEffectiveEntitlements,
  useAccountAccessStore,
} from '../store/accountAccessStore'
import { ENTITLEMENT_KEYS } from '../types'
import { CheckIcon, RefreshIcon, SparklesIcon, UserIcon } from './AccountIcons'

interface AccountPageProps {
  readonly onNavigate: (route: AppRoute) => void
}

const ENTITLEMENT_LABELS: Readonly<Record<string, string>> = {
  [ENTITLEMENT_KEYS.historyMaxDays]: 'Días máximos de historial',
  [ENTITLEMENT_KEYS.optimizerLiquidity]: 'Optimizador con liquidez',
  [ENTITLEMENT_KEYS.optimizerBatchLimit]: 'Límite del optimizador',
  [ENTITLEMENT_KEYS.savedConfigurationsMax]: 'Presets guardados',
  [ENTITLEMENT_KEYS.exportsCsv]: 'Exportación CSV',
  [ENTITLEMENT_KEYS.marketAlertsMax]: 'Alertas de mercado',
}

function formatValue(value: boolean | number | string | null): string {
  if (typeof value === 'boolean') return value ? 'Incluido' : 'No incluido'
  if (typeof value === 'number') return new Intl.NumberFormat('es-CL').format(value)
  return value ?? 'Sin valor'
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha definida'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

export function AccountPage({ onNavigate }: AccountPageProps) {
  const session = useAccountSession()
  const access = useAccountAccessStore((state) => state.access)
  const status = useAccountAccessStore((state) => state.status)
  const accessError = useAccountAccessStore((state) => state.error)
  const lastSyncedAt = useAccountAccessStore((state) => state.lastSyncedAt)

  if (!session.authEnabled || !session.authConfigured) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 pb-14 pt-2 sm:px-6">
        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-raised text-text-muted">
            <UserIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-5 font-display text-2xl text-text">
            Acceso de cuenta en preparación
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            La interfaz de cuenta ya está integrada, pero el login real permanece deshabilitado hasta configurar el tenant de Auth0 y habilitar la validación JWT de la API.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-surface-raised p-4 text-xs leading-relaxed text-text-faint">
            Mientras tanto, la aplicación conserva el acceso Free y no envía credenciales ni datos de sesión.
          </div>
          <button
            type="button"
            onClick={() => onNavigate('plans')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            <SparklesIcon className="h-4 w-4" />
            Ver planes
          </button>
        </section>
      </div>
    )
  }

  if (!session.isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 pb-14 pt-2 sm:px-6">
        <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-muted text-accent">
            <UserIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 font-display text-2xl text-text">Inicia sesión para ver tu cuenta</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
            Auth0 entrega el access token y la API central resuelve tu plan y permisos efectivos desde Neon.
          </p>
          <button
            type="button"
            onClick={() => void session.login()}
            className="mt-6 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            Iniciar sesión
          </button>
        </section>
      </div>
    )
  }

  const entitlements = getEffectiveEntitlements(access)
  const plan = currentPlan(access)
  const displayName =
    session.profile?.name ?? access?.user.displayName ?? 'Usuario de Albion'
  const email = session.profile?.email ?? access?.user.email ?? 'Correo no disponible'

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-14 pt-2 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            {session.profile?.picture ? (
              <img
                src={session.profile.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-muted text-accent">
                <UserIcon className="h-7 w-7" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl text-text">{displayName}</h2>
              <p className="mt-1 truncate text-xs text-text-faint">{email}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-y border-border py-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-faint">Plan efectivo</dt>
              <dd className="rounded-full border border-accent-border bg-accent-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                {plan}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-faint">Estado</dt>
              <dd className="text-right text-text">{access?.subscription.status ?? 'Free'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-faint">Acceso hasta</dt>
              <dd className="text-right text-xs text-text-muted">
                {formatDate(access?.subscription.accessUntil ?? null)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-faint">Última sincronización</dt>
              <dd className="text-right text-xs text-text-muted">{formatDate(lastSyncedAt)}</dd>
            </div>
          </dl>

          {accessError && (
            <p className="mt-4 rounded-lg border border-negative/40 bg-negative-muted px-3 py-2 text-xs text-negative">
              {accessError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void session.refreshAccess()}
              disabled={status === 'loading'}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
              Actualizar permisos
            </button>
            <button
              type="button"
              onClick={() => onNavigate('plans')}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg"
            >
              <SparklesIcon className="h-4 w-4" />
              Ver planes
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faint">
                Acceso efectivo
              </p>
              <h2 className="mt-1 font-display text-xl text-text">Permisos de la cuenta</h2>
            </div>
            <CheckIcon className="h-6 w-6 text-positive" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries(entitlements).map(([key, value]) => (
              <article
                key={key}
                className="rounded-xl border border-border bg-surface-raised p-4"
              >
                <p className="text-xs text-text-faint">{ENTITLEMENT_LABELS[key] ?? key}</p>
                <p className="mt-1 text-sm font-semibold text-text">{formatValue(value)}</p>
              </article>
            ))}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-text-faint">
            Durante esta etapa, el acceso Pro se asigna manualmente en PostgreSQL. Al actualizar permisos, la interfaz refleja inmediatamente cualquier alta o retiro de acceso.
          </p>
        </section>
      </div>
    </div>
  )
}
