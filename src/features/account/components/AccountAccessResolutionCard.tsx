import { RefreshIcon } from "./AccountIcons";

interface AccountAccessResolutionCardProps {
  readonly status: "loading" | "error";
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly compact?: boolean;
}

export function AccountAccessResolutionCard({
  status,
  error,
  onRetry,
  compact = false,
}: AccountAccessResolutionCardProps) {
  const title =
    status === "loading"
      ? "Sincronizando plan y permisos"
      : "No se pudo verificar tu acceso";
  const description =
    status === "loading"
      ? "Estamos validando tu sesión con Auth0 y consultando el acceso efectivo en la API central."
      : error ??
        "La sesión continúa iniciada, pero la API no confirmó todavía el plan y los permisos.";

  return (
    <section
      aria-live="polite"
      className={`rounded-xl border bg-surface ${
        status === "error"
          ? "border-negative/40"
          : "border-accent-border/45"
      } ${compact ? "p-4" : "p-6 sm:p-8"}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            status === "error"
              ? "border-negative/40 bg-negative-muted text-negative"
              : "border-accent-border bg-accent-muted text-accent"
          }`}
        >
          <RefreshIcon
            className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={`${compact ? "text-sm" : "text-lg"} font-semibold text-text`}>
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {description}
          </p>
          {status === "error" && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              <RefreshIcon className="h-4 w-4" />
              Reintentar verificación
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
