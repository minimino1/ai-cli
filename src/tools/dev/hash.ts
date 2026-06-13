// Hash utilities using Web Crypto API (available in Bun)
// Supports: md5, sha1, sha256, sha512, hmac

const algorithmMap: Record<string, string> = {
  md5: 'MD5',
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha512: 'SHA-512',
}

/**
 * Erzeugt den Hex-String des Hashes einer Zeichenkette mit dem angegebenen Algorithmus.
 *
 * @param str - Die Eingabezeichenkette, deren Hash berechnet werden soll
 * @param algorithm - Der zu verwendende Algorithmus; unterstützt werden `md5`, `sha1`, `sha256` und `sha512` (Standard: `sha256`)
 * @returns Der berechnete Hash als kleingeschriebener Hex-String
 * @throws {Error} Wenn `algorithm` nicht zu den unterstützten Optionen gehört
 */
export async function hash(str: string, algorithm: string = 'sha256'): Promise<string> {
  const algo = algorithm.toLowerCase()
  const cryptoAlgo = algorithmMap[algo]

  if (!cryptoAlgo) {
    throw new Error(`Unsupported algorithm: ${algorithm}. Use md5, sha1, sha256, or sha512.`)
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest(cryptoAlgo, data)
  return bufferToHex(hashBuffer)
}

/**
 * Erzeugt den Hex-Hash des Inhalts einer Datei.
 *
 * Versucht, die Datei vollständig in den Arbeitsspeicher zu laden und zu hashen; bei Dateien größer als 1 MiB wird ein strombasierter Hash verwendet.
 *
 * @param path - Pfad zur zu hashenden Datei
 * @param algorithm - Name des Hash-Algorithmus; einer von `md5`, `sha1`, `sha256`, `sha512` (Standard: `sha256`)
 * @returns Den Hash als kleingeschriebene hexadezimale Zeichenkette
 * @throws Error - wenn `algorithm` nicht unterstützt wird (Nachricht: `Unsupported algorithm: ...`) oder wenn das Lesen/Hashen der Datei fehlschlägt (Nachricht: `Could not hash file <path>: <message>`)
 */
export async function hashFile(path: string, algorithm: string = 'sha256'): Promise<string> {
  const algo = algorithm.toLowerCase()
  const cryptoAlgo = algorithmMap[algo]

  if (!cryptoAlgo) {
    throw new Error(`Unsupported algorithm: ${algorithm}. Use md5, sha1, sha256, or sha512.`)
  }

  try {
    const file = Bun.file(path)
    const fileSize = (await file.stat()).size

    // For large files, stream the hash
    if (fileSize > 1024 * 1024) {
      return hashFileStream(file, cryptoAlgo)
    }

    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest(cryptoAlgo, arrayBuffer)
    return bufferToHex(hashBuffer)
  } catch (error: any) {
    throw new Error(`Could not hash file ${path}: ${error.message}`)
  }
}

/**
 * Berechnet den kryptografischen Digest eines Datei-Streams.
 *
 * @param file - Die Quelldatei, deren Inhalt als Stream gelesen und gehasht wird
 * @param algorithm - Der Web-Crypto-Algorithmusname (z. B. `SHA-256`, `MD5`)
 * @returns Der Digest als kleingeschriebene Hexadezimalzeichenkette
 */
async function hashFileStream(file: Bun.File, algorithm: string): Promise<string> {
  const hash = await crypto.subtle.digest(algorithm, file.stream())
  return bufferToHex(hash)
}

/**
 * Erzeugt einen HMAC (Message Authentication Code) für den übergebenen Text mit dem angegebenen Algorithmus.
 *
 * @param str - Die Eingabetext-Nachricht, für die der HMAC berechnet werden soll
 * @param key - Der geheime Schlüssel als String, der zum Signieren verwendet wird
 * @param algorithm - Hash-Algorithmus: `md5`, `sha1`, `sha256` oder `sha512` (Standard: `sha256`)
 * @returns Den HMAC als kleingeschriebene Hexadezimalzeichenkette
 * @throws Error - Wenn `algorithm` nicht unterstützt wird
 */
export async function hmac(str: string, key: string, algorithm: string = 'sha256'): Promise<string> {
  const algo = algorithm.toLowerCase()
  const cryptoAlgo = algorithmMap[algo]

  if (!cryptoAlgo) {
    throw new Error(`Unsupported algorithm: ${algorithm}. Use md5, sha1, sha256, or sha512.`)
  }

  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const data = encoder.encode(str)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: cryptoAlgo } },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return bufferToHex(signature)
}

/**
 * Prüft, ob der Hash einer Zeichenkette mit einem erwarteten Hash übereinstimmt.
 *
 * @param str - Die Eingabezeichenkette, deren Hash berechnet werden soll
 * @param expectedHash - Erwarteter Hash als Hex-String (Groß-/Kleinschreibung wird ignoriert)
 * @param algorithm - Zu verwendender Algorithmus; unterstützt: `md5`, `sha1`, `sha256`, `sha512`
 * @returns `true` wenn der berechnete Hash mit `expectedHash` übereinstimmt, `false` sonst
 */
export async function verifyHash(str: string, expectedHash: string, algorithm: string = 'sha256'): Promise<boolean> {
  const actualHash = await hash(str, algorithm)
  // Normalize to lowercase for comparison
  return actualHash.toLowerCase() === expectedHash.toLowerCase()
}

/**
 * Konvertiert einen ArrayBuffer in eine hexadezimale Zeichenkette.
 *
 * @param buffer - Der zu konvertierende ArrayBuffer (Bytefolge).
 * @returns Eine hexadezimale Darstellung der Bytes in Kleinbuchstaben, zwei Zeichen pro Byte.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const hex: string[] = []
  for (const byte of bytes) {
    hex.push(byte.toString(16).padStart(2, '0'))
  }
  return hex.join('')
}

/**
 * Erzeugt synchron einen Hex-Hash eines kurzen Textes mit dem angegebenen Algorithmus.
 *
 * Für kleine Eingaben als synchrone Komfortfunktion gedacht; nicht für große Daten oder Streaming.
 *
 * @param str - Der Eingabetext, dessen Hash berechnet werden soll
 * @param algorithm - Der zu verwendende Algorithmus; gültige Werte: `md5`, `sha1`, `sha256`, `sha512` (Standard: `sha256`)
 * @returns Der Hash als hexadezimale, kleingeschriebene Zeichenkette
 * @throws Wenn ein nicht unterstützter Algorithmus angegeben wird
 */
export function hashSync(str: string, algorithm: string = 'sha256'): string {
  // For sync version, we use a simple implementation
  // This is NOT cryptographically secure for large data
  const data = new TextEncoder().encode(str)
  const algo = algorithm.toLowerCase()

  // Simple hash implementations for sync use
  if (algo === 'md5') {
    return simpleMD5(data)
  } else if (algo === 'sha1') {
    return simpleSHA1(data)
  } else if (algo === 'sha256') {
    return simpleSHA256(data)
  } else if (algo === 'sha512') {
    return simpleSHA512(data)
  } else {
    throw new Error(`Unsupported algorithm: ${algorithm}`)
  }
}

// Sync hash implementations using node:crypto
import { createHash } from 'node:crypto'

/**
 * Erzeugt den MD5-Hash der übergebenen Byte-Daten und liefert ihn hexadezimal kodiert.
 *
 * @param data - Eingabedaten als UTF-8-codierte Bytes (oder beliebiges Byte-Array)
 * @returns Der MD5-Digest von `data` als kleingeschriebene Hex-Zeichenkette
 */
function simpleMD5(data: Uint8Array): string {
  return createHash('md5').update(data).digest('hex')
}

/**
 * Berechnet den SHA-1-Hash der Eingabedaten als Hex-String.
 *
 * @returns Der hexadezimale SHA-1-Digest von `data` in Kleinbuchstaben
 */
function simpleSHA1(data: Uint8Array): string {
  return createHash('sha1').update(data).digest('hex')
}

/**
 * Erzeugt den SHA-256-Hash eines Byte-Arrays als hexadezimale Zeichenkette.
 *
 * @param data - Die Eingabebytes, die gehasht werden sollen
 * @returns Der SHA-256-Digest als hexadezimale Zeichenkette in Kleinbuchstaben
 */
function simpleSHA256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Erzeugt den SHA-512-Hash der gegebenen Daten als hexadezimale Zeichenkette.
 *
 * @param data - Die zu hashenden Rohbytes
 * @returns Der SHA-512-Hash von `data` als hexadezimale Zeichenkette (Kleinbuchstaben)
 */
function simpleSHA512(data: Uint8Array): string {
  return createHash('sha512').update(data).digest('hex')
}
