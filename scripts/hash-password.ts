/**
 * Print a scrypt hash for PEACOCK_OWNER_PASSWORD_HASH.
 *
 *   echo -n 'your password' | npm run hash-password
 *   PEACOCK_NEW_PASSWORD='your password' npm run hash-password
 *
 * The password is read from stdin or the environment, never from argv: an
 * argument is visible in shell history and in process listings, and npm on
 * Windows mangles `--` arguments with caret escapes when the script chains
 * commands, which silently produces a hash for a string you never typed.
 */
import { hashPassword } from '../server/auth'

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const password = (process.env.PEACOCK_NEW_PASSWORD ?? (await readStdin())).replace(/\r?\n$/, '')

if (!password) {
  console.error("usage: echo -n 'your password' | npm run hash-password")
  console.error("   or: PEACOCK_NEW_PASSWORD='your password' npm run hash-password")
  process.exit(1)
}

console.log(hashPassword(password))
