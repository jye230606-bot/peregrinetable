import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Booking } from '../src/data/types.js'

/**
 * Where bookings actually live.
 *
 * One small interface, so swapping the file store for Postgres, Supabase or KV
 * is a single implementation and nothing above it changes. Everything the API
 * enforces is above this line; the store only reads and writes.
 */
export interface Store {
  all(): Promise<Booking[]>
  replace(bookings: Booking[]): Promise<void>
}

/**
 * Development store: one JSON file, guarded by a promise chain so concurrent
 * writes queue instead of clobbering each other.
 *
 * Not for production on serverless — the filesystem there is ephemeral and each
 * instance gets its own, so writes would silently disappear. Point PEACOCK_STORE
 * at a real database before this is in front of anyone.
 */
export function fileStore(file: string): Store {
  let queue: Promise<unknown> = Promise.resolve()

  const serialise = <T,>(job: () => Promise<T>): Promise<T> => {
    const next = queue.then(job, job)
    queue = next.catch(() => undefined)
    return next
  }

  return {
    all: () =>
      serialise(async () => {
        try {
          return JSON.parse(await fs.readFile(file, 'utf8')) as Booking[]
        } catch {
          return []
        }
      }),

    replace: (bookings) =>
      serialise(async () => {
        await fs.mkdir(path.dirname(file), { recursive: true })
        // Write beside, then rename: a crash mid-write can't truncate the diary.
        const tmp = `${file}.${process.pid}.tmp`
        await fs.writeFile(tmp, JSON.stringify(bookings, null, 2), 'utf8')
        await fs.rename(tmp, file)
      }),
  }
}

/**
 * Vercel KV / Upstash Redis over its REST API — the whole diary under one key.
 *
 * Written but never exercised: it needs credentials this project does not have,
 * so treat it as a starting point and run it against a real store before
 * trusting it. Fine up to a few thousand bookings; past that the diary wants
 * a row per booking and a real index on the date.
 */
export function kvStore(url: string, token: string, key = 'peacock:bookings'): Store {
  const call = async (command: unknown[]) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    })
    if (!res.ok) throw new Error(`store unavailable (${res.status})`)
    return (await res.json()) as { result: string | null }
  }

  return {
    async all() {
      const { result } = await call(['GET', key])
      return result ? (JSON.parse(result) as Booking[]) : []
    },
    async replace(bookings) {
      await call(['SET', key, JSON.stringify(bookings)])
    },
  }
}

export function storeFromEnv(env: NodeJS.ProcessEnv): Store {
  const url = env.KV_REST_API_URL
  const token = env.KV_REST_API_TOKEN
  if (url && token) return kvStore(url, token)
  return fileStore(env.PEACOCK_STORE_FILE ?? path.join(process.cwd(), '.data', 'bookings.json'))
}
