import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Owner authentication, done where it counts.
 *
 * The password never reaches the browser: only a scrypt hash lives in the
 * environment, and the browser gets an HMAC-signed token in an HttpOnly cookie
 * it cannot read or forge. This is what closes the two findings the localStorage
 * placeholder could not — credentials readable in the bundle, and a session that
 * could be conjured by writing one key.
 */

const SESSION_TTL_MS = 12 * 60 * 60 * 1000
export const COOKIE = 'peacock_session'

const b64 = (b: Buffer) => b.toString('base64url')

// --- password ---------------------------------------------------------------

/** `scrypt$N$r$p$salt$hash`, all base64url. Produced by `npm run hash-password`. */
export function hashPassword(password: string, N = 16384, r = 8, p = 1): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32, { N, r, p })
  return ['scrypt', N, r, p, b64(salt), b64(hash)].join('$')
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, N, r, p, salt, expected] = parts
  try {
    const actual = scryptSync(password, Buffer.from(salt, 'base64url'), 32, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    })
    const want = Buffer.from(expected, 'base64url')
    return actual.length === want.length && timingSafeEqual(actual, want)
  } catch {
    return false
  }
}

// --- session token ----------------------------------------------------------

type Claims = { role: 'owner'; issued: number }

export function issueSession(secret: string, now = Date.now()): string {
  const claims: Claims = { role: 'owner', issued: now }
  const body = b64(Buffer.from(JSON.stringify(claims)))
  const sig = b64(createHmac('sha256', secret).update(body).digest())
  return `${body}.${sig}`
}

export function readSession(token: string | undefined, secret: string, now = Date.now()): Claims | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = createHmac('sha256', secret).update(body).digest()
  let given: Buffer
  try {
    given = Buffer.from(sig, 'base64url')
  } catch {
    return null
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as Claims
    if (claims.role !== 'owner') return null
    if (now - claims.issued > SESSION_TTL_MS) return null
    return claims
  } catch {
    return null
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  const bits = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (secure) bits.push('Secure')
  return bits.join('; ')
}

export function clearedCookie(secure: boolean): string {
  const bits = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0']
  if (secure) bits.push('Secure')
  return bits.join('; ')
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return undefined
}

// --- sign-in throttling -----------------------------------------------------

const attempts = new Map<string, { count: number; until: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

/**
 * Per-instance and therefore only a speed bump on serverless, where each
 * instance counts separately. A shared counter in the store is the real fix;
 * this is here so a single host isn't trivially brute-forceable.
 */
export function tooManyAttempts(ip: string, now = Date.now()): boolean {
  const seen = attempts.get(ip)
  if (!seen || now > seen.until) return false
  return seen.count >= MAX_ATTEMPTS
}

export function recordAttempt(ip: string, now = Date.now()) {
  const seen = attempts.get(ip)
  if (!seen || now > seen.until) attempts.set(ip, { count: 1, until: now + WINDOW_MS })
  else seen.count++
}

export function clearAttempts(ip: string) {
  attempts.delete(ip)
}
