import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'

const allowedViteKeys = new Set([
  'VITE_CENTRAL_MARKET_API_URL',
  'VITE_ENABLE_LOCAL_RECEIVER_FALLBACK',
  'VITE_LOCAL_MARKET_API_URL',
  'VITE_MARKET_API_URL',
  'VITE_MARKET_REQUEST_TIMEOUT_MS',
])

const sensitiveKeyPattern =
  /VITE_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PASS|PRIVATE|API_KEY|AUTH|BEARER|JWT|CREDENTIAL)[A-Z0-9_]*/g

function gitLsFiles(): readonly string[] {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' },
  )
    .split(/\r?\n/)
    .filter(Boolean)
}

function assertNoTrackedEnvFiles(files: readonly string[]): void {
  const forbidden = files.filter((file) => {
    const name = file.split(/[\\/]/).at(-1) ?? file
    return (
      name.startsWith('.env') &&
      name !== '.env.example' &&
      !name.endsWith('.example')
    )
  })

  if (forbidden.length > 0) {
    throw new Error(
      `No se deben trackear archivos .env reales:\n${forbidden.join('\n')}`,
    )
  }
}

function assertViteEnvKeysAreAllowed(files: readonly string[]): void {
  const violations: string[] = []

  for (const file of files) {
    if (
      !file.endsWith('.ts') &&
      !file.endsWith('.tsx') &&
      !file.endsWith('.js') &&
      !file.endsWith('.jsx') &&
      !file.endsWith('.md') &&
      !file.endsWith('.example')
    ) {
      continue
    }

    const text = readFileSync(file, 'utf8')

    for (const match of text.matchAll(/\bVITE_[A-Z0-9_]+\b/g)) {
      const key = match[0]
      if (!allowedViteKeys.has(key)) {
        violations.push(`${file}: variable VITE_* no permitida: ${key}`)
      }
    }

    for (const match of text.matchAll(sensitiveKeyPattern)) {
      violations.push(`${file}: posible credencial pública: ${match[0]}`)
    }
  }

  if (violations.length > 0) {
    throw new Error(violations.join('\n'))
  }
}

function assertSecurityHeaders(): void {
  const headersPath = 'public/_headers'
  if (!existsSync(headersPath)) {
    throw new Error('Falta public/_headers')
  }

  const headers = readFileSync(headersPath, 'utf8')
  const required = [
    'Content-Security-Policy:',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
    'Referrer-Policy: no-referrer',
    'Permissions-Policy:',
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    "connect-src 'self' https:",
    "img-src 'self' data: https://render.albiononline.com",
    "font-src 'self' https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  ]

  const missing = required.filter((entry) => !headers.includes(entry))
  if (missing.length > 0) {
    throw new Error(
      `Headers de seguridad incompletos en ${relative(process.cwd(), headersPath)}:\n${missing.join('\n')}`,
    )
  }

  const forbiddenLoopbacks = ['127.0.0.1', 'localhost', '[::1]']
  const exposedLoopbacks = forbiddenLoopbacks.filter((entry) =>
    headers.includes(entry),
  )
  if (exposedLoopbacks.length > 0) {
    throw new Error(
      `La CSP pública no debe autorizar servicios loopback:\n${exposedLoopbacks.join('\n')}`,
    )
  }
}

const files = gitLsFiles()

assertNoTrackedEnvFiles(files)
assertViteEnvKeysAreAllowed(files)
assertSecurityHeaders()

console.log('Public frontend security configuration is valid.')
