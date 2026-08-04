import { describe, expect, it } from "vitest";
import { resolveProPlanActionPresentation } from "./planActionPresentation";

describe("Pro plan action presentation", () => {
  it("keeps the sign-in action enabled for guests while billing is disabled", () => {
    expect(
      resolveProPlanActionPresentation({
        isAuthenticated: false,
        billingEnabled: false,
        billingStatus: "idle",
        isPro: false,
        hasManagedSubscription: false,
      }),
    ).toEqual({
      label: "Iniciar sesión para contratar Pro",
      disabled: false,
    });
  });

  it("keeps checkout unavailable for an authenticated Free account when billing is disabled", () => {
    expect(
      resolveProPlanActionPresentation({
        isAuthenticated: true,
        billingEnabled: false,
        billingStatus: "idle",
        isPro: false,
        hasManagedSubscription: false,
      }),
    ).toEqual({
      label: "Checkout en preparación",
      disabled: true,
    });
  });

  it("allows an authenticated Free account to start checkout when billing is enabled", () => {
    expect(
      resolveProPlanActionPresentation({
        isAuthenticated: true,
        billingEnabled: true,
        billingStatus: "idle",
        isPro: false,
        hasManagedSubscription: false,
      }),
    ).toEqual({
      label: "Contratar Pro · USD 4,99",
      disabled: false,
    });
  });

  it("keeps manually granted Pro accounts independent from the billing provider", () => {
    expect(
      resolveProPlanActionPresentation({
        isAuthenticated: true,
        billingEnabled: false,
        billingStatus: "idle",
        isPro: true,
        hasManagedSubscription: false,
      }),
    ).toEqual({
      label: "Ver mi cuenta",
      disabled: false,
    });
  });

  it("opens the provider portal for managed Pro subscriptions", () => {
    expect(
      resolveProPlanActionPresentation({
        isAuthenticated: true,
        billingEnabled: true,
        billingStatus: "idle",
        isPro: true,
        hasManagedSubscription: true,
      }),
    ).toEqual({
      label: "Administrar suscripción",
      disabled: false,
    });
  });
});
