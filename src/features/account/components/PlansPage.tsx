import type { AppRoute } from "../../../app/types";
import { useAccountSession } from "../hooks/useAccountSession";
import {
  FREE_PLAN_CAPABILITIES,
  PRO_PLAN_CAPABILITIES,
  type PlanCapability,
} from "../planCapabilities";
import {
  currentPlan,
  useAccountAccessStore,
} from "../store/accountAccessStore";
import { AccountAccessResolutionCard } from "./AccountAccessResolutionCard";
import { CheckIcon, SparklesIcon } from "./AccountIcons";

interface PlansPageProps {
  readonly onNavigate: (route: AppRoute) => void;
}

interface PlanCardProps {
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly features: readonly PlanCapability[];
  readonly active: boolean;
  readonly highlighted?: boolean;
  readonly actionLabel: string;
  readonly disabled?: boolean;
  readonly onAction: () => void;
}

function AvailabilityBadge({
  availability,
}: {
  readonly availability: PlanCapability["availability"];
}) {
  const available = availability === "available";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
        available
          ? "border-positive/35 bg-positive-muted text-positive"
          : "border-warning/35 bg-warning-muted text-warning"
      }`}
    >
      {available ? "Disponible" : "Próximamente"}
    </span>
  );
}

function PlanCard({
  title,
  eyebrow,
  description,
  features,
  active,
  highlighted = false,
  actionLabel,
  disabled = false,
  onAction,
}: PlanCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-6 ${
        highlighted
          ? "border-accent-border bg-accent-muted/45 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
          : "border-border bg-surface"
      }`}
    >
      {highlighted && (
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      )}
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint">
              {eyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl text-text">{title}</h2>
          </div>
          {active && (
            <span className="rounded-full border border-positive/40 bg-positive-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-positive">
              Plan actual
            </span>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          {description}
        </p>

        <ul className="mt-6 space-y-4">
          {features.map((feature) => {
            const available = feature.availability === "available";
            return (
              <li key={feature.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    available
                      ? "bg-positive-muted text-positive"
                      : "border border-warning/35 bg-warning-muted text-warning"
                  }`}
                >
                  {available ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-xs font-semibold" aria-hidden="true">
                      …
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-text">
                      {feature.label}
                    </span>
                    <AvailabilityBadge availability={feature.availability} />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-faint">
                    {feature.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border disabled:cursor-not-allowed disabled:opacity-55 ${
            highlighted
              ? "bg-accent text-bg"
              : "border border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text"
          }`}
        >
          {highlighted && <SparklesIcon className="h-4 w-4" />}
          {actionLabel}
        </button>
      </div>
    </article>
  );
}

export function PlansPage({ onNavigate }: PlansPageProps) {
  const session = useAccountSession();
  const access = useAccountAccessStore((state) => state.access);
  const accessStatus = useAccountAccessStore((state) => state.status);
  const accessError = useAccountAccessStore((state) => state.error);
  const plan = access
    ? currentPlan(access)
    : session.isAuthenticated
      ? null
      : "free";
  const isPro = plan === "pro";
  const hasManagedSubscription =
    access?.subscription.status !== undefined &&
    access.subscription.status !== "none";
  const billingBusy = session.billingStatus !== "idle";
  const accessPending =
    session.isLoading ||
    (session.isAuthenticated && access === null && accessStatus !== "error");
  const accessFailed =
    session.isAuthenticated && access === null && accessStatus === "error";

  function openAccountOrLogin() {
    if (session.isAuthenticated) {
      onNavigate("account");
      return;
    }
    if (session.authEnabled && session.authConfigured) {
      void session.login();
      return;
    }
    onNavigate("account");
  }

  function handleProAction() {
    if (!session.isAuthenticated) {
      openAccountOrLogin();
      return;
    }
    if (isPro && hasManagedSubscription) {
      void session.openBillingPortal();
      return;
    }
    if (isPro) {
      onNavigate("account");
      return;
    }
    void session.startCheckout();
  }

  function proActionLabel(): string {
    if (!session.billingEnabled) return "Checkout en preparación";
    if (session.billingStatus === "checkout") return "Creando checkout...";
    if (session.billingStatus === "portal") return "Abriendo portal...";
    if (!session.isAuthenticated) return "Iniciar sesión para contratar";
    if (isPro && hasManagedSubscription) return "Administrar suscripción";
    if (isPro) return "Ver mi cuenta";
    return "Contratar Pro · USD 4,99";
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-2 sm:px-6">
      <section className="mb-6 rounded-2xl border border-border bg-surface/75 px-6 py-7 text-center sm:px-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          <SparklesIcon className="h-3.5 w-3.5" />
          Funciones verificadas
        </span>
        <h2 className="mt-4 font-display text-3xl text-text sm:text-4xl">
          Compara lo que puedes usar hoy
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
          Cada capacidad indica si ya está disponible o si todavía sigue en
          desarrollo. Las herramientas marcadas como Próximamente no se presentan
          como parte utilizable del producto actual.
        </p>
      </section>

      {session.billingError && (
        <p className="mb-5 rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
          {session.billingError}
        </p>
      )}

      {accessPending ? (
        <AccountAccessResolutionCard status="loading" />
      ) : accessFailed ? (
        <AccountAccessResolutionCard
          status="error"
          error={accessError}
          onRetry={() => void session.refreshAccess()}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <PlanCard
            eyebrow="Acceso base"
            title="Free"
            description="Herramientas esenciales para calcular producción, consultar mercado y sincronizar una biblioteca pequeña de configuraciones."
            features={FREE_PLAN_CAPABILITIES}
            active={plan === "free"}
            actionLabel={
              session.isAuthenticated ? "Ver mi cuenta" : "Comenzar con Free"
            }
            onAction={openAccountOrLogin}
          />
          <PlanCard
            eyebrow="USD 4,99 al mes"
            title="Pro"
            description="Análisis avanzado del Black Market, mayor profundidad histórica, biblioteca ampliada y planificación de lotes. Las alertas se mantienen separadas hasta que estén operativas."
            features={PRO_PLAN_CAPABILITIES}
            active={isPro}
            highlighted
            actionLabel={proActionLabel()}
            disabled={!session.billingEnabled || billingBusy}
            onAction={handleProAction}
          />
        </div>
      )}
    </div>
  );
}
