// UUID generator
// Supports v1, v4, v5
// Uses crypto.randomUUID for v4 (Bun built-in)

/**
 * Generate a UUID
 * @param version - UUID version (1, 4, 5). Default: 4
 */
export function generateUUID(version: number = 4): string {
  if (version === 4) {
    return crypto.randomUUID()
  } else if (version === 1) {
    return generateUUIDv1()
  } else if (version === 5) {
    throw new Error('UUID v5 requires name and namespace parameters. Use uuidV5() directly.')
  } else {
    throw new Error(`Unsupported UUID version: ${version}. Use 1, 4, or 5.`)
  }
}

/**
 * Generate UUID v1 (time-based + MAC address)
 */
function generateUUIDv1(): string {
  const timestamp = Date.now() * 10000 + 0x01b21dd213814000 // UUID epoch offset
  const timeLow = (timestamp & 0xffffffff) >>> 0
  const timeMid = (timestamp >>> 32) & 0xffff
  const timeHiAndVersion = ((timestamp >>> 48) & 0x0fff) | 0x1000 // version 1

  // Generate random clock sequence and node (MAC address simulation)
  const clockSeq = (Math.random() * 0x3fff) | 0
  const clockSeqHiAndReserved = (clockSeq >>> 8) | 0x80 // variant RFC 4122
  const clockSeqLow = clockSeq & 0xff
  const node = new Uint8Array(6)
  crypto.getRandomValues(node)

  const format = (num: number, width: number): string =>
    num.toString(16).padStart(width, '0')

  return `${format(timeLow, 8)}-${format(timeMid, 4)}-${format(timeHiAndVersion, 4)}-${format(clockSeqHiAndReserved, 2)}${format(clockSeqLow, 2)}-${Array.from(node).map(b => format(b, 2)).join('')}`
}

/**
 * Generate UUID v5 (namespace-based deterministic)
 * Uses SHA-1 hash of namespace + name
 */
export async function uuidV5(name: string, namespace: string): Promise<string> {
  // Validate namespace UUID
  if (!isValidUUID(namespace)) {
    throw new Error(`Invalid namespace UUID: ${namespace}`)
  }

  const nsBytes = uuidToBytes(namespace)
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(name)

  // Concatenate namespace + name
  const combined = new Uint8Array(nsBytes.length + nameBytes.length)
  combined.set(nsBytes)
  combined.set(nameBytes, nsBytes.length)

  // SHA-1 hash
  const hashBuffer = await crypto.subtle.digest('SHA-1', combined)
  const hash = new Uint8Array(hashBuffer)

  // Set version to 5 (bits 12-15 of time_hi_and_version)
  hash[6] = (hash[6] & 0x0f) | 0x50
  // Set variant to RFC 4122 (bits 6-7 of clock_seq_hi_and_reserved)
  hash[8] = (hash[8] & 0x3f) | 0x80

  return bytesToUUID(hash)
}

/**
 * Predefined namespaces for UUID v5
 */
export const uuidNamespaces = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
}

/**
 * Validate UUID format
 */
export function validateUUID(str: string): boolean {
  const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidv4Regex.test(str)
}

/**
 * Extract timestamp from UUID v1
 * Returns Date object or null if not a valid v1 UUID
 */
export function uuidToDate(uuid: string): Date | null {
  if (!isValidUUID(uuid)) return null

  const version = parseInt(uuid.substr(14, 1), 16)
  if (version !== 1) return null

  const timeLow = parseInt(uuid.substr(0, 8), 16)
  const timeMid = parseInt(uuid.substr(9, 4), 16)
  const timeHi = parseInt(uuid.substr(14, 4), 16) & 0x0fff

  const timestamp = (timeHi * 0x100000000) + (timeMid * 0x10000) + timeLow - 0x01b21dd213814000

  // Convert 100-ns intervals to milliseconds
  const ms = timestamp / 10000
  return new Date(ms)
}

/**
 * Convert UUID string to bytes
 */
function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

/**
 * Convert bytes to UUID string
 */
function bytesToUUID(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20)}`
}

/**
 * Check if UUID is valid (alias for validateUUID)
 */
function isValidUUID(uuid: string): boolean {
  return validateUUID(uuid)
}
