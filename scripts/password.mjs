import { randomBytes } from 'node:crypto'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generatePassword(length = 16) {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i] % CHARSET.length]
  }
  return out
}

export function generateSlug(name) {
  return (
    (name || 'site')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'site'
  )
}
