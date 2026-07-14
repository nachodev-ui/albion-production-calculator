import { describe, expect, it } from 'vitest'
import {
  buildAuth0Scope,
  parseAuth0Boolean,
  parseAuth0CacheLocation,
} from './accountAuthConfig'

describe('account Auth0 configuration', () => {
  it('uses persistent storage when production does not override the cache', () => {
    expect(parseAuth0CacheLocation(undefined, 'localstorage')).toBe('localstorage')
    expect(parseAuth0CacheLocation('memory', 'localstorage')).toBe('memory')
    expect(parseAuth0CacheLocation('LOCALSTORAGE')).toBe('localstorage')
  })

  it('adds offline access exactly once when refresh tokens are enabled', () => {
    expect(buildAuth0Scope('openid profile email read:account', true)).toBe(
      'openid profile email read:account offline_access',
    )
    expect(
      buildAuth0Scope('openid offline_access profile email read:account', true),
    ).toBe('openid offline_access profile email read:account')
  })

  it('supports explicit refresh-token overrides', () => {
    expect(parseAuth0Boolean(undefined, true)).toBe(true)
    expect(parseAuth0Boolean('false', true)).toBe(false)
    expect(parseAuth0Boolean('TRUE')).toBe(true)
  })
})
