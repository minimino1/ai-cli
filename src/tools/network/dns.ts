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
 * Löst DNS-Einträge für eine Domain und liefert strukturierte Ergebnisse.
 *
 * @param domain - Die zu überprüfende Domain
 * @param type - Gewünschter DNS-Recordtyp (z. B. `'A'`, `'MX'`, `'TXT'`); Standard ist `'A'`
 * @returns Ein Objekt mit dem abgefragten `domain`-Namen, einem Array von `DNSRecord` (inklusive `ttl` und bei MX-Einträgen `priority`) und `queryTime` in Millisekunden
 * @throws Wirft den ursprünglichen Fehler, wenn die native DNS-Auflösung mit einem anderen Fehler als `ENOTFOUND` oder `EAI_AGAIN` fehlschlägt
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
 * Führt eine DNS-over-HTTPS-Abfrage durch und versucht dabei nacheinander Cloudflare und Google als Fallback-Anbieter.
 *
 * @param domain - Der zu überprüfende Domainname
 * @param type - Gewünschter DNS-Recordtyp (z. B. `A`, `MX`, `PTR`)
 * @returns Ein Objekt mit dem abgefragten Domainnamen, den gefundenen DNS-Einträgen und der Abfragezeit in Millisekunden
 * @throws Error wenn alle DoH-Anbieter fehlschlagen (Nachricht: `DNS lookup failed for ${domain} (${type})`)
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
 * Führt eine Reverse-DNS-Abfrage (PTR) für eine IPv4- oder IPv6-Adresse durch.
 *
 * Die Funktion validiert die übergebene IP und löst anschließend die zugehörige PTR-Domain auf.
 *
 * @param ip - Die IPv4- oder IPv6-Adresse, für die die Reverse-Abfrage durchgeführt wird
 * @returns Ein `DNSResponse` mit den gefundenen PTR-Einträgen für die Reverse-Domain
 * @throws Error wenn `ip` kein gültiges IPv4- oder IPv6-Format hat
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
 * Prüft die DNS-Verbreitung eines Domain-Namens bei mehreren öffentlichen Resolvern.
 *
 * Führt für jeden konfigurierten Resolver eine DoH-Abfrage durch und sammelt die jeweiligen Antworten oder Fehlermeldungen.
 *
 * @returns Eine Liste mit Ergebnissen pro Resolver. Jeder Eintrag enthält:
 * - `resolver`: der Anzeigename des Resolvers
 * - `response`: das `DNSResponse`-Objekt (bei Fehlern enthält `records` ein leeres Array und `queryTime` ist `0`)
 * - `error` (optional): die Fehlermeldung, falls die Abfrage fehlgeschlagen ist
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
 * Führt eine DNS-over-HTTPS-Abfrage gegen einen spezifischen Resolver durch und gibt die gefilterten Antworten zurück.
 *
 * @param server - Hostname oder IP des DoH-Servers (verwendet als https://{server}/dns-query)
 * @returns Ein `DNSResponse` mit `domain`, nur den Antworten vom angeforderten `type` in `records` und `queryTime` in Millisekunden
 * @throws Error wenn die HTTP-Antwort nicht-OK ist oder die Abfrage/Antwortverarbeitung fehlschlägt; die Fehlermeldung enthält Details
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
 * Wandelt einen numerischen DNS-RR-Typcode in seinen stringbasierten Typnamen um.
 *
 * @param type - Numerischer DNS-RR-Typcode (z. B. `1` für `A`, `28` für `AAAA`)
 * @returns Den typischen DNS-Typnamen (z. B. `A`, `MX`) oder `'UNKNOWN'`, wenn der Code nicht bekannt ist
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
 * Erzeugt eine menschenlesbare, mehrzeilige Darstellung einer DNS-Antwort.
 *
 * @param response - Die zu formatierende DNS-Antwort
 * @returns Eine mehrzeilige Zeichenkette mit Domain, Abfragezeit, Anzahl gefundener Einträge und für jeden Eintrag eine Zeile mit Typ, optionaler Priorität, optionaler TTL und dem Wert
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
