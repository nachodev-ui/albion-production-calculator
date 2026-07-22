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
import type {
  AlbionPlayerSearchResult,
  AlbionProfileResponse,
  AlbionServer,
} from '../types'
import { AlbionAvatar } from './AlbionArtwork'
import { EconomicProfilePanel } from './EconomicProfilePanel'
import { LinkedPlayerProfile } from './LinkedPlayerProfile'

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

function ErrorBanner({ message }: { readonly message: string }) {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-6">
      <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
        {message}
      </p>
    </div>
  )
}

function PublicProfileLinker({
  server,
  setServer,
  query,
  setQuery,
  busy,
  results,
  onSearch,
  onLink,
  onNavigate,
}: {
  readonly server: AlbionServer
  readonly setServer: (server: AlbionServer) => void
  readonly query: string
  readonly setQuery: (query: string) => void
  readonly busy: boolean
  readonly results: readonly AlbionPlayerSearchResult[]
  readonly onSearch: () => void
  readonly onLink: (player: AlbionPlayerSearchResult) => void
  readonly onNavigate: (route: AppRoute) => void
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-5 pb-14 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-accent-border/70 bg-surface p-6 shadow-[0_20px_65px_rgba(0,0,0,0.18)]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(214,170,42,0.13),transparent_45%)]"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Perfil público de Albion
          </p>
          <h2 className="mt-2 font-display text-3xl text-text">
            Vincula tu personaje
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Busca tu personaje para ver su actividad pública.
          </p>
          <p className="mt-2 text-xs text-text-faint">
            La vinculación pública no verifica propiedad ni modifica tu perfil económico.
          </p>
          <form
            className="mt-6 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              onSearch()
            }}
          >
            <select
              value={server}
              onChange={(event) =>
                setServer(event.target.value as AlbionServer)
              }
              className="rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
            >
              {Object.entries(SERVER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              minLength={3}
              maxLength={32}
              placeholder="Nombre del personaje"
              className="rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
            />
            <button
              type="submit"
              disabled={busy || query.trim().length < 3}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {busy ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((player) => (
          <article
            key={`${player.server}-${player.playerId}`}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <AlbionAvatar
              avatar={player.avatar}
              avatarRing={player.avatarRing}
              playerName={player.playerName}
              className="h-16 w-16 rounded-xl text-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-text">
                {player.playerName}
              </p>
              <p className="mt-1 truncate text-xs text-text-faint">
                {player.guildName || 'Sin gremio'} ·{' '}
                {SERVER_LABELS[player.server]}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Fama PvP: {number(player.killFame)}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onLink(player)}
              className="rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs font-semibold text-accent disabled:opacity-50"
            >
              Vincular
            </button>
          </article>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onNavigate('account')}
        className="text-xs text-text-muted underline"
      >
        Volver a cuenta
      </button>
    </div>
  )
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
      if (
        caught instanceof PlayerProfileApiError &&
        caught.status === 404
      ) {
        setProfile(null)
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : 'No fue posible cargar el perfil.',
        )
      }
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
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible buscar el personaje.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function link(player: AlbionPlayerSearchResult) {
    setBusy(true)
    setError(null)
    try {
      const accessToken = await token()
      setProfile(
        await linkMyAlbionProfile(
          accessToken,
          player.server,
          player.playerId,
        ),
      )
      setResults([])
      setQuery('')
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible vincular el personaje.',
      )
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
      if (
        caught instanceof PlayerProfileApiError &&
        caught.status === 429
      ) {
        setError(
          `Podrás actualizar nuevamente en ${caught.retryAfterSeconds ?? 300} segundos.`,
        )
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : 'No fue posible actualizar el perfil.',
        )
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
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible desvincular el personaje.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <p className="px-5 py-12 text-center text-sm text-text-faint">
        Cargando tu perfil…
      </p>
    )
  }

  return (
    <div className="space-y-5 pb-14">
      {error && <ErrorBanner message={error} />}
      <EconomicProfilePanel onNavigate={onNavigate} />

      {profile ? (
        <LinkedPlayerProfile
          data={profile}
          busy={busy}
          confirmation={confirmation}
          setConfirmation={setConfirmation}
          onRefresh={() => void refresh()}
          onUnlink={() => void unlink()}
        />
      ) : (
        <PublicProfileLinker
          server={server}
          setServer={setServer}
          query={query}
          setQuery={setQuery}
          busy={busy}
          results={results}
          onSearch={() => void search()}
          onLink={(player) => void link(player)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}

export function PlayerProfilePage(props: Props) {
  const session = useAccountSession()
  if (!session.authEnabled || !session.authConfigured) {
    return (
      <p className="px-5 py-10 text-center text-sm text-text-muted">
        La autenticación no está configurada.
      </p>
    )
  }
  if (!session.isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 text-center">
        <h2 className="font-display text-2xl text-text">
          Tu perfil de Albion
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Inicia sesión para configurar tu perfil económico y vincular un
          personaje público.
        </p>
        <button
          type="button"
          onClick={() => void session.login()}
          className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg"
        >
          Iniciar sesión
        </button>
      </div>
    )
  }
  return <Manager {...props} />
}
