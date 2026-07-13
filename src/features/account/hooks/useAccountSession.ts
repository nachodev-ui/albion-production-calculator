import { useContext } from 'react'
import { AccountSessionContext } from '../context/accountSession'
import type { AccountSessionValue } from '../context/accountSession'

export function useAccountSession(): AccountSessionValue {
  const value = useContext(AccountSessionContext)
  if (!value) {
    throw new Error('useAccountSession must be used inside AccountSessionProvider')
  }
  return value
}
