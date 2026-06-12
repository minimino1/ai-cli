// Port scanner
// TCP port scanning with service detection

export interface PortResult {
  port: number
  open: boolean
  service?: string
  version?: string
  latency?: number
  error?: string
}

// Common ports and their typical services
const commonPorts: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  27017: 'MongoDB',
  6379: 'Redis',
  9200: 'Elasticsearch',
  9600: 'Solr',
}

/**
 * Scan a single port
 */
export async function checkPort(host: string, port: number, timeout: number = 5000): Promise<PortResult> {
  const startTime = Date.now()

  try {
    const socket = Bun.connect({
      hostname: host,
      port,
      timeout,
    })

    if (socket) {
      socket.close()
      const latency = Date.now() - startTime
      return {
        port,
        open: true,
        service: commonPorts[port],
        latency,
      }
    }

    return { port, open: false }
  } catch (error: any) {
    return { port, open: false, error: error.message }
  }
}

/**
 * Scan a range of ports
 */
export async function scan(
  host: string,
  startPort: number,
  endPort: number,
  options: { timeout?: number; concurrency?: number } = {}
): Promise<PortResult[]> {
  const { timeout = 5000, concurrency = 50 } = options
  const results: PortResult[] = []
  const ports = []

  for (let port = startPort; port <= endPort; port++) {
    ports.push(port)
  }

  // Scan in batches for concurrency control
  const batches: number[][] = []
  for (let i = 0; i < ports.length; i += concurrency) {
    batches.push(ports.slice(i, i + concurrency))
  }

  for (const batch of batches) {
    const promises = batch.map(port => checkPort(host, port, timeout))
    const batchResults = await Promise.all(promises)
    results.push(...batchResults)
  }

  return results.sort((a, b) => a.port - b.port)
}

/**
 * Scan common ports only
 */
export async function scanCommon(host: string, options: { timeout?: number } = {}): Promise<PortResult[]> {
  const ports = Object.keys(commonPorts).map(Number).sort((a, b) => a - b)
  const results: PortResult[] = []

  for (const port of ports) {
    const result = await checkPort(host, port, options.timeout)
    results.push(result)
  }

  return results
}

/**
 * Format port scan results
 */
export function formatPortScan(results: PortResult[], verbose: boolean = false): string {
  const openPorts = results.filter(r => r.open)
  const closedPorts = results.filter(r => !r.open && !r.error)
  const errorPorts = results.filter(r => r.error)

  const lines: string[] = []
  lines.push(`Port scan for ${results[0] ? results[0].port.toString().split('-')[0] : 'host'}`)
  lines.push(`Total ports scanned: ${results.length}`)
  lines.push(`Open ports: ${openPorts.length}`)
  lines.push(`Closed ports: ${closedPorts.length}`)
  lines.push(`Errors: ${errorPorts.length}`)
  lines.push('')

  if (openPorts.length > 0) {
    lines.push('Open ports:')
    for (const result of openPorts) {
      let line = `  ${String(result.port).padStart(5)}  ${result.service || 'unknown'}`
      if (verbose && result.latency) {
        line += `  (${result.latency}ms)`
      }
      lines.push(line)
    }
    lines.push('')
  }

  if (verbose && errorPorts.length > 0) {
    lines.push('Errors:')
    for (const result of errorPorts) {
      lines.push(`  ${String(result.port).padStart(5)}  ${result.error}`)
    }
  }

  return lines.join('\n')
}

/**
 * Quick port check (single port)
 */
export async function quickCheck(host: string, port: number, timeout: number = 2000): Promise<boolean> {
  const result = await checkPort(host, port, timeout)
  return result.open
}

/**
 * Get service name from port number
 */
export function getService(port: number): string | undefined {
  return commonPorts[port]
}

/**
 * Add custom port/service mapping
 */
export function registerService(port: number, service: string): void {
  commonPorts[port] = service
}
