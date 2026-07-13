import { createContext } from "react";
import type { SessionProfile } from "../types";

export type BillingActionStatus = "idle" | "checkout" | "portal";

export interface AccountSessionValue {
  readonly authEnabled: boolean;
  readonly authConfigured: boolean;
  readonly billingEnabled: boolean;
  readonly billingStatus: BillingActionStatus;
  readonly billingError: string | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly profile: SessionProfile | null;
  readonly error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openBillingPortal: () => Promise<void>;
}

async function noop(): Promise<void> {
  return undefined;
}

export const ANONYMOUS_ACCOUNT_SESSION: AccountSessionValue = {
  authEnabled: false,
  authConfigured: false,
  billingEnabled: false,
  billingStatus: "idle",
  billingError: null,
  isLoading: false,
  isAuthenticated: false,
  profile: null,
  error: null,
  login: noop,
  logout: noop,
  refreshAccess: noop,
  startCheckout: noop,
  openBillingPortal: noop,
};

export const AccountSessionContext = createContext<AccountSessionValue>(
  ANONYMOUS_ACCOUNT_SESSION,
);
