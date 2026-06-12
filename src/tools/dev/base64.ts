// Base64 encode/decode utilities
// Uses Bun's built-in atob/btoa or Buffer

/**
 * Encode string to base64 (UTF-8)
 */
export function encode(str: string): string {
  // Use Buffer for proper UTF-8 handling
  return Buffer.from(str, 'utf-8').toString('base64')
}

/**
 * Decode base64 to UTF-8 string
 */
export function decode(str: string): string {
  try {
    return Buffer.from(str, 'base64').toString('utf-8')
  } catch (error: any) {
    throw new Error(`Invalid base64: ${error.message}`)
  }
}

/**
 * Encode a file to base64
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
 * Decode base64 to file
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
 * Check if a string is valid base64
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
 * Encode to base64 URL-safe variant (replace +/ with -_)
 */
export function encodeURLSafe(str: string): string {
  return encode(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode base64 URL-safe variant
 */
export function decodeURLSafe(str: string): string {
  // Replace URL-safe chars back to standard base64 and pad
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = padded.length % 4
  const paddedStr = padding === 0 ? padded : padded + '='.repeat(4 - padding)
  return decode(paddedStr)
}
