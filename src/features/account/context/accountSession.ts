import { createContext } from 'react'
import type { SessionProfile } from '../types'

export interface AccountSessionValue {
  readonly authEnabled: boolean
  readonly authConfigured: boolean
  readonly isLoading: boolean
  readonly isAuthenticated: boolean
  readonly profile: SessionProfile | null
  readonly error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshAccess: () => Promise<void>
}

async function noop(): Promise<void> {
  return undefined
}

export const ANONYMOUS_ACCOUNT_SESSION: AccountSessionValue = {
  authEnabled: false,
  authConfigured: false,
  isLoading: false,
  isAuthenticated: false,
  profile: null,
  error: null,
  login: noop,
  logout: noop,
  refreshAccess: noop,
}

export const AccountSessionContext = createContext<AccountSessionValue>(
  ANONYMOUS_ACCOUNT_SESSION,
)
