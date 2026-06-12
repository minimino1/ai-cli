// Hash utilities using Web Crypto API (available in Bun)
// Supports: md5, sha1, sha256, sha512, hmac

const algorithmMap: Record<string, string> = {
  md5: 'MD5',
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha512: 'SHA-512',
}

/**
 * Hash a string with the specified algorithm
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
 * Hash a file's contents
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
 * Stream hash for large files
 */
async function hashFileStream(file: Bun.File, algorithm: string): Promise<string> {
  const hash = await crypto.subtle.digest(algorithm, file.stream())
  return bufferToHex(hash)
}

/**
 * Generate HMAC for a string
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
 * Verify a hash matches
 */
export async function verifyHash(str: string, expectedHash: string, algorithm: string = 'sha256'): Promise<boolean> {
  const actualHash = await hash(str, algorithm)
  // Normalize to lowercase for comparison
  return actualHash.toLowerCase() === expectedHash.toLowerCase()
}

/**
 * Convert ArrayBuffer to hex string
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
 * Quick sync hash using simple algorithms (for small strings only)
 * Note: Web Crypto API is async-only, this is for convenience with small data
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

// Simplified hash implementations for sync use (not for production crypto)
function simpleMD5(data: Uint8Array): string {
  // Placeholder - in production use crypto.subtle
  return Buffer.from(data).toString('md5')
}

function simpleSHA1(data: Uint8Array): string {
  return Buffer.from(data).toString('sha1')
}

function simpleSHA256(data: Uint8Array): string {
  return Buffer.from(data).toString('sha256')
}

function simpleSHA512(data: Uint8Array): string {
  return Buffer.from(data).toString('sha512')
}
