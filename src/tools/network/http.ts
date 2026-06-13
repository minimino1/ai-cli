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
 * Führt eine HTTP-Anfrage aus und liefert eine normalisierte Antwortstruktur.
 *
 * Führt die Anfrage über Bun.fetch aus, misst Dauer und Größe, normalisiert Header und setzt `redirectedURL`, wenn die endgültige URL von der angeforderten abweicht.
 *
 * @param method - HTTP-Methode (z. B. `"GET"`, `"POST"`)
 * @param url - Ziel-URL der Anfrage
 * @param options - Optionale Anfragekonfiguration; unterstützte Felder: `headers`, `body`, `timeout`, `followRedirects`, `maxRedirects`, `username`, `password`, `compress`
 * @returns Ein `HTTPResponse`-Objekt mit `status`, `statusText`, normalisierten `headers`, `body`, `time` (ms), `size` (Bytes) und optional `redirectedURL`
 * @throws Fehler, falls die Anfrage fehlschlägt; die Fehlermeldung enthält die ursprüngliche Nachricht und die verstrichene Zeit in Millisekunden
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
 * Führt eine HTTP-GET-Anfrage an die angegebene URL aus.
 *
 * @param url - Ziel-URL der Anfrage
 * @param options - Optionale Anfragekonfiguration; vom Typ `HTTPRequestOptions` ohne `body`
 * @returns Das empfangene `HTTPResponse`-Objekt mit Status, Headern, Body, Dauer (ms) und Größe (Bytes)
 */
export async function get(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('GET', url, options)
}

/**
 * Führt eine HTTP-POST-Anfrage an die angegebene URL aus.
 *
 * @param body - Nutzlast der Anfrage; unterstützt `string`, `FormData`, `URLSearchParams`, `Blob`, `ArrayBuffer` oder typisierte Arrays
 * @param options - Zusätzliche Anfrageoptionen (z. B. `headers`, `timeout`, `followRedirects`, `maxRedirects`, `username`, `password`, `compress`)
 * @returns Ein `HTTPResponse`-Objekt mit `status`, `statusText`, normalisierten `headers`, `body`, `time`, `size` und optional `redirectedURL`
 */
export async function post(url: string, body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | TypedArray, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('POST', url, { ...options, body })
}

/**
 * Führt eine HTTP PUT-Anfrage an die angegebene URL aus.
 *
 * @param url - Ziel-URL der Anfrage
 * @param body - Optionaler Request-Body; akzeptierte Formate sind z. B. String, FormData, URLSearchParams, Blob oder ArrayBuffer
 * @param options - Zusätzliche Request-Optionen (z. B. Header, Timeout, Redirect-Verhalten, Authentifizierungsdaten, Kompressionssteuerung)
 * @returns Ein `HTTPResponse`-Objekt mit Status, Statustext, normalisierten Headern, Antwort-Body als Text, Dauer (`time`) und Größe (`size`). 
 */
export async function put(url: string, body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | TypedArray, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('PUT', url, { ...options, body })
}

/**
 * Führt eine HTTP DELETE-Anfrage an die angegebene URL aus.
 *
 * @param url - Die Ziel-URL der Anfrage
 * @param options - Optionale Anfragekonfiguration (z. B. Headers, timeout, Redirect-/Auth- und Compress-Optionen). Enthält kein `body`.
 * @returns Ein normalisiertes `HTTPResponse`-Objekt mit `status`, `statusText`, `headers`, `body`, `time`, `size` und optional `redirectedURL`
 */
export async function del(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('DELETE', url, options)
}

/**
 * Führt eine HTTP-PATCH-Anfrage an die angegebene URL aus.
 *
 * @returns Ein `HTTPResponse`-Objekt mit Status, Statustext, normalisierten Headern, Antworttext, Dauer in Millisekunden und Größe in Bytes
 */
export async function patch(url: string, body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | TypedArray, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('PATCH', url, { ...options, body })
}

/**
 * Führt eine HTTP HEAD-Anfrage an die angegebene URL aus.
 *
 * Die zurückgegebene Antwort enthält Status, Header, Zeit- und Größeninformationen; der `body` ist leer (`''`).
 *
 * @returns Das `HTTPResponse`-Objekt mit `body` gleich `''`.
 */
export async function head(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  const response = await request('HEAD', url, options)
  // HEAD responses typically have no body
  return { ...response, body: '' }
}

/**
 * Führt eine HTTP-OPTIONS-Anfrage an die angegebene URL aus.
 *
 * @param url - Die Ziel-URL für die Anfrage
 * @param options - Optionale Anfragekonfiguration (z. B. `headers`, `timeout`, `followRedirects`)
 * @returns Ein `HTTPResponse`-Objekt mit Status, Statustext, normalisierten Headern, Body-Text, Dauer in ms und Byte-Größe; `redirectedURL` ist gesetzt, wenn die endgültige URL von der angeforderten abweicht
 */
export async function options(url: string, options: Omit<HTTPRequestOptions, 'body'> = {}): Promise<HTTPResponse> {
  return request('OPTIONS', url, options)
}

/**
 * Formatiert ein HTTPResponse-Objekt zu einer mehrzeiligen, menschenlesbaren Darstellung.
 *
 * Fügt Statuszeile, Dauer in Millisekunden und formatierte Größe hinzu; wenn vorhanden, wird die endgültige umgeleitete URL angezeigt.
 *
 * @param response - Das zu formatierende HTTP-Response-Objekt
 * @param verbose - Wenn `true`, werden die Antwortheader als separater Abschnitt ausgegeben
 * @returns Eine mehrzeilige Zeichenkette mit Status, Zeit, Größe und optionalen Abschnitten für Redirect, Headers und Body
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
 * Konvertiert eine Anzahl Bytes in eine menschenlesbare Größendarstellung.
 *
 * @param bytes - Anzahl Bytes, die formatiert werden sollen
 * @returns Die formatierte Größe mit geeigneter Einheit (`B`, `KB`, `MB`, `GB`, `TB`). Bei `B` ohne Nachkommastellen, sonst mit zwei Nachkommastellen.
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
 * Zerlegt eine URL-Zeichenkette in ihre einzelnen Komponenten.
 *
 * @param url - Die zu parsende vollständige URL als Zeichenkette.
 * @returns Ein Objekt mit `protocol`, `host`, `port` (oder `null` wenn nicht gesetzt), `pathname`, `search` und `hash`.
 * @throws Error - Wenn die Eingabe keine gültige URL ist (Nachricht beginnt mit `Invalid URL:`).
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
 * Fügt die gegebenen Query-Parameter an eine Basis‑URL an.
 *
 * @param base - Die Basis‑URL
 * @param params - Schlüssel‑Wert‑Paare für Query‑Parameter; Einträge mit `undefined` werden ausgelassen
 * @returns Die vollständige URL als String mit den gesetzten Query‑Parametern
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
 * Prüft, ob eine URL per HEAD-Anfrage erreichbar ist.
 *
 * @param timeout - Maximale Wartezeit in Millisekunden für die Anfrage (Standard: 5000)
 * @returns `reachable: true` wenn der Server mit einem Statuscode im Bereich 200–399 antwortet; `status` enthält den HTTP-Statuscode (falls vorhanden); `error` enthält die Fehlermeldung bei einem Fehler
 */
export async function testURL(url: string, timeout: number = 5000): Promise<{ reachable: boolean; status?: number; error?: string }> {
  try {
    const response = await head(url, { timeout })
    return { reachable: response.status >= 200 && response.status < 400, status: response.status }
  } catch (error: any) {
    return { reachable: false, error: error.message }
  }
}
