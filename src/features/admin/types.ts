export interface AdminSession {
  readonly adminId: string
  readonly userId: string
  readonly authSubject: string
  readonly email?: string | null
  readonly displayName?: string | null
  readonly active: boolean
  readonly createdAt: string
}

export interface AdminUser {
  readonly id: string
  readonly authSubject: string
  readonly email?: string | null
  readonly displayName?: string | null
}

export interface AccessSnapshot {
  readonly plan: string
  readonly status: string
  readonly accessUntil?: string | null
}

export interface ManualGrant {
  readonly subscriptionId: string
  readonly status: string
  readonly accessUntil?: string | null
  readonly updatedAt: string
}

export interface AdminUserSummary {
  readonly user: AdminUser
  readonly effective: AccessSnapshot
  readonly manualGrant?: ManualGrant | null
  readonly activeProviders: readonly string[]
}

export interface AdminSubscription {
  readonly id: string
  readonly provider: string
  readonly providerSubscriptionId?: string | null
  readonly plan: string
  readonly status: string
  readonly accessUntil?: string | null
  readonly cancelAtPeriodEnd: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface AdminUserDetail extends AdminUserSummary {
  readonly subscriptions: readonly AdminSubscription[]
  readonly entitlements: Readonly<Record<string, boolean | number | string | null>>
}

export interface AdminAuditEvent {
  readonly id: string
  readonly user: AdminUser
  readonly actor: string
  readonly action: 'grant_pro' | 'revoke_pro'
  readonly reason: string
  readonly before: AccessSnapshot
  readonly after: AccessSnapshot
  readonly createdAt: string
}

export interface AdminOperationResult {
  readonly action: string
  readonly changed: boolean
  readonly dryRun: boolean
  readonly user: AdminUser
  readonly before: AccessSnapshot
  readonly after: AccessSnapshot
  readonly manualGrant?: ManualGrant | null
}
