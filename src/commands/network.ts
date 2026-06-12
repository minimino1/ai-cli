// Network commands for ai-cli
// /http, /dns, /ping, /ports, /ssl, /curl

import type { Command, CommandContext, MessagePart } from './types'
import { request, formatResponse as formatHTTPResponse } from '../tools/network/http'
import { resolve as dnsResolve, formatDNSResponse } from '../tools/network/dns'
import { ping as pingHost, traceroute as traceRoute, formatPingResults, formatTracerouteResults } from '../tools/network/ping'
import { scan as portScan, scanCommon as scanCommonPorts, formatPortScan } from '../tools/network/port'
import { checkCert as checkSSLCert, checkExpiry as checkSSLExpiry, verifyChain, formatCertInfo } from '../tools/network/ssl'

/**
 * Parse key=value options from command args
 */
function parseOptions(args: string): { command: string; url: string; options: Record<string, string> } {
  const parts = args.trim().split(/\s+/)
  const command = parts[0]
  const url = parts[1] || ''
  const options: Record<string, string> = {}

  for (let i = 2; i < parts.length; i++) {
    const part = parts[i]
    if (part.startsWith('--')) {
      const key = part.slice(2)
      if (i + 1 < parts.length && !parts[i + 1].startsWith('--')) {
        options[key] = parts[i + 1]
        i++
      } else {
        options[key] = 'true'
      }
    }
  }

  return { command, url, options }
}

/**
 * /http command - HTTP request
 * Usage: /http <method> <url> [--header key=value] [--body <body>] [--timeout <ms>]
 */
export const httpCommand: Command = {
  name: 'http',
  description: 'Make HTTP request (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)',
  aliases: ['curl'],
  args: ['<method> <url> [--header key=val] [--body <body>] [--timeout <ms>] [--verbose]'],
  run: async (args, context) => {
    const parts = args.trim().split(/\s+/)
    if (parts.length < 2) {
      return [{ type: 'text', text: 'Usage: /http <method> <url> [--header key=val] [--body <body>] [--timeout <ms>] [--verbose]\nExample: /http GET https://api.example.com/data --header "Accept=application/json" --verbose' }]
    }

    const method = parts[0].toUpperCase()
    const url = parts[1]
    const options: Parameters<typeof request>[2] = {}
    let body: string | undefined
    let verbose = false

    // Parse flags
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i]
      if (part === '--verbose') {
        verbose = true
      } else if (part === '--header' && i + 1 < parts.length) {
        const headerParts = parts[i + 1].split('=')
        if (headerParts.length === 2) {
          options.headers = { ...options.headers, [headerParts[0]]: headerParts[1] }
          i++
        }
      } else if (part === '--body' && i + 1 < parts.length) {
        body = parts[i + 1]
        i++
      } else if (part === '--timeout' && i + 1 < parts.length) {
        options.timeout = parseInt(parts[i + 1])
        i++
      } else if (part === '--auth' && i + 1 < parts.length) {
        const [username, password] = parts[i + 1].split(':')
        options.username = username
        options.password = password
        i++
      }
    }

    if (body) {
      options.body = body
    }

    try {
      const response = await request(method, url, options)
      return [{ type: 'text', text: formatHTTPResponse(response, verbose) }]
    } catch (error: any) {
      return [{ type: 'text', text: `Error: ${error.message}` }]
    }
  },
}

/**
 * /dns command - DNS lookup
 * Usage: /dns <domain> [type] [--doh]
 */
export const dnsCommand: Command = {
  name: 'dns',
  description: 'DNS lookup (A, AAAA, MX, NS, TXT, CNAME, SOA, PTR)',
  aliases: [],
  args: ['<domain> [type=A] [--doh]'],
  run: async (args) => {
    const parts = args.trim().split(/\s+/)
    const domain = parts[0]
    const type = (parts[1]?.toUpperCase() || 'A') as Parameters<typeof dnsResolve>[1]
    const useDOH = parts.includes('--doh')

    if (!domain) {
      return [{ type: 'text', text: 'Usage: /dns <domain> [type=A] [--doh]\nTypes: A, AAAA, MX, NS, TXT, CNAME, SOA, PTR' }]
    }

    // Validate type
    const validTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR']
    if (!validTypes.includes(type)) {
      return [{ type: 'text', text: `Invalid type: ${type}. Valid types: ${validTypes.join(', ')}` }]
    }

    try {
      const response = await dnsResolve(domain, type)
      return [{ type: 'text', text: formatDNSResponse(response) }]
    } catch (error: any) {
      return [{ type: 'text', text: `Error: ${error.message}` }]
    }
  },
}

/**
 * /ping command - Ping host
 * Usage: /ping <host> [count=5]
 */
export const pingCommand: Command = {
  name: 'ping',
  description: 'Ping host (TCP-based)',
  aliases: [],
  args: ['<host> [count=5]'],
  run: async (args) => {
    const parts = args.trim().split(/\s+/)
    const host = parts[0]
    const count = parseInt(parts[1]) || 5

    if (!host) {
      return [{ type: 'text', text: 'Usage: /ping <host> [count=5]' }]
    }

    try {
      const results = await pingHost(host, count)
      return [{ type: 'text', text: formatPingResults(results) }]
    } catch (error: any) {
      return [{ type: 'text', text: `Error: ${error.message}` }]
    }
  },
}

/**
 * /ports command - Port scanner
 * Usage: /ports <host> [start-end] [--common]
 */
export const portsCommand: Command = {
  name: 'ports',
  description: 'Scan ports on host',
  aliases: ['scan'],
  args: ['<host> [start-end|--common] [--timeout <ms>]'],
  run: async (args) => {
    const parts = args.trim().split(/\s+/)
    const host = parts[0]

    if (!host) {
      return [{ type: 'text', text: 'Usage: /ports <host> [start-end|--common] [--timeout <ms>]\nExamples:\n  /ports example.com 1-1000\n  /ports example.com --common' }]
    }

    let startPort = 1
    let endPort = 1024
    let commonOnly = false
    let timeout = 5000

    // Parse range or --common flag
    if (parts[1]) {
      if (parts[1] === '--common') {
        commonOnly = true
      } else if (parts[1].includes('-')) {
        const [start, end] = parts[1].split('-').map(Number)
        startPort = start || 1
        endPort = end || 1024
      } else {
        startPort = parseInt(parts[1]) || 1
        endPort = startPort
      }
    }

    // Parse timeout flag
    const timeoutIdx = parts.indexOf('--timeout')
    if (timeoutIdx !== -1 && parts[timeoutIdx + 1]) {
      timeout = parseInt(parts[timeoutIdx + 1])
    }

    try {
      let results
      if (commonOnly) {
        results = await scanCommonPorts(host, { timeout })
      } else {
        results = await portScan(host, startPort, endPort, { timeout })
      }

      const verbose = parts.includes('--verbose')
      return [{ type: 'text', text: formatPortScan(results, verbose) }]
    } catch (error: any) {
      return [{ type: 'text', text: `Error: ${error.message}` }]
    }
  },
}

/**
 * /ssl command - SSL certificate info
 * Usage: /ssl <host> [port] [--expiry] [--verify]
 */
export const sslCommand: Command = {
  name: 'ssl',
  description: 'Check SSL certificate',
  aliases: ['tls', 'cert'],
  args: ['<host> [port=443] [--expiry] [--verify] [--verbose]'],
  run: async (args) => {
    const parts = args.trim().split(/\s+/)
    const host = parts[0]
    const port = parseInt(parts[1]) || 443
    const checkExpiryOnly = parts.includes('--expiry')
    const verify = parts.includes('--verify')
    const verbose = parts.includes('--verbose')

    if (!host) {
      return [{ type: 'text', text: 'Usage: /ssl <host> [port=443] [--expiry] [--verify] [--verbose]' }]
    }

    try {
      if (checkExpiryOnly) {
        const expiry = await checkSSLExpiry(host, port)
        const lines: string[] = []
        lines.push(`Host: ${expiry.host}:${port}`)
        lines.push(`Expires: ${expiry.expires.toISOString().split('T')[0]}`)
        lines.push(`Days remaining: ${expiry.daysRemaining}`)
        lines.push(`Status: ${expiry.isExpired ? 'EXPIRED' : expiry.isExpiringSoon ? 'EXPIRING SOON' : 'VALID'}`)
        return [{ type: 'text', text: lines.join('\n') }]
      } else if (verify) {
        const chain = await verifyChain(host, port)
        const lines: string[] = []
        lines.push(`Chain verification for ${host}:${port}`)
        lines.push(`Valid: ${chain.valid ? 'YES' : 'NO'}`)
        if (chain.errors.length > 0) {
          lines.push('Errors:')
          for (const error of chain.errors) {
            lines.push(`  - ${error}`)
          }
        }
        if (chain.chain.length > 0) {
          lines.push('')
          lines.push('Chain:')
          for (const cert of chain.chain) {
            lines.push(`  ${cert.subject} -> ${cert.issuer}`)
          }
        }
        return [{ type: 'text', text: lines.join('\n') }]
      } else {
        const cert = await checkSSLCert(host, port)
        return [{ type: 'text', text: formatCertInfo(cert, verbose) }]
      }
    } catch (error: any) {
      return [{ type: 'text', text: `Error: ${error.message}` }]
    }
  },
}

/**
 * /curl command - Alias for /http GET with verbose output
 */
export const curlCommand: Command = {
  name: 'curl',
  description: 'Like curl - fetch URL (GET with verbose)',
  aliases: [],
  args: ['<url> [--header key=val] [--timeout <ms>]'],
  run: async (args, context) => {
    // Delegate to http command with GET and verbose
    const parts = args.trim().split(/\s+/)
    if (parts.length === 0) {
      return [{ type: 'text', text: 'Usage: /curl <url> [--header key=val] [--timeout <ms>]' }]
    }

    const url = parts[0]
    const httpArgs = ['GET', url, '--verbose', ...parts.slice(1)]
    return httpCommand.run(httpArgs.join(' '), context)
  },
}

/**
 * /traceroute command - Trace network path
 * Usage: /traceroute <host> [max-hops]
 */
export const tracerouteCommand: Command = {
  name: 'traceroute',
  description: 'Trace network path to host',
  aliases: ['tr'],
  args: ['<host> [max-hops=30]'],
  run: async (args) => {
    const parts = args.trim().split(/\s+/)
    const host = parts[0]
    const maxHops = parseInt(parts[1]) || 30

    if (!host) {
      return [{ type: 'text', text: 'Usage: /traceroute <host> [max-hops=30]' }]
    }

    try {
      const results = await traceRoute(host, maxHops)
      return [{ type: 'text', text: formatTracerouteResults(results) }]
    } catch (error: any) {
      return [{ type: 'text', text: `Error: ${error.message}` }]
    }
  },
}

// Export all network commands as an array
export const networkCommands: Command[] = [
  httpCommand,
  dnsCommand,
  pingCommand,
  portsCommand,
  sslCommand,
  curlCommand,
  tracerouteCommand,
]
