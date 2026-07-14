import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useState } from 'react'
import type { AppRoute } from '../../../app/types'
import { accountAuthConfig } from '../../account/config/accountAuthConfig'
import { useAccountSession } from '../../account/hooks/useAccountSession'
import {
  PlayerProfileApiError,
  fetchMyAlbionProfile,
  linkMyAlbionProfile,
  refreshMyAlbionProfile,
  searchAlbionPlayers,
  unlinkMyAlbionProfile,
} from '../api/playerProfileApi'
import type { AlbionPlayerSearchResult, AlbionProfileResponse, AlbionServer } from '../types'

interface Props {
  readonly onNavigate: (route: AppRoute) => void
}

const SERVER_LABELS: Readonly<Record<AlbionServer, string>> = {
  americas: 'Americas',
  europe: 'Europe',
  asia: 'Asia',
}

const number = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value)

const date = (value?: string | null) => {
  if (!value) return 'Sin actualización'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

function Manager({ onNavigate }: Props) {
  const { getAccessTokenSilently } = useAuth0()
  const [server, setServer] = useState<AlbionServer>('americas')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly AlbionPlayerSearchResult[]>([])
  const [profile, setProfile] = useState<AlbionProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState('')

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

  const load = useCallback(async () => {
    try {
      const accessToken = await token()
      setProfile(await fetchMyAlbionProfile(accessToken))
    } catch (caught: unknown) {
      if (caught instanceof PlayerProfileApiError && caught.status === 404) setProfile(null)
      else setError(caught instanceof Error ? caught.message : 'No fue posible cargar el perfil.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    // The async callback updates state only after the external Auth0/API request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function search() {
    if (query.trim().length < 3) return
    setBusy(true)
    setError(null)
    try {
      setResults(await searchAlbionPlayers(server, query.trim()))
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'No fue posible buscar el personaje.')
    } finally {
      setBusy(false)
    }
  }

  async function link(player: AlbionPlayerSearchResult) {
    setBusy(true)
    setError(null)
    try {
      const accessToken = await token()
      setProfile(await linkMyAlbionProfile(accessToken, player.server, player.playerId))
      setResults([])
      setQuery('')
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'No fue posible vincular el personaje.')
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    setBusy(true)
    setError(null)
    try {
      const accessToken = await token()
      setProfile(await refreshMyAlbionProfile(accessToken))
    } catch (caught: unknown) {
      if (caught instanceof PlayerProfileApiError && caught.status === 429) {
        setError(`Podrás actualizar nuevamente en ${caught.retryAfterSeconds ?? 300} segundos.`)
      } else {
        setError(caught instanceof Error ? caught.message : 'No fue posible actualizar el perfil.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function unlink() {
    setBusy(true)
    setError(null)
    try {
      const accessToken = await token()
      await unlinkMyAlbionProfile(accessToken)
      setProfile(null)
      setConfirmation('')
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'No fue posible desvincular el personaje.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="px-5 py-12 text-center text-sm text-text-faint">Cargando tu perfil…</p>

  if (profile) {
    const cards = [
      ['Kills recientes', profile.summary.recentKills],
      ['Muertes recientes', profile.summary.recentDeaths],
      ['K/D reciente', profile.summary.kdRatio ?? '∞'],
      ['Fama de kills', number(profile.summary.killFame)],
      ['Fama perdida', number(profile.summary.deathFame)],
    ] as const
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5 px-5 pb-14 sm:px-6">
        {error && <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">{error}</p>}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl text-text">{profile.profile.playerName}</h2>
                <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase text-text-muted">{SERVER_LABELS[profile.profile.server]}</span>
                <span className="rounded-full border border-warning/40 bg-warning-muted px-2 py-1 text-[10px] uppercase text-warning">No verificado</span>
              </div>
              <p className="mt-2 text-sm text-text-muted">{profile.profile.guildName || 'Sin gremio'}{profile.profile.allianceName ? ` · ${profile.profile.allianceName}` : ''}</p>
              <p className="mt-1 text-xs text-text-faint">Actualizado: {date(profile.profile.lastRefreshedAt)}</p>
            </div>
            <button type="button" disabled={busy} onClick={() => void refresh()} className="rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-bg disabled:opacity-50">Actualizar estadísticas</button>
          </div>
          {profile.profile.lastRefreshStatus === 'error' && <p className="mt-4 rounded-xl border border-warning/35 bg-warning-muted px-4 py-3 text-xs text-warning">El proveedor falló en el último intento. Se muestran los últimos datos guardados.</p>}
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(([label, value]) => <article key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-[10px] uppercase tracking-wider text-text-faint">{label}</p><p className="mt-2 font-mono text-xl text-text">{value}</p></article>)}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-xl text-text">Actividad reciente</h2>
          <div className="mt-4 divide-y divide-border">
            {profile.events.length === 0 && <p className="py-8 text-center text-sm text-text-faint">No hay eventos recientes disponibles.</p>}
            {profile.events.map((event) => <article key={`${event.result}-${event.eventId}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className={event.result === 'kill' ? 'font-semibold text-positive' : 'font-semibold text-negative'}>{event.result === 'kill' ? 'Victoria' : 'Derrota'} contra {event.opponentName}</p><p className="mt-1 text-xs text-text-faint">{date(event.occurredAt)} · {event.opponentGuild || 'Sin gremio'}</p></div><div className="text-right text-xs text-text-muted"><p>{number(event.killFame)} fama</p><p>{number(event.playerItemPower)} IP</p></div></article>)}
          </div>
        </section>
        <section className="rounded-2xl border border-negative/25 bg-surface p-5">
          <h2 className="font-display text-lg text-text">Cambiar o desvincular personaje</h2>
          <p className="mt-2 text-xs text-text-muted">Escribe DESVINCULAR para eliminar el vínculo y su caché.</p>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text" />
          <button type="button" disabled={busy || confirmation !== 'DESVINCULAR'} onClick={() => void unlink()} className="ml-2 rounded-lg border border-negative/50 px-4 py-2 text-xs font-semibold text-negative disabled:opacity-40">Desvincular</button>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-5 pb-14 sm:px-6">
      {error && <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">{error}</p>}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-2xl text-text">Vincula tu personaje</h2>
        <p className="mt-2 text-sm text-text-muted">La vinculación usa información pública y no demuestra propiedad del personaje.</p>
        <form className="mt-6 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); void search() }}>
          <select value={server} onChange={(event) => setServer(event.target.value as AlbionServer)} className="rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text">{Object.entries(SERVER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} minLength={3} maxLength={32} placeholder="Nombre del personaje" className="rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text" />
          <button type="submit" disabled={busy || query.trim().length < 3} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-50">Buscar</button>
        </form>
      </section>
      {results.map((player) => <article key={`${player.server}-${player.playerId}`} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"><div><p className="font-semibold text-text">{player.playerName}</p><p className="mt-1 text-xs text-text-faint">{player.guildName || 'Sin gremio'} · {SERVER_LABELS[player.server]}</p><p className="mt-2 text-xs text-text-muted">Fama PvP: {number(player.killFame)}</p></div><button type="button" disabled={busy} onClick={() => void link(player)} className="rounded-lg border border-accent-border bg-accent-muted px-4 py-2 text-xs font-semibold text-accent disabled:opacity-50">Confirmar personaje</button></article>)}
      <button type="button" onClick={() => onNavigate('account')} className="text-xs text-text-muted underline">Volver a cuenta</button>
    </div>
  )
}

export function PlayerProfilePage(props: Props) {
  const session = useAccountSession()
  if (!session.authEnabled || !session.authConfigured) return <p className="px-5 py-10 text-center text-sm text-text-muted">La autenticación no está configurada.</p>
  if (!session.isAuthenticated) return <div className="mx-auto max-w-3xl px-5 py-12 text-center"><h2 className="font-display text-2xl text-text">Tu perfil de Albion</h2><p className="mt-2 text-sm text-text-muted">Inicia sesión para vincular un personaje.</p><button type="button" onClick={() => void session.login()} className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg">Iniciar sesión</button></div>
  return <Manager {...props} />
}
