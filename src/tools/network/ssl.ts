// SSL/TLS certificate tools
// Check certificate info, expiry, chain verification

export interface CertificateInfo {
  subject: string
  issuer: string
  serialNumber: string
  validFrom: Date
  validTo: Date
  daysRemaining: number
  subjectAltNames: string[]
  publicKeyAlgorithm: string
  signatureAlgorithm: string
  version: string
  fingerprint: string
  isExpired: boolean
  isValid: boolean
}

/**
 * Check SSL certificate for a host
 */
export async function checkCert(host: string, port: number = 443): Promise<CertificateInfo> {
  try {
    // Use Bun's TLS socket to get certificate
    const tls = await import('tls')

    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host,
          port,
          rejectUnauthorized: false, // We want to inspect even invalid certs
        },
        () => {
          const cert = socket.getPeerCertificate(true)

          socket.destroy()

          const info = parseCertificate(cert, host)
          resolve(info)
        }
      )

      socket.on('error', (error: Error) => {
        reject(new Error(`SSL connection failed: ${error.message}`))
      })

      socket.setTimeout(10000, () => {
        socket.destroy()
        reject(new Error('SSL connection timeout'))
      })
    })
  } catch (error: any) {
    throw new Error(`Could not retrieve certificate for ${host}:${port}: ${error.message}`)
  }
}

/**
 * Parse raw certificate object into structured info
 */
function parseCertificate(cert: any, host: string): CertificateInfo {
  const now = new Date()

  const subject = formatDN(cert.subject)
  const issuer = formatDN(cert.issuer)

  const validFrom = new Date(cert.valid_from * 1000)
  const validTo = new Date(cert.valid_to * 1000)
  const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Get fingerprint (SHA-256)
  const fingerprint = cert.fingerprint256 || cert.fingerprint || 'N/A'

  // Subject Alternative Names
  const subjectAltNames: string[] = []
  if (cert.extended_key_usage) {
    subjectAltNames.push(...cert.extended_key_usage)
  }
  if (cert.subjectaltname) {
    const sanNames = cert.subjectaltname.split(',').map(s => s.trim().replace(/^DNS:/, ''))
    subjectAltNames.push(...sanNames)
  }

  // Remove duplicates
  const uniqueSANs = [...new Set(subjectAltNames)]

  return {
    subject,
    issuer,
    serialNumber: cert.serialNumber || 'N/A',
    validFrom,
    validTo,
    daysRemaining,
    subjectAltNames: uniqueSANs,
    publicKeyAlgorithm: cert.publicKeyAlgorithm || 'N/A',
    signatureAlgorithm: cert.signatureAlgorithm || 'N/A',
    version: `v${cert.version}`,
    fingerprint,
    isExpired: daysRemaining < 0,
    isValid: daysRemaining >= 0 && cert.valid_to > Date.now() / 1000,
  }
}

/**
 * Format Distinguished Name for display
 */
function formatDN(dn: Record<string, string> | string): string {
  if (typeof dn === 'string') {
    return dn
  }

  const parts: string[] = []
  for (const [key, value] of Object.entries(dn)) {
    if (value) {
      parts.push(`${key}=${value}`)
    }
  }
  return parts.join(', ')
}

/**
 * Check certificate expiry only (fast)
 */
export async function checkExpiry(host: string, port: number = 443): Promise<{
  host: string
  daysRemaining: number
  expires: Date
  isExpired: boolean
  isExpiringSoon: boolean
}> {
  const cert = await checkCert(host, port)

  return {
    host,
    daysRemaining: cert.daysRemaining,
    expires: cert.validTo,
    isExpired: cert.isExpired,
    isExpiringSoon: cert.daysRemaining < 30 && !cert.isExpired,
  }
}

/**
 * Verify certificate chain (basic check)
 */
export async function verifyChain(host: string, port: number = 443): Promise<{
  valid: boolean
  chain: Array<{ subject: string; issuer: string; valid: boolean }>
  errors: string[]
}> {
  try {
    const tls = await import('tls')

    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host,
          port,
          rejectUnauthorized: true, // Enforce chain validation
        },
        () => {
          const cert = socket.getPeerCertificate(true)
          socket.destroy()

          const chain: Array<{ subject: string; issuer: string; valid: boolean }> = []

          // Build chain from cert to root
          let current: any = cert
          while (current) {
            chain.push({
              subject: formatDN(current.subject),
              issuer: formatDN(current.issuer),
              valid: current.valid_to > Date.now() / 1000,
            })
            // In a real implementation, we'd traverse the chain properly
            // This is simplified
            break // Only check leaf cert for now
          }

          resolve({
            valid: true,
            chain,
            errors: [],
          })
        }
      )

      socket.on('error', (error: Error) => {
        resolve({
          valid: false,
          chain: [],
          errors: [error.message],
        })
      })

      socket.setTimeout(10000, () => {
        socket.destroy()
        reject(new Error('SSL connection timeout'))
      })
    })
  } catch (error: any) {
    return {
      valid: false,
      chain: [],
      errors: [error.message],
    }
  }
}

/**
 * Compare two certificates
 */
export async function compareCerts(host1: string, host2: string, port: number = 443): Promise<{
  host1: string
  host2: string
  sameIssuer: boolean
  sameExpiry: boolean
  daysDiff: number
  issuer1: string
  issuer2: string
  expires1: Date
  expires2: Date
}> {
  const cert1 = await checkCert(host1, port)
  const cert2 = await checkCert(host2, port)

  return {
    host1,
    host2,
    sameIssuer: cert1.issuer === cert2.issuer,
    sameExpiry: cert1.validTo.getTime() === cert2.validTo.getTime(),
    daysDiff: Math.round((cert2.validTo.getTime() - cert1.validTo.getTime()) / (1000 * 60 * 60 * 24)),
    issuer1: cert1.issuer,
    issuer2: cert2.issuer,
    expires1: cert1.validTo,
    expires2: cert2.validTo,
  }
}

/**
 * Format certificate info for display
 */
export function formatCertInfo(cert: CertificateInfo, verbose: boolean = false): string {
  const lines: string[] = []

  lines.push(`Certificate for: ${cert.subject.split('=')[1] || cert.subject}`)
  lines.push(`Issuer: ${cert.issuer}`)
  lines.push(`Valid from: ${cert.validFrom.toISOString().split('T')[0]}`)
  lines.push(`Valid to: ${cert.validTo.toISOString().split('T')[0]}`)
  lines.push(`Days remaining: ${cert.daysRemaining}`)
  lines.push(`Status: ${cert.isExpired ? 'EXPIRED' : cert.isExpiringSoon ? 'EXPIRING SOON' : 'VALID'}`)
  lines.push(`Fingerprint (SHA-256): ${cert.fingerprint}`)

  if (verbose) {
    lines.push('')
    lines.push('Subject Alternative Names:')
    if (cert.subjectAltNames.length > 0) {
      for (const san of cert.subjectAltNames) {
        lines.push(`  - ${san}`)
      }
    } else {
      lines.push('  (none)')
    }

    lines.push('')
    lines.push(`Public Key Algorithm: ${cert.publicKeyAlgorithm}`)
    lines.push(`Signature Algorithm: ${cert.signatureAlgorithm}`)
    lines.push(`Version: ${cert.version}`)
    lines.push(`Serial Number: ${cert.serialNumber}`)
  }

  return lines.join('\n')
}
