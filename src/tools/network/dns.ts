// DNS lookup using Bun.dns
// Supports: A, AAAA, MX, NS, TXT, CNAME, SOA, PTR
// DNS-over-HTTPS fallback

export type DNSRecordType = 'A' | 'AAAA' | 'MX' | 'NS' | 'TXT' | 'CNAME' | 'SOA' | 'PTR'

export interface DNSRecord {
  type: DNSRecordType
  value: string
  ttl?: number
  priority?: number // for MX
}

export interface DNSResponse {
  domain: string
  records: DNSRecord[]
  queryTime: number
}

// DNS-over-HTTPS endpoints
const DOH_ENDPOINTS = {
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  google: 'https://dns.google/resolve',
}

/**
 * Resolve DNS records
 */
export async function resolve(domain: string, type: DNSRecordType = 'A'): Promise<DNSResponse> {
  const startTime = Date.now()

  try {
    // Try Bun's built-in DNS first
    const result = await Bun.dns[type](domain)
    const queryTime = Date.now() - startTime

    const records: DNSRecord[] = []

    if (type === 'MX') {
      for (const record of result) {
        records.push({
          type: 'MX',
          value: record.exchange,
          priority: record.priority,
          ttl: record.ttl,
        })
      }
    } else if (type === 'TXT') {
      for (const record of result) {
        records.push({
          type: 'TXT',
          value: record.text,
          ttl: record.ttl,
        })
      }
    } else {
      for (const record of result) {
        records.push({
          type,
          value: type === 'A' || type === 'AAAA' ? record.address : record,
          ttl: record.ttl,
        })
      }
    }

    return { domain, records, queryTime }
  } catch (error: any) {
    // If Bun DNS fails, try DNS-over-HTTPS
    if (error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
      return await resolveDOH(domain, type)
    }
    throw error
  }
}

/**
 * DNS-over-HTTPS lookup (fallback)
 */
async function resolveDOH(domain: string, type: DNSRecordType): Promise<DNSResponse> {
  const startTime = Date.now()

  // Try Cloudflare first, then Google
  for (const provider of ['cloudflare', 'google'] as const) {
    try {
      const endpoint = DOH_ENDPOINTS[provider]
      const url = new URL(endpoint)
      url.searchParams.set('name', domain)
      url.searchParams.set('type', type)

      const response = await fetch(url.toString(), {
        headers: {
          accept: 'application/dns-json',
        },
      })

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      const queryTime = Date.now() - startTime

      const records: DNSRecord[] = []

      if (data.Answer) {
        for (const answer of data.Answer) {
          const recordType = answer.type as number
          const typeName = dnsTypeToString(recordType)

          if (typeName === type) {
            records.push({
              type: type as DNSRecordType,
              value: answer.data,
              ttl: answer.TTL,
              priority: answer.priority,
            })
          }
        }
      }

      return { domain, records, queryTime }
    } catch {
      continue
    }
  }

  throw new Error(`DNS lookup failed for ${domain} (${type})`)
}

/**
 * Reverse DNS lookup (PTR)
 */
export async function reverseLookup(ip: string): Promise<DNSResponse> {
  // Validate IP format
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    throw new Error(`Invalid IP address: ${ip}`)
  }

  // For IPv4, reverse the octets and add .in-addr.arpa
  // For IPv6, expand and reverse nibbles with .ip6.arpa
  let ptrDomain: string
  if (ip.includes(':')) {
    // IPv6
    const expanded = ip.split(':').map(part => part.padStart(4, '0')).join(':')
    const nibbles = expanded.replace(/:/g, '').split('').reverse()
    ptrDomain = `${nibbles.join('.')}.ip6.arpa`
  } else {
    // IPv4
    const octets = ip.split('.').reverse()
    ptrDomain = `${octets.join('.')}.in-addr.arpa`
  }

  return resolve(ptrDomain, 'PTR')
}

/**
 * Check DNS propagation across multiple resolvers
 */
export async function checkPropagation(domain: string, type: DNSRecordType = 'A'): Promise<Array<{ resolver: string; response: DNSResponse; error?: string }>> {
  const resolvers = [
    { name: 'Cloudflare', server: '1.1.1.1' },
    { name: 'Google', server: '8.8.8.8' },
    { name: 'OpenDNS', server: '208.67.222.222' },
    { name: 'Quad9', server: '9.9.9.9' },
  ]

  const results: Array<{ resolver: string; response: DNSResponse; error?: string }> = []

  for (const resolver of resolvers) {
    try {
      // Use custom DNS server via Bun.dns if supported
      // Note: Bun.dns currently uses system resolver, so we'll use DOH as fallback
      const response = await resolveDOHWithResolver(domain, type, resolver.server)
      results.push({ resolver: resolver.name, response })
    } catch (error: any) {
      results.push({ resolver: resolver.name, response: { domain, records: [], queryTime: 0 }, error: error.message })
    }
  }

  return results
}

/**
 * Resolve using specific DNS-over-HTTPS resolver
 */
async function resolveDOHWithResolver(domain: string, type: DNSRecordType, server: string): Promise<DNSResponse> {
  const startTime = Date.now()

  // Build DOH URL with custom server
  const url = new URL(`https://${server}/dns-query`)
  url.searchParams.set('name', domain)
  url.searchParams.set('type', type.toString())

  try {
    const response = await fetch(url.toString(), {
      headers: { accept: 'application/dns-json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const queryTime = Date.now() - startTime

    const records: DNSRecord[] = []

    if (data.Answer) {
      for (const answer of data.Answer) {
        const recordType = dnsTypeToString(answer.type)
        if (recordType === type) {
          records.push({
            type: type as DNSRecordType,
            value: answer.data,
            ttl: answer.TTL,
            priority: answer.priority,
          })
        }
      }
    }

    return { domain, records, queryTime }
  } catch (error: any) {
    throw new Error(`DO-H lookup failed: ${error.message}`)
  }
}

/**
 * Convert DNS type number to string
 */
function dnsTypeToString(type: number): string {
  const types: Record<number, string> = {
    1: 'A',
    2: 'NS',
    5: 'CNAME',
    6: 'SOA',
    12: 'PTR',
    15: 'MX',
    16: 'TXT',
    28: 'AAAA',
    33: 'SRV',
    41: 'OPT',
    43: 'DS',
    44: 'SSHFP',
    46: 'RRSIG',
    47: 'NSEC',
    48: 'DNSKEY',
    49: 'DHCID',
    50: 'NSEC3',
    51: 'NSEC3PARAM',
    52: 'TLSA',
    53: 'SMIMEA',
    55: 'HIP',
    59: 'CDS',
    60: 'CDNSKEY',
    62: 'CSYNC',
    63: 'ZONEMD',
    64: 'SVCB',
    65: 'HTTPS',
    108: 'EUI48',
    109: 'EUI64',
  }
  return types[type] || 'UNKNOWN'
}

/**
 * Format DNS response for display
 */
export function formatDNSResponse(response: DNSResponse): string {
  const lines: string[] = []
  lines.push(`DNS lookup for: ${response.domain}`)
  lines.push(`Query time: ${response.queryTime}ms`)
  lines.push(`Found ${response.records.length} record(s)`)

  if (response.records.length > 0) {
    lines.push('')
    for (const record of response.records) {
      let line = `  ${record.type}`
      if (record.priority) {
        line += ` (priority: ${record.priority})`
      }
      if (record.ttl) {
        line += ` [TTL: ${record.ttl}s]`
      }
      line += `: ${record.value}`
      lines.push(line)
    }
  }

  return lines.join('\n')
}
