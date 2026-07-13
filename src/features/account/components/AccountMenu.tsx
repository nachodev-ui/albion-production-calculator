import { useContext } from "react";
import type { AppRoute } from "../../../app/types";
import {
  AccountSessionContext,
  type AccountSessionValue,
} from "../context/accountSession";
import {
  currentPlan,
  useAccountAccessStore,
} from "../store/accountAccessStore";
import {
  ChevronDownIcon,
  LogoutIcon,
  RefreshIcon,
  SparklesIcon,
  UserIcon,
} from "./AccountIcons";

interface AccountMenuProps {
  readonly onNavigate: (route: AppRoute) => void;
}

const isolatedSession: AccountSessionValue = {
  authEnabled: false,
  authConfigured: false,
  billingEnabled: false,
  billingStatus: "idle",
  billingError: null,
  isLoading: false,
  isAuthenticated: false,
  profile: null,
  error: null,
  login: async () => undefined,
  logout: async () => undefined,
  refreshAccess: async () => undefined,
  startCheckout: async () => undefined,
  openBillingPortal: async () => undefined,
};

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "Cuenta";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AccountMenu({ onNavigate }: AccountMenuProps) {
  const session = useContext(AccountSessionContext) ?? isolatedSession;
  const access = useAccountAccessStore((state) => state.access);
  const accessStatus = useAccountAccessStore((state) => state.status);
  const plan = currentPlan(access);

  if (!session.isAuthenticated) {
    if (session.authEnabled && session.authConfigured) {
      return (
        <button
          type="button"
          onClick={() => void session.login()}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 text-xs font-semibold text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          <UserIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Iniciar sesión</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onNavigate("account")}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 text-xs font-semibold text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        <UserIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Cuenta</span>
      </button>
    );
  }

  const name = session.profile?.name ?? access?.user.displayName ?? null;
  const email = session.profile?.email ?? access?.user.email ?? null;

  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-surface-raised px-2.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border [&::-webkit-details-marker]:hidden">
        {session.profile?.picture ? (
          <img
            src={session.profile.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent-border bg-accent-muted text-[10px] font-semibold text-accent">
            {initials(name, email)}
          </span>
        )}
        <span className="hidden max-w-32 truncate font-medium sm:block">
          {name ?? email ?? "Cuenta"}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="border-b border-border p-3">
          <p className="truncate text-sm font-semibold text-text">
            {name ?? "Usuario de Albion"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-text-faint">
            {email ?? "Correo no disponible"}
          </p>
          <span className="mt-2 inline-flex rounded-full border border-accent-border bg-accent-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
            {plan}
          </span>
        </div>

        <div className="space-y-1 p-2">
          <button
            type="button"
            onClick={() => onNavigate("account")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <UserIcon className="h-4 w-4" />
            Mi cuenta
          </button>
          <button
            type="button"
            onClick={() => onNavigate("plans")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <SparklesIcon className="h-4 w-4" />
            Planes y acceso
          </button>
          <button
            type="button"
            onClick={() => void session.refreshAccess()}
            disabled={accessStatus === "loading"}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text-muted hover:bg-surface-raised hover:text-text disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshIcon
              className={`h-4 w-4 ${accessStatus === "loading" ? "animate-spin" : ""}`}
            />
            Actualizar permisos
          </button>
          <button
            type="button"
            onClick={() => void session.logout()}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-negative hover:bg-negative-muted"
          >
            <LogoutIcon className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </details>
  );
}
