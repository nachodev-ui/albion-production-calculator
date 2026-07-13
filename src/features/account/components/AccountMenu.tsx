import type { AppRoute } from '../../../app/types'
import { useAccountSession } from '../context/AccountSessionContext'
import {
  currentPlan,
  useAccountAccessStore,
} from '../store/accountAccessStore'
import {
  ChevronDownIcon,
  LogoutIcon,
  RefreshIcon,
  SparklesIcon,
  UserIcon,
} from './AccountIcons'

interface AccountMenuProps {
  readonly onNavigate: (route: AppRoute) => void
}

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || 'Cuenta'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function AccountMenu({ onNavigate }: AccountMenuProps) {
  const session = useAccountSession()
  const access = useAccountAccessStore((state) => state.access)
  const accessStatus = useAccountAccessStore((state) => state.status)
  const plan = currentPlan(access)

  if (!session.isAuthenticated) {
    if (session.authEnabled && session.authConfigured) {
      return (
        <button
          type="button"
          onClick={() => void session.login()}
          disabled={session.isLoading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-accent-border bg-accent-muted px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border disabled:cursor-wait disabled:opacity-60"
        >
          <UserIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Iniciar sesión</span>
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={() => onNavigate('account')}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        <UserIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Cuenta</span>
      </button>
    )
  }

  const profileName = session.profile?.name ?? access?.user.displayName ?? null
  const profileEmail = session.profile?.email ?? access?.user.email ?? null

  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-surface-raised px-2.5 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border [&::-webkit-details-marker]:hidden">
        {session.profile?.picture ? (
          <img
            src={session.profile.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-muted text-[10px] font-bold text-accent">
            {initials(profileName, profileEmail)}
          </span>
        )}
        <span className="hidden min-w-0 leading-tight md:block">
          <span className="block max-w-28 truncate text-xs font-medium text-text">
            {profileName ?? profileEmail ?? 'Mi cuenta'}
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-accent">
            Plan {plan}
          </span>
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-text-faint transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.38)]">
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-text">
            {profileName ?? 'Cuenta de Albion'}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-faint">
            {profileEmail ?? 'Perfil autenticado'}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-accent-border bg-accent-muted px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-accent">
            <SparklesIcon className="h-3 w-3" />
            {plan}
          </span>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => onNavigate('account')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <UserIcon className="h-4 w-4" />
            Mi cuenta
          </button>
          <button
            type="button"
            onClick={() => onNavigate('plans')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <SparklesIcon className="h-4 w-4" />
            Planes y permisos
          </button>
          <button
            type="button"
            onClick={() => void session.refreshAccess()}
            disabled={accessStatus === 'loading'}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-text-muted hover:bg-surface-raised hover:text-text disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshIcon className="h-4 w-4" />
            Actualizar permisos
          </button>
        </div>

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => void session.logout()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-negative hover:bg-negative-muted"
          >
            <LogoutIcon className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </details>
  )
}
