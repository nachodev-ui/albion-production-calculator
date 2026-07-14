import type { Dispatch, SetStateAction } from 'react'
import {
  equipmentForEvent,
  selectFeaturedBuild,
  selectMostUsedWeapon,
} from '../profilePresentation'
import type { AlbionProfileEvent, AlbionProfileResponse, AlbionServer } from '../types'
import { AlbionAvatar, AlbionItemIcon, EquipmentStrip } from './AlbionArtwork'

const SERVER_LABELS: Readonly<Record<AlbionServer, string>> = {
  americas: 'Americas',
  europe: 'Europe',
  asia: 'Asia',
}

const number = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value)

const compactNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const date = (value?: string | null) => {
  if (!value) return 'Sin actualización'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed)
}

interface LinkedPlayerProfileProps {
  readonly data: AlbionProfileResponse
  readonly busy: boolean
  readonly confirmation: string
  readonly setConfirmation: Dispatch<SetStateAction<string>>
  readonly onRefresh: () => void
  readonly onUnlink: () => void
}

type MetricIconName = 'swords' | 'skull' | 'ratio' | 'fights' | 'fameUp' | 'fameDown'

function MetricIcon({ name }: { readonly name: MetricIconName }) {
  const common = {
    className: 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'skull') {
    return (
      <svg {...common}>
        <path d="M8 19v2m8-2v2M9 15h6m-3-12a8 8 0 0 0-8 8c0 3 1.5 5 4 6v2h8v-2c2.5-1 4-3 4-6a8 8 0 0 0-8-8Z" />
        <path d="M9 11h.01M15 11h.01" />
      </svg>
    )
  }
  if (name === 'ratio') {
    return (
      <svg {...common}>
        <path d="M5 18 18 5M7 7h.01M17 17h.01" />
        <circle cx="7" cy="7" r="2.5" />
        <circle cx="17" cy="17" r="2.5" />
      </svg>
    )
  }
  if (name === 'fights') {
    return (
      <svg {...common}>
        <path d="M4 19 19 4M8 4l12 12M4 8l12 12" />
        <path d="m15 4 5 5M4 15l5 5" />
      </svg>
    )
  }
  if (name === 'fameUp' || name === 'fameDown') {
    const up = name === 'fameUp'
    return (
      <svg {...common}>
        <path d={up ? 'M12 19V5m-5 5 5-5 5 5' : 'M12 5v14m-5-5 5 5 5-5'} />
        <path d="M5 21h14" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="m5 3 6 6-2 2-6-6 2-2Zm14 0-6 6 2 2 6-6-2-2Z" />
      <path d="m8 12-5 5 4 4 5-5m4-4 5 5-4 4-5-5" />
    </svg>
  )
}

interface MetricCardProps {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly icon: MetricIconName
  readonly tone: 'positive' | 'negative' | 'accent' | 'neutral'
}

const METRIC_TONES = {
  positive: 'border-positive/25 bg-positive-muted/35 text-positive',
  negative: 'border-negative/25 bg-negative-muted/35 text-negative',
  accent: 'border-accent-border bg-accent-muted/30 text-accent',
  neutral: 'border-border bg-surface text-text-muted',
} as const

function MetricCard({ label, value, detail, icon, tone }: MetricCardProps) {
  return (
    <article className={`rounded-2xl border p-4 ${METRIC_TONES[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-faint">
            {label}
          </p>
          <p className="mt-2 font-mono text-xl text-text">{value}</p>
        </div>
        <span className="rounded-xl border border-current/15 bg-bg/25 p-2">
          <MetricIcon name={icon} />
        </span>
      </div>
      <p className="mt-3 text-[11px] text-text-faint">{detail}</p>
    </article>
  )
}

function fightLabel(event: AlbionProfileEvent) {
  if (event.participantCount <= 2 && event.groupMemberCount <= 1) return '1v1'
  if (event.groupMemberCount > 1) return `${event.groupMemberCount} aliados`
  return `${event.participantCount} participantes`
}

function CombatEventCard({
  event,
  playerName,
}: {
  readonly event: AlbionProfileEvent
  readonly playerName: string
}) {
  const victory = event.result === 'kill'
  const playerEquipment = equipmentForEvent(event, 'player')
  const opponentEquipment = equipmentForEvent(event, 'opponent')

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-surface ${
        victory ? 'border-positive/30' : 'border-negative/30'
      }`}
    >
      <div
        className={`h-1 ${victory ? 'bg-positive/70' : 'bg-negative/70'}`}
        aria-hidden="true"
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text">{playerName}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-text-faint">
                Tu equipamiento · {number(event.playerItemPower)} IP
              </p>
            </div>
            <AlbionItemIcon
              itemType={playerEquipment.mainHand}
              label="Arma principal"
              size={96}
              className="h-12 w-12 rounded-lg lg:hidden"
            />
          </div>
          <EquipmentStrip equipment={playerEquipment} compact />
        </div>

        <div className="order-first rounded-2xl border border-border bg-bg/40 px-4 py-3 text-center lg:order-none">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
              victory
                ? 'border-positive/35 bg-positive-muted text-positive'
                : 'border-negative/35 bg-negative-muted text-negative'
            }`}
          >
            {victory ? 'Victoria' : 'Derrota'}
          </span>
          <p className="mt-3 font-mono text-sm text-text">{number(event.killFame)} fama</p>
          <p className="mt-1 text-[10px] text-text-faint">{fightLabel(event)}</p>
          <p className="mt-1 text-[10px] text-text-faint">{date(event.occurredAt)}</p>
        </div>

        <div className="min-w-0 lg:text-right">
          <div className="mb-3 flex items-center justify-between gap-3 lg:flex-row-reverse">
            <div>
              <p className="truncate text-xs font-semibold text-text">{event.opponentName}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-text-faint">
                {event.opponentGuild || 'Sin gremio'} · {number(event.opponentItemPower)} IP
              </p>
            </div>
            <AlbionItemIcon
              itemType={opponentEquipment.mainHand}
              label="Arma del oponente"
              size={96}
              className="h-12 w-12 rounded-lg lg:hidden"
            />
          </div>
          <EquipmentStrip
            equipment={opponentEquipment}
            compact
            className="lg:justify-end"
            emptyLabel="Equipamiento rival no disponible"
          />
        </div>
      </div>
    </article>
  )
}

export function LinkedPlayerProfile({
  data,
  busy,
  confirmation,
  setConfirmation,
  onRefresh,
  onUnlink,
}: LinkedPlayerProfileProps) {
  const featuredBuild = selectFeaturedBuild(data.events)
  const weaponUsage = selectMostUsedWeapon(data.events)
  const featuredWeapon = weaponUsage?.weaponType ?? featuredBuild?.weaponType
  const fights = data.summary.recentFightCount
  const victoryRate = fights > 0 ? (data.summary.recentKills / fights) * 100 : 0
  const fameBalance = data.summary.killFame - data.summary.deathFame

  const metrics: readonly MetricCardProps[] = [
    {
      label: 'Victorias recientes',
      value: number(data.summary.recentKills),
      detail: `${victoryRate.toFixed(0)}% de los combates guardados`,
      icon: 'swords',
      tone: 'positive',
    },
    {
      label: 'Derrotas recientes',
      value: number(data.summary.recentDeaths),
      detail: `${Math.max(0, 100 - victoryRate).toFixed(0)}% de la actividad reciente`,
      icon: 'skull',
      tone: 'negative',
    },
    {
      label: 'K/D reciente',
      value: data.summary.kdRatio == null ? '∞' : number(data.summary.kdRatio),
      detail: 'Relación entre victorias y derrotas',
      icon: 'ratio',
      tone: 'accent',
    },
    {
      label: 'Combates analizados',
      value: number(fights),
      detail: 'Eventos almacenados en el perfil',
      icon: 'fights',
      tone: 'neutral',
    },
    {
      label: 'Fama obtenida',
      value: compactNumber(data.summary.killFame),
      detail: `${number(data.summary.killFame)} de fama`,
      icon: 'fameUp',
      tone: 'positive',
    },
    {
      label: 'Fama perdida',
      value: compactNumber(data.summary.deathFame),
      detail: `Balance ${fameBalance >= 0 ? '+' : ''}${compactNumber(fameBalance)}`,
      icon: 'fameDown',
      tone: 'negative',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-5 pb-14 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-accent-border/70 bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(214,170,42,0.14),transparent_42%),linear-gradient(110deg,rgba(214,170,42,0.06),transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-accent-muted/20 to-transparent"
          aria-hidden="true"
        />
        {featuredWeapon && (
          <AlbionItemIcon
            itemType={featuredWeapon}
            label="Arma destacada"
            size={512}
            decorative
            className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rotate-6 border-0 bg-transparent opacity-[0.13] shadow-none sm:h-96 sm:w-96"
            imageClassName="drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
          />
        )}

        <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <AlbionAvatar
              avatar={data.profile.avatar}
              avatarRing={data.profile.avatarRing}
              playerName={data.profile.playerName}
              className="h-24 w-24 sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-display text-3xl text-text sm:text-4xl">
                  {data.profile.playerName}
                </h2>
                <span className="rounded-full border border-border bg-bg/30 px-2.5 py-1 text-[10px] uppercase tracking-wider text-text-muted">
                  {SERVER_LABELS[data.profile.server]}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                    data.profile.verificationStatus === 'verified'
                      ? 'border-positive/35 bg-positive-muted text-positive'
                      : 'border-warning/40 bg-warning-muted text-warning'
                  }`}
                >
                  {data.profile.verificationStatus === 'verified' ? 'Verificado' : 'No verificado'}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-muted">
                {data.profile.guildName || 'Sin gremio'}
                {data.profile.allianceName ? ` · ${data.profile.allianceName}` : ''}
              </p>
              <p className="mt-1 text-xs text-text-faint">
                Actualizado: {date(data.profile.lastRefreshedAt)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-border bg-bg/30 px-3 py-2 text-[10px] uppercase tracking-wider text-text-faint">
                  {number(fights)} combates recientes
                </span>
                <span className="rounded-lg border border-border bg-bg/30 px-3 py-2 text-[10px] uppercase tracking-wider text-text-faint">
                  {victoryRate.toFixed(0)}% victorias
                </span>
                {weaponUsage && (
                  <span className="rounded-lg border border-border bg-bg/30 px-3 py-2 text-[10px] uppercase tracking-wider text-text-faint">
                    {weaponUsage.uses} usos del arma principal
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onRefresh}
            className="relative shrink-0 rounded-xl bg-accent px-5 py-3 text-xs font-semibold text-bg shadow-[0_12px_30px_rgba(214,170,42,0.18)] transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Actualizando…' : 'Actualizar estadísticas'}
          </button>
        </div>
      </section>

      {data.profile.lastRefreshStatus === 'error' && (
        <p className="rounded-xl border border-warning/35 bg-warning-muted px-4 py-3 text-xs text-warning">
          El proveedor falló en el último intento. Se muestran los últimos datos guardados.
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                Equipamiento destacado
              </p>
              <h2 className="mt-1 font-display text-2xl text-text">Build más utilizada</h2>
            </div>
            {featuredBuild && (
              <span className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[10px] text-text-muted">
                {featuredBuild.uses} usos · {featuredBuild.winRate.toFixed(0)}% victorias
              </span>
            )}
          </div>
          <div className="mt-5">
            {featuredBuild ? (
              <EquipmentStrip equipment={featuredBuild.equipment} />
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-faint">
                Actualiza el perfil para guardar el equipamiento completo de los combates.
              </p>
            )}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(214,170,42,0.12),transparent_46%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Tendencia de combate
            </p>
            <h2 className="mt-1 font-display text-2xl text-text">Arma más utilizada</h2>
            {weaponUsage ? (
              <div className="mt-5 flex items-center gap-4">
                <AlbionItemIcon
                  itemType={weaponUsage.weaponType}
                  label="Arma más utilizada"
                  size={192}
                  className="h-24 w-24"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-text-muted" title={weaponUsage.weaponType}>
                    {weaponUsage.weaponType}
                  </p>
                  <p className="mt-2 text-sm text-text">
                    {weaponUsage.uses} combates · {weaponUsage.victories} victorias
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg/60">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, weaponUsage.winRate)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-text-faint">
                    {weaponUsage.winRate.toFixed(0)}% de victorias con esta arma
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-text-faint">No hay armas recientes disponibles.</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Historial PvP
            </p>
            <h2 className="mt-1 font-display text-2xl text-text">Actividad reciente</h2>
          </div>
          <p className="text-xs text-text-faint">
            Equipamiento, IP, fama y contexto de cada enfrentamiento
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {data.events.length === 0 && (
            <p className="py-10 text-center text-sm text-text-faint">
              No hay eventos recientes disponibles.
            </p>
          )}
          {data.events.map((event) => (
            <CombatEventCard
              key={`${event.result}-${event.eventId}`}
              event={event}
              playerName={data.profile.playerName}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-negative/25 bg-surface p-5">
        <h2 className="font-display text-lg text-text">Cambiar o desvincular personaje</h2>
        <p className="mt-2 text-xs text-text-muted">
          Escribe DESVINCULAR para eliminar el vínculo y su caché.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text"
          />
          <button
            type="button"
            disabled={busy || confirmation !== 'DESVINCULAR'}
            onClick={onUnlink}
            className="rounded-lg border border-negative/50 px-4 py-2 text-xs font-semibold text-negative disabled:opacity-40"
          >
            Desvincular
          </button>
        </div>
      </section>
    </div>
  )
}
