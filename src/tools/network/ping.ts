// Ping and latency testing
// ICMP ping, TCP ping, HTTP ping, traceroute

/**
 * ICMP ping using Bun's built-in ping
 */
export async function ping(host: string, count: number = 5, timeout: number = 5000): Promise<{
  host: string
  sent: number
  received: number
  avgLatency: number
  minLatency: number
  maxLatency: number
  packetLoss: number
  results: Array<{ seq: number; latency: number; error?: string }>
}> {
  const results: Array<{ seq: number; latency: number; error?: string }> = []
  let received = 0
  let totalLatency = 0
  let minLatency = Infinity
  let maxLatency = 0

  for (let i = 1; i <= count; i++) {
    try {
      const startTime = Date.now()
      // Bun doesn't have direct ICMP ping, use TCP connect as approximation
      // or use system ping command
      const success = await tcpPing(host, 80, { timeout })
      const latency = Date.now() - startTime

      if (success) {
        received++
        totalLatency += latency
        minLatency = Math.min(minLatency, latency)
        maxLatency = Math.max(maxLatency, latency)
        results.push({ seq: i, latency })
      } else {
        results.push({ seq: i, latency: 0, error: 'Request timeout' })
      }
    } catch (error: any) {
      results.push({ seq: i, latency: 0, error: error.message })
    }

    // Wait before next ping (except last)
    if (i < count) {
      await sleep(1000)
    }
  }

  const packetLoss = ((count - received) / count) * 100
  const avgLatency = received > 0 ? totalLatency / received : 0

  return {
    host,
    sent: count,
    received,
    avgLatency: Math.round(avgLatency * 10) / 10,
    minLatency: minLatency === Infinity ? 0 : minLatency,
    maxLatency,
    packetLoss: Math.round(packetLoss * 10) / 10,
    results,
  }
}

/**
 * TCP connect ping (test if port is open)
 */
export async function tcpPing(host: string, port: number, options: { timeout?: number } = {}): Promise<boolean> {
  const timeout = options.timeout || 5000

  try {
    // Use Bun's socket connect
    const socket = Bun.connect({
      hostname: host,
      port: port,
      timeout,
    })

    if (socket) {
      socket.close()
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * HTTP ping (measure HTTP response time)
 */
export async function httpPing(url: string, options: { timeout?: number; method?: string } = {}): Promise<{
  url: string
  reachable: boolean
  status?: number
  latency: number
  error?: string
}> {
  const timeout = options.timeout || 5000
  const method = options.method || 'HEAD'

  try {
    const startTime = Date.now()
    const response = await Bun.fetch(url, {
      method,
      timeout,
    })
    const latency = Date.now() - startTime

    return {
      url,
      reachable: response.status >= 200 && response.status < 400,
      status: response.status,
      latency,
    }
  } catch (error: any) {
    return {
      url,
      reachable: false,
      latency: 0,
      error: error.message,
    }
  }
}

/**
 * Traceroute - trace network path to host
 * Uses system traceroute command if available
 */
export async function traceroute(host: string, maxHops: number = 30, timeout: number = 3000): Promise<Array<{
  hop: number
  host: string
  latency: number
  error?: string
}>> {
  const results: Array<{ hop: number; host: string; latency: number; error?: string }> = []

  // Try to use system traceroute command
  try {
    const { stdout } = Bun.spawn.sync(['traceroute', '-m', maxHops.toString(), '-w', (timeout / 1000).toString(), host], {
      stdin: 'inherit',
      stdout: 'pipe',
    })

    const lines = stdout.toString().split('\n')
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Parse traceroute output (varies by system)
      // Typical format: hop  host  latency
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 3) {
        const hop = parseInt(parts[0])
        const hostPart = parts[1] || parts[2] || '*'
        const latency = parseFloat(parts[parts.length - 1]) || 0

        results.push({
          hop,
          host: hostPart === '*' ? '*' : hostPart,
          latency,
          error: hostPart === '*' ? 'Request timed out' : undefined,
        })
      }
    }

    return results
  } catch {
    // Fallback: simple TCP-based traceroute simulation
    return await tracerouteTCP(host, maxHops, timeout)
  }
}

/**
 * Simple TCP-based traceroute (fallback)
 */
async function tracerouteTCP(host: string, maxHops: number, timeout: number): Promise<Array<{ hop: number; host: string; latency: number; error?: string }>> {
  const results: Array<{ hop: number; host: string; latency: number; error?: string }> = []

  // Resolve host to IP first
  let targetIP: string
  try {
    const dnsResult = await Bun.dns.a(host)
    targetIP = dnsResult[0]?.address || host
  } catch {
    targetIP = host
  }

  for (let ttl = 1; ttl <= maxHops; ttl++) {
    try {
      const startTime = Date.now()
      // Use raw socket with TTL if available, otherwise approximate
      // Bun doesn't expose raw sockets, so we'll use TCP connect with increasing TTL
      // This is a simplified version

      const socket = Bun.connect({
        hostname: host,
        port: 80,
        timeout,
      })

      if (socket) {
        socket.close()
        const latency = Date.now() - startTime
        results.push({ hop: ttl, host: targetIP, latency })
      } else {
        results.push({ hop: ttl, host: '*', latency: 0, error: 'Request timed out' })
      }
    } catch (error: any) {
      results.push({ hop: ttl, host: '*', latency: 0, error: error.message })
    }

    // Stop if we reached the destination
    if (results[results.length - 1]?.host === targetIP && results[results.length - 1]?.error === undefined) {
      break
    }

    await sleep(500)
  }

  return results
}

/**
 * Format ping results
 */
export function formatPingResults(results: ReturnType<typeof ping>): string {
  const lines: string[] = []
  lines.push(`PING ${results.host}`)
  lines.push('')

  for (const result of results.results) {
    if (result.error) {
      lines.push(`  ${result.seq}: ${result.error}`)
    } else {
      lines.push(`  ${result.seq}: ${result.latency}ms`)
    }
  }

  lines.push('')
  lines.push(`--- ${results.host} ping statistics ---`)
  lines.push(`${results.sent} packets transmitted, ${results.received} received, ${results.packetLoss}% packet loss`)
  if (results.received > 0) {
    lines.push(`rtt min/avg/max = ${results.minLatency}/${results.avgLatency}/${results.maxLatency} ms`)
  }

  return lines.join('\n')
}

/**
 * Format traceroute results
 */
export function formatTracerouteResults(results: ReturnType<typeof traceroute>): string {
  const lines: string[] = []
  lines.push(`traceroute to ${results[0]?.host || 'host'}`)
  lines.push('')

  for (const result of results) {
    if (result.error) {
      lines.push(`  ${String(result.hop).padStart(3)}  *  ${result.error}`)
    } else {
      lines.push(`  ${String(result.hop).padStart(3)}  ${result.host.padEnd(30)}  ${result.latency}ms`)
    }
  }

  return lines.join('\n')
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
