// Base64 encode/decode utilities
// Uses Bun's built-in atob/btoa or Buffer

/**
 * Kodiert einen UTF‑8-String in Base64.
 *
 * @param str - Der Eingabe-String im UTF‑8-Format
 * @returns Die Base64-kodierte Darstellung von `str`
 */
export function encode(str: string): string {
  // Use Buffer for proper UTF-8 handling
  return Buffer.from(str, 'utf-8').toString('base64')
}

/**
 * Wandelt einen Base64-kodierten String in einen UTF‑8-String um.
 *
 * @param str - Der Base64-kodierte Eingabestring.
 * @returns Den dekodierten UTF‑8-String.
 * @throws Error - Falls `str` kein gültiger Base64-String ist; die Fehlermeldung enthält die Originalnachricht.
 */
export function decode(str: string): string {
  try {
    return Buffer.from(str, 'base64').toString('utf-8')
  } catch (error: any) {
    throw new Error(`Invalid base64: ${error.message}`)
  }
}

/**
 * Konvertiert eine Datei auf dem Dateisystem in eine Base64-kodierte Zeichenkette.
 *
 * @param path - Pfad zur zu lesenden Datei
 * @returns Die Base64-kodierte Darstellung des Dateiinhalts
 * @throws Error Wenn die Datei nicht gelesen werden kann; die Fehlermeldung enthält den Pfad und die ursprüngliche Fehlermeldung
 */
export async function encodeFile(path: string): Promise<string> {
  try {
    const fs = Bun.file(path)
    const arrayBuffer = await fs.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    return Buffer.from(bytes).toString('base64')
  } catch (error: any) {
    throw new Error(`Could not read file ${path}: ${error.message}`)
  }
}

/**
 * Schreibt die aus einer Base64-kodierten Zeichenkette dekodierten Bytes in eine Datei.
 *
 * @param base64 - Base64-kodierte Daten, die in die Datei geschrieben werden sollen
 * @param outputPath - Zieldateipfad, unter dem die dekodierten Bytes abgelegt werden
 * @returns Eine Statusmeldung im Format `Wrote <byteLength> bytes to <outputPath>`
 * @throws Error wenn das Dekodieren oder Schreiben fehlschlägt; die Fehlermeldung beginnt mit `Could not write file <outputPath>:`
 */
export async function decodeFile(base64: string, outputPath: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64')
    await Bun.write(outputPath, buffer)
    return `Wrote ${buffer.length} bytes to ${outputPath}`
  } catch (error: any) {
    throw new Error(`Could not write file ${outputPath}: ${error.message}`)
  }
}

/**
 * Prüft, ob eine Zeichenkette gültige Base64-kodierte Daten darstellt.
 *
 * Führt eine formale Musterprüfung und einen Dekodier-Versuch durch, um ungültige Eingaben auszuschließen.
 *
 * @param str - Die zu prüfende Zeichenkette
 * @returns `true` wenn `str` gültiges Base64 ist, `false` sonst
 */
export function isBase64(str: string): boolean {
  // Base64 regex (standard and URL-safe)
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
  if (!str) return false
  if (!base64Regex.test(str)) return false

  // Additional check: try to decode
  try {
    Buffer.from(str, 'base64')
    return true
  } catch {
    return false
  }
}

/**
 * Konvertiert einen UTF-8-String in eine URL-sichere Base64-Darstellung.
 *
 * @param str - Eingabetext, der in Base64 kodiert werden soll
 * @returns Die Base64-codierte, URL-sichere Darstellung von `str` ohne '='-Padding
 */
export function encodeURLSafe(str: string): string {
  return encode(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Wandelt eine URL-sichere Base64-Zeichenkette in die ursprüngliche UTF‑8-Zeichenkette um.
 *
 * Vor der Dekodierung werden URL-sichere Zeichen (`-`, `_`) in Standard-Base64-Zeichen (`+`, `/`) zurückgewandelt und bei Bedarf das fehlende `=`-Padding ergänzt.
 *
 * @param str - Die Eingabe im URL-sicheren Base64-Format (optionale Padding-Entfernung möglich)
 * @returns Die decodierte UTF‑8-Zeichenkette
 */
export function decodeURLSafe(str: string): string {
  // Replace URL-safe chars back to standard base64 and pad
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = padded.length % 4
  const paddedStr = padding === 0 ? padded : padded + '='.repeat(4 - padding)
  return decode(paddedStr)
}
