// HTTP client using Bun.fetch
// Supports: all methods, headers, body, timeout, redirects, auth

export interface HTTPRequestOptions {
  headers?: Record<string, string>
  body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | TypedArray
  timeout?: number
  followRedirects?: boolean
  maxRedirects?: number
  username?: string
  password?: string
  compress?: boolean
}

export interface HTTPResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: number
  redirectedURL?: string
}

/**
 * Make an HTTP request
 */
export async function request(
  method: string,
  url: string,
  options: HTTPRequestOptions = {}
): Promise<HTTPResponse> {
  const startTime = Date.now()

  try {
    const response = await Bun.fetch(url, {
      method: method.toUpperCase(),
      headers: options.headers || {},
      body: options.body,
      timeout: options.timeout || 30000,
      redirect: options.followRedirects !== false ? 'follow' : 'manual',
      maxRedirects: options.maxRedirects || 5,
      username: options.username,
      password: options.password,
      compress: options.compress !== false,
    })

    const endTime = Date.now()
    const body = await response.text()
    const size = new TextEncoder().encode(body).length

    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(response.headers)) {
      headers[key] = Array.isArray(value) ? value.join(', ') : String(value)
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      time: endTime - startTime,
      size,
      redirectedURL: response.url !== url ? response.url : undefined,
    }
  } catch (error: any) {
    const endTime = Date.now()
    throw new Error(`HTTP request failed: ${error.message} (${endTime - startTime}ms)`)
  }
}

/**
 * GET request
 */
export async function get(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('GET', url, options)
}

/**
 * POST request
 */
export async function post(url: string, body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | TypedArray, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('POST', url, { ...options, body })
}

/**
 * PUT request
 */
export async function put(url: string, body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | TypedArray, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('PUT', url, { ...options, body })
}

/**
 * DELETE request
 */
export async function del(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('DELETE', url, options)
}

/**
 * PATCH request
 */
export async function patch(url: string, body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | TypedArray, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('PATCH', url, { ...options, body })
}

/**
 * HEAD request
 */
export async function head(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  const response = await request('HEAD', url, options)
  // HEAD responses typically have no body
  return { ...response, body: '' }
}

/**
 * OPTIONS request
 */
export async function options(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('OPTIONS', url, options)
}

/**
 * Format response for display
 */
export function formatResponse(response: HTTPResponse, verbose: boolean = false): string {
  const lines: string[] = []

  lines.push(`Status: ${response.status} ${response.statusText}`)
  lines.push(`Time: ${response.time}ms`)
  lines.push(`Size: ${formatBytes(response.size)}`)

  if (response.redirectedURL) {
    lines.push(`Redirected: ${response.redirectedURL}`)
  }

  if (verbose && Object.keys(response.headers).length > 0) {
    lines.push('')
    lines.push('Headers:')
    for (const [key, value] of Object.entries(response.headers)) {
      lines.push(`  ${key}: ${value}`)
    }
  }

  if (response.body) {
    lines.push('')
    lines.push('Body:')
    lines.push(response.body)
  }

  return lines.join('\n')
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

/**
 * Parse URL parameters
 */
export function parseURL(url: string): {
  protocol: string
  host: string
  port: string | null
  pathname: string
  search: string
  hash: string
} {
  try {
    const urlObj = new URL(url)
    return {
      protocol: urlObj.protocol,
      host: urlObj.host,
      port: urlObj.port || null,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
    }
  } catch (error: any) {
    throw new Error(`Invalid URL: ${error.message}`)
  }
}

/**
 * Build URL with query parameters
 */
export function buildURL(base: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Test if URL is reachable (HEAD request)
 */
export async function testURL(url: string, timeout: number = 5000): Promise<{ reachable: boolean; status?: number; error?: string }> {
  try {
    const response = await head(url, { timeout })
    return { reachable: response.status >= 200 && response.status < 400, status: response.status }
  } catch (error: any) {
    return { reachable: false, error: error.message }
  }
}
