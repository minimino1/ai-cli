// UUID generator
// Supports v1, v4, v5
// Uses crypto.randomUUID for v4 (Bun built-in)

/**
 * Erzeugt eine UUID der angegebenen Version.
 *
 * @param version - Gewünschte UUID-Version: 1, 4 oder 5. Standard ist 4.
 * @returns Die erzeugte UUID als String.
 * @throws Error - Wenn `version` gleich `5`, da v5 einen `name`- und `namespace`-Parameter benötigt (verwende `uuidV5()` stattdessen); oder wenn `version` einen anderen nicht unterstützten Wert hat.
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
 * Erzeugt eine UUID der Version 1 (zeitbasiert).
 *
 * @returns Die erzeugte UUID v1 als Zeichenkette im canonical 8-4-4-4-12-Format
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
 * Erzeugt deterministisch eine UUID Version 5 aus Namespace und Namen.
 *
 * Berechnet die SHA‑1‑Hashing‑Basis aus den Namespace‑Bytes gefolgt vom UTF‑8‑kodierten Namen, setzt die UUID‑Version und RFC‑4122‑Variant‑Bits und liefert die resultierende UUID im kanonischen 8-4-4-4-12‑Format.
 *
 * @param name - Der Name, aus dem zusammen mit dem Namespace die UUID abgeleitet wird
 * @param namespace - Die Namespace‑UUID im kanonischen Format; muss eine gültige UUID sein
 * @returns Die deterministische UUID v5 als String
 * @throws Error wenn `namespace` keine gültige UUID ist
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
 * Prüft, ob ein String das generelle UUID-Format (8-4-4-4-12 hexadezimale Zeichen) hat.
 *
 * Diese Prüfung ist rein formatbasiert (case-insensitive) und erzwingt keine UUID-Version- oder Variantenspezifika.
 *
 * @param str - Der zu prüfende UUID-String
 * @returns `true` wenn `str` dem Pattern `8-4-4-4-12` hexadezimaler Zeichen entspricht, `false` sonst
 */
export function validateUUID(str: string): boolean {
  const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidv4Regex.test(str)
}

/**
 * Extrahiert den in einer UUID v1 kodierten Zeitstempel und gibt ihn als Date zurück.
 *
 * @param uuid - Die UUID-Stringrepräsentation; muss eine UUID v1 sein
 * @returns Das Datum, das dem in der UUID v1 codierten Zeitstempel entspricht, oder `null`, wenn `uuid` nicht gültig oder keine v1-UUID ist
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
 * Konvertiert eine UUID-Zeichenkette in ein 16-Byte-Array.
 *
 * @param uuid - Die UUID-Zeichenkette (mit oder ohne Bindestriche) im hexadezimalen Format.
 * @returns Ein Uint8Array mit 16 Bytes, die die rohe Byte-Repräsentation der UUID enthalten.
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
 * Konvertiert ein 16-Byte-Array in die kanonische UUID-Stringdarstellung.
 *
 * @param bytes - Ein Array mit genau 16 Bytes, das die UUID-Octets enthält
 * @returns Die UUID als String im Format `8-4-4-4-12` (hexadezimale Zeichen, lowercase)
 */
function bytesToUUID(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20)}`
}

/**
 * Prüft, ob ein String das allgemeine UUID-Format aufweist.
 *
 * Diese Prüfung validiert nur die Struktur (8-4-4-4-12 hexadezimale Zeichen) und erzwingt keine
 * semantische Kontrolle von UUID-Version oder RFC-4122-Variante.
 *
 * @param uuid - Die zu prüfende UUID-Zeichenkette
 * @returns `true` wenn `uuid` dem Muster `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` entspricht, `false` sonst.
 */
function isValidUUID(uuid: string): boolean {
  return validateUUID(uuid)
}
