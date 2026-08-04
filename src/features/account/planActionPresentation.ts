import type { BillingActionStatus } from "./context/accountSession";

export interface ProPlanActionPresentationInput {
  readonly isAuthenticated: boolean;
  readonly billingEnabled: boolean;
  readonly billingStatus: BillingActionStatus;
  readonly isPro: boolean;
  readonly hasManagedSubscription: boolean;
}

export interface ProPlanActionPresentation {
  readonly label: string;
  readonly disabled: boolean;
}

export function resolveProPlanActionPresentation({
  isAuthenticated,
  billingEnabled,
  billingStatus,
  isPro,
  hasManagedSubscription,
}: ProPlanActionPresentationInput): ProPlanActionPresentation {
  if (!isAuthenticated) {
    return {
      label: "Iniciar sesión para contratar Pro",
      disabled: false,
    };
  }

  if (billingStatus === "checkout") {
    return {
      label: "Creando checkout...",
      disabled: true,
    };
  }

  if (billingStatus === "portal") {
    return {
      label: "Abriendo portal...",
      disabled: true,
    };
  }

  if (isPro && !hasManagedSubscription) {
    return {
      label: "Ver mi cuenta",
      disabled: false,
    };
  }

  if (!billingEnabled) {
    return {
      label: "Checkout en preparación",
      disabled: true,
    };
  }

  if (isPro && hasManagedSubscription) {
    return {
      label: "Administrar suscripción",
      disabled: false,
    };
  }

  return {
    label: "Contratar Pro · USD 4,99",
    disabled: false,
  };
}
