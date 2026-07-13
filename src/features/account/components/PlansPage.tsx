import type { AppRoute } from "../../../app/types";
import { useAccountSession } from "../context/AccountSessionContext";
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
          className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
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
          La API central resuelve el plan efectivo y la interfaz desbloquea
          únicamente las capacidades autorizadas. En este hito, Pro se asigna
          manualmente desde administración.
        </p>
      </section>

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
          eyebrow="Acceso ampliado"
          title="Pro"
          description="Mayor profundidad histórica y herramientas avanzadas para analizar liquidez, automatizar comparaciones y administrar más configuraciones."
          features={PRO_FEATURES}
          active={isPro}
          highlighted
          actionLabel={isPro ? "Administrar mi acceso" : "Solicitar acceso Pro"}
          onAction={openAccountOrLogin}
        />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-text">
          Activación durante el Hito 2
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-text-faint">
          Todavía no existe checkout ni facturación automática. Una cuenta
          autenticada se crea al consultar su perfil; luego un administrador
          puede asignar o retirar Pro en PostgreSQL. El botón de actualizar
          permisos refleja el cambio sin almacenar secretos en el navegador.
        </p>
      </section>
    </div>
  );
}
