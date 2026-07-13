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

export const AccountSessionContext =
  createContext<AccountSessionValue | null>(null)
