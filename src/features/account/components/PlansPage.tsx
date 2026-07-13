import type { AppRoute } from "../../../app/types";
import { useAccountSession } from "../hooks/useAccountSession";
import {
  currentPlan,
  useAccountAccessStore,
} from "../store/accountAccessStore";
import { CheckIcon, SparklesIcon } from "./AccountIcons";

interface PlansPageProps {
  readonly onNavigate: (route: AppRoute) => void;
}

const FREE_FEATURES = [
  "Hasta 7 días de historial de mercado",
  "Hasta 3 presets guardados por navegador",
  "Comparación de precios y rentabilidad base",
  "Cálculo de retorno, tarifas, fama y progreso",
] as const;

const PRO_FEATURES = [
  "Hasta 28 días de historial de mercado",
  "Optimizador con análisis de liquidez",
  "Hasta 100 presets guardados",
  "Exportación CSV habilitada",
  "Hasta 10 alertas de mercado",
  "Límites ampliados para análisis en batch",
] as const;

interface PlanCardProps {
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly active: boolean;
  readonly highlighted?: boolean;
  readonly actionLabel: string;
  readonly disabled?: boolean;
  readonly onAction: () => void;
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

        <ul className="mt-6 space-y-3">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-text-muted"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-positive-muted text-positive">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              {feature}
            </li>
          ))}
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
  const plan = currentPlan(access);
  const isPro = plan === "pro";
  const hasManagedSubscription =
    access?.subscription.status !== undefined &&
    access.subscription.status !== "none";
  const billingBusy = session.billingStatus !== "idle";

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
          Acceso por entitlements
        </span>
        <h2 className="mt-4 font-display text-3xl text-text sm:text-4xl">
          Compara el acceso Free y Pro
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
          La API central autoriza cada capacidad y Lemon Squeezy administra la
          suscripción sin almacenar información bancaria en Albion Production
          Calculator.
        </p>
      </section>

      {session.billingError && (
        <p className="mb-5 rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
          {session.billingError}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <PlanCard
          eyebrow="Acceso base"
          title="Free"
          description="Todas las herramientas esenciales para calcular producción, consultar mercado y guardar una configuración básica."
          features={FREE_FEATURES}
          active={!isPro}
          actionLabel={
            session.isAuthenticated ? "Ver mi cuenta" : "Comenzar con Free"
          }
          onAction={openAccountOrLogin}
        />
        <PlanCard
          eyebrow="USD 4,99 al mes"
          title="Pro"
          description="Mayor profundidad histórica y herramientas avanzadas para analizar liquidez, automatizar comparaciones y administrar más configuraciones."
          features={PRO_FEATURES}
          active={isPro}
          highlighted
          actionLabel={proActionLabel()}
          disabled={!session.billingEnabled || billingBusy}
          onAction={handleProAction}
        />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-text">
          Facturación sandbox protegida
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-text-faint">
          El checkout permanece oculto en producción hasta activar la bandera de
          facturación y configurar las credenciales externas. Las cuentas con Pro
          manual continúan funcionando sin depender del proveedor de pago.
        </p>
      </section>
    </div>
  );
}
