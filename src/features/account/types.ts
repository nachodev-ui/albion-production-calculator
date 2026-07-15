export const ENTITLEMENT_KEYS = {
  historyMaxDays: "history.max_days",
  optimizerLiquidity: "optimizer.liquidity",
  optimizerBatchLimit: "optimizer.batch_limit",
  savedConfigurationsMax: "saved_configurations.max",
  exportsCsv: "exports.csv",
  marketAlertsMax: "alerts.market.max",
  blackMarketAnalytics: "black_market.analytics",
} as const;

export type EntitlementKey =
  (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS];

export type EntitlementValue = boolean | number | string | null;
export type EntitlementMap = Readonly<Record<string, EntitlementValue>>;

export interface AccountUser {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastLoginAt: string | null;
}

export interface AccountSubscription {
  readonly plan: string;
  readonly status: string;
  readonly accessUntil: string | null;
}

export interface AccountAccess {
  readonly user: AccountUser;
  readonly subscription: AccountSubscription;
  readonly entitlements: EntitlementMap;
}

export interface SessionProfile {
  readonly name: string | null;
  readonly email: string | null;
  readonly picture: string | null;
}

export const FREE_ENTITLEMENTS: EntitlementMap = {
  [ENTITLEMENT_KEYS.historyMaxDays]: 7,
  [ENTITLEMENT_KEYS.optimizerLiquidity]: false,
  [ENTITLEMENT_KEYS.optimizerBatchLimit]: 5,
  [ENTITLEMENT_KEYS.savedConfigurationsMax]: 3,
  [ENTITLEMENT_KEYS.exportsCsv]: false,
  [ENTITLEMENT_KEYS.marketAlertsMax]: 0,
  [ENTITLEMENT_KEYS.blackMarketAnalytics]: false,
};
