import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppRoute } from '../../../app/types'
import { accountAuthConfig } from '../../account/config/accountAuthConfig'
import { useAccountSession } from '../../account/hooks/useAccountSession'
import {
  AdminApiError,
  fetchAdminAuditEvents,
  fetchAdminSession,
  fetchAdminUser,
  grantAdminPro,
  revokeAdminPro,
  searchAdminUsers,
} from '../api/adminApi'
import type {
  AdminAuditEvent,
  AdminSession,
  AdminUserDetail,
  AdminUserSummary,
} from '../types'

interface AdminPageProps {
  readonly onNavigate: (route: AppRoute) => void
}

function formatDate(value?: string | null): string {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function identityLabel(user: AdminUserSummary['user']): string {
  return user.displayName ?? user.email ?? user.authSubject
}

function AdminPanel({ onNavigate }: AdminPageProps) {
  const { getAccessTokenSilently } = useAuth0()
  const accountSession = useAccountSession()
  const [session, setSession] = useState<AdminSession | null>(null)
  const [users, setUsers] = useState<readonly AdminUserSummary[]>([])
  const [selected, setSelected] = useState<AdminUserDetail | null>(null)
  const [audit, setAudit] = useState<readonly AdminAuditEvent[]>([])
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [durationDays, setDurationDays] = useState(30)
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving'>('loading')
  const [error, setError] = useState<string | null>(null)

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

  const loadUser = useCallback(
    async (userId: string, accessToken?: string) => {
      const currentToken = accessToken ?? (await token())
      setSelected(await fetchAdminUser(currentToken, userId))
    },
    [token],
  )

  const loadDashboard = useCallback(
    async (search = '') => {
      setStatus('loading')
      setError(null)
      try {
        const accessToken = await token()
        const [nextSession, nextUsers, nextAudit] = await Promise.all([
          fetchAdminSession(accessToken),
          searchAdminUsers(accessToken, search),
          fetchAdminAuditEvents(accessToken),
        ])
        setSession(nextSession)
        setUsers(nextUsers)
        setAudit(nextAudit)
        if (selected) await loadUser(selected.user.id, accessToken)
        setStatus('ready')
      } catch (caught: unknown) {
        setStatus('ready')
        if (caught instanceof AdminApiError && caught.status === 403) {
          setError('Tu cuenta no tiene autorización administrativa.')
        } else {
          setError(
            caught instanceof Error
              ? caught.message
              : 'No fue posible cargar el panel administrativo.',
          )
        }
      }
    },
    [loadUser, selected, token],
  )

  useEffect(() => {
    void loadDashboard()
    // Initial load must run once for the authenticated bridge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedHasExternalAccess = useMemo(
    () => selected?.activeProviders.some((provider) => provider !== 'manual') ?? false,
    [selected],
  )

  async function mutate(action: 'grant' | 'revoke') {
    if (!selected) return
    setStatus('saving')
    setError(null)
    try {
      const accessToken = await token()
      if (action === 'grant') {
        await grantAdminPro(accessToken, selected.user.id, durationDays, reason, confirmation)
      } else {
        await revokeAdminPro(accessToken, selected.user.id, reason, confirmation)
      }
      setReason('')
      setConfirmation('')
      await Promise.all([
        loadUser(selected.user.id, accessToken),
        searchAdminUsers(accessToken, query).then(setUsers),
        fetchAdminAuditEvents(accessToken).then(setAudit),
      ])
      await accountSession.refreshAccess()
      setStatus('ready')
    } catch (caught: unknown) {
      setStatus('ready')
      setError(
        caught instanceof Error ? caught.message : 'No fue posible completar la operación.',
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-5 pb-14 pt-2 sm:px-6">
      {error && (
        <section className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
          {error}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faint">
              Sesión administrativa
            </p>
            <h2 className="mt-1 font-display text-xl text-text">
              {session?.displayName ?? session?.email ?? 'Administrador'}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-muted">
              Cada cambio se autoriza nuevamente en la API y registra el subject Auth0 como actor. El navegador nunca recibe acceso directo a Neon.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('account')}
            className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-text-muted hover:text-text"
          >
            Volver a cuenta
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void loadDashboard(query)
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Correo, nombre, UUID o subject"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none focus:border-accent-border"
            />
            <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg">
              Buscar
            </button>
          </form>

          <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {users.map((entry) => (
              <button
                key={entry.user.id}
                type="button"
                onClick={() => void loadUser(entry.user.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected?.user.id === entry.user.id
                    ? 'border-accent-border bg-accent-muted'
                    : 'border-border bg-surface-raised hover:border-border-strong'
                }`}
              >
                <p className="truncate text-sm font-semibold text-text">{identityLabel(entry.user)}</p>
                <p className="mt-1 truncate text-[11px] text-text-faint">{entry.user.id}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-text-muted">
                    {entry.effective.plan}
                  </span>
                  {entry.activeProviders.map((provider) => (
                    <span key={provider} className="rounded-full border border-accent-border bg-accent-muted px-2 py-0.5 text-[10px] text-accent">
                      {provider}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {status === 'loading' && (
              <p className="py-8 text-center text-xs text-text-faint">Cargando usuarios…</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          {!selected ? (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-text-faint">
              Selecciona un usuario para administrar su acceso.
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-xl text-text">{identityLabel(selected.user)}</h2>
                  <p className="mt-1 text-xs text-text-faint">{selected.user.authSubject}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-text-faint">Plan efectivo</p>
                  <p className="mt-1 text-lg font-semibold uppercase text-accent">{selected.effective.plan}</p>
                  <p className="text-xs text-text-muted">
                    {selected.effective.status} · {formatDate(selected.effective.accessUntil)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <article className="rounded-xl border border-border bg-surface-raised p-4">
                  <h3 className="text-sm font-semibold text-text">Conceder Pro manual</h3>
                  <label className="mt-3 block text-xs text-text-faint">
                    Duración
                    <select
                      value={durationDays}
                      onChange={(event) => setDurationDays(Number(event.target.value))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                    >
                      {[7, 30, 90, 180, 365].map((days) => (
                        <option key={days} value={days}>{days} días</option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 block text-xs text-text-faint">
                    Motivo
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                  </label>
                  <label className="mt-3 block text-xs text-text-faint">
                    Escribe GRANT PRO
                    <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                  </label>
                  <button
                    type="button"
                    disabled={status === 'saving' || confirmation !== 'GRANT PRO' || reason.trim().length < 3}
                    onClick={() => void mutate('grant')}
                    className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg disabled:opacity-40"
                  >
                    Conceder Pro
                  </button>
                </article>

                <article className="rounded-xl border border-negative/30 bg-negative-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-text">Retirar grant manual</h3>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    Solo retira el proveedor manual.{selectedHasExternalAccess && ' Este usuario mantiene otro proveedor activo y podría continuar en Pro.'}
                  </p>
                  <label className="mt-3 block text-xs text-text-faint">
                    Motivo
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                  </label>
                  <label className="mt-3 block text-xs text-text-faint">
                    Escribe REVOKE PRO
                    <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                  </label>
                  <button
                    type="button"
                    disabled={status === 'saving' || confirmation !== 'REVOKE PRO' || reason.trim().length < 3 || !selected.manualGrant}
                    onClick={() => void mutate('revoke')}
                    className="mt-3 w-full rounded-lg border border-negative/50 px-3 py-2 text-xs font-semibold text-negative disabled:opacity-40"
                  >
                    Retirar Pro manual
                  </button>
                </article>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <article className="rounded-xl border border-border bg-surface-raised p-4">
                  <h3 className="text-sm font-semibold text-text">Suscripciones</h3>
                  <div className="mt-3 space-y-2">
                    {selected.subscriptions.map((subscription) => (
                      <div key={subscription.id} className="rounded-lg border border-border bg-surface p-3 text-xs">
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold text-text">{subscription.provider}</span>
                          <span className="text-text-muted">{subscription.status}</span>
                        </div>
                        <p className="mt-1 text-text-faint">{subscription.plan} · {formatDate(subscription.accessUntil)}</p>
                      </div>
                    ))}
                    {selected.subscriptions.length === 0 && <p className="text-xs text-text-faint">Sin suscripciones.</p>}
                  </div>
                </article>

                <article className="rounded-xl border border-border bg-surface-raised p-4">
                  <h3 className="text-sm font-semibold text-text">Entitlements</h3>
                  <dl className="mt-3 space-y-2 text-xs">
                    {Object.entries(selected.entitlements).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3">
                        <dt className="text-text-faint">{key}</dt>
                        <dd className="text-right text-text">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-xl text-text">Auditoría administrativa</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-text-faint">
              <tr>
                <th className="pb-2">Fecha</th><th className="pb-2">Acción</th><th className="pb-2">Usuario</th><th className="pb-2">Actor</th><th className="pb-2">Motivo</th><th className="pb-2">Cambio</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((event) => (
                <tr key={event.id} className="border-t border-border">
                  <td className="py-3 text-text-muted">{formatDate(event.createdAt)}</td>
                  <td className="py-3 font-semibold text-text">{event.action}</td>
                  <td className="py-3 text-text-muted">{identityLabel(event.user)}</td>
                  <td className="py-3 text-text-faint">{event.actor}</td>
                  <td className="max-w-xs py-3 text-text-muted">{event.reason}</td>
                  <td className="py-3 text-text-muted">{event.before.plan} → {event.after.plan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export function AdminPage(props: AdminPageProps) {
  const session = useAccountSession()

  if (!session.authEnabled || !session.authConfigured) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 pb-14 sm:px-6">
        <p className="rounded-xl border border-border bg-surface p-5 text-sm text-text-muted">La autenticación administrativa no está configurada.</p>
      </div>
    )
  }

  if (!session.isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 pb-14 sm:px-6">
        <section className="rounded-2xl border border-border bg-surface p-8 text-center">
          <h2 className="font-display text-2xl text-text">Acceso administrativo</h2>
          <p className="mt-2 text-sm text-text-muted">Inicia sesión con la cuenta autorizada en Auth0.</p>
          <button type="button" onClick={() => void session.login()} className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg">Iniciar sesión</button>
        </section>
      </div>
    )
  }

  return <AdminPanel {...props} />
}
