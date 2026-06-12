import { readdir, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { existsSync } from 'fs'

export interface SearchOptions {
  recursive?: boolean
  ignoreCase?: boolean
  maxResults?: number
  followSymlinks?: boolean
}

export interface SearchResult {
  path: string
  size?: number
  modified?: Date
  type: 'file' | 'directory'
  match?: string // for content search - the matching line
  lineNumber?: number
}

export interface SizeRange {
  min?: number
  max?: number
}

export interface DateRange {
  after?: Date
  before?: Date
}

/**
 * Convert glob pattern to RegExp
 */
function globToRegex(pattern: string, ignoreCase: boolean = false): RegExp {
  // Escape special regex characters except * and ?
  let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  // Convert glob wildcards to regex
  regexStr = regexStr.replace(/\*/g, '.*').replace(/\?/g, '.')
  // Match full path
  regexStr = '^' + regexStr + '$'

  return new RegExp(regexStr, ignoreCase ? 'i' : '')
}

/**
 * Check if file matches glob pattern
 */
function matchesGlob(filePath: string, pattern: string, ignoreCase: boolean = false): boolean {
  const regex = globToRegex(pattern, ignoreCase)
  return regex.test(filePath)
}

/**
 * Search files by glob pattern
 */
export async function searchFiles(
  path: string,
  pattern: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, ignoreCase = false, maxResults = 1000 } = options

  const searchDir = resolvePath(path)
  const regex = globToRegex(pattern, ignoreCase)

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue // Skip hidden

        const fullPath = join(dir, entry.name)
        const relPath = relative(searchDir, fullPath)

        // Check if matches pattern
        if (regex.test(relPath) || regex.test(entry.name)) {
          try {
            const fileStat = await stat(fullPath)
            results.push({
              path: relPath,
              size: fileStat.size,
              modified: fileStat.mtime,
              type: entry.isDirectory() ? 'directory' : 'file',
            })
          } catch {
            // Skip if can't stat
          }

          if (results.length >= maxResults) return
        }

        // Recurse into directories
        if (recursive && entry.isDirectory()) {
          await walk(fullPath)
          if (results.length >= maxResults) return
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Search file contents (grep-like)
 */
export async function grepFiles(
  path: string,
  pattern: string,
  options: SearchOptions & {
    filePattern?: string // e.g., '*.ts', '*.js'
    showContext?: number // lines before/after
  } = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, ignoreCase = false, maxResults = 1000, filePattern, showContext = 0 } = options

  const searchDir = resolvePath(path)
  const regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g')

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)
        const relPath = relative(searchDir, fullPath)

        // Check file pattern if specified
        if (filePattern && !matchesGlob(entry.name, filePattern, ignoreCase)) {
          if (recursive && entry.isDirectory()) {
            await walk(fullPath)
          }
          continue
        }

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          // Search file content
          try {
            const content = await readFile(fullPath, 'utf-8')
            const lines = content.split('\n')

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i]
              if (regex.test(line)) {
                // Get context lines
                const contextStart = Math.max(0, i - showContext)
                const contextEnd = Math.min(lines.length - 1, i + showContext)

                results.push({
                  path: relPath,
                  type: 'file',
                  match: line.trim(),
                  lineNumber: i + 1,
                })

                if (results.length >= maxResults) break
              }
            }
          } catch {
            // Skip files we can't read
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // Skip unreadable directories
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Search files by size range
 */
export async function searchBySize(
  path: string,
  sizeRange: SizeRange,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, maxResults = 1000 } = options

  const searchDir = resolvePath(path)

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          try {
            const fileStat = await stat(fullPath)
            const size = fileStat.size

            const matchesMin = sizeRange.min === undefined || size >= sizeRange.min
            const matchesMax = sizeRange.max === undefined || size <= sizeRange.max

            if (matchesMin && matchesMax) {
              results.push({
                path: relative(searchDir, fullPath),
                size,
                modified: fileStat.mtime,
                type: 'file',
              })
            }
          } catch {
            // skip
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // skip
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Search files by date range
 */
export async function searchByDate(
  path: string,
  dateRange: DateRange,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, maxResults = 1000 } = options

  const searchDir = resolvePath(path)

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          try {
            const fileStat = await stat(fullPath)
            const mtime = fileStat.mtime

            const matchesAfter = !dateRange.after || mtime >= dateRange.after
            const matchesBefore = !dateRange.before || mtime <= dateRange.before

            if (matchesAfter && matchesBefore) {
              results.push({
                path: relative(searchDir, fullPath),
                size: fileStat.size,
                modified: mtime,
                type: 'file',
              })
            }
          } catch {
            // skip
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // skip
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Search files by type/extension
 */
export async function searchByType(
  path: string,
  type: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, maxResults = 1000 } = options

  const searchDir = resolvePath(path)
  const extensions = type.split(',').map(ext => ext.trim().toLowerCase().replace(/^\./, ''))

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          const fileExt = extname(entry.name).toLowerCase().replace(/^\./, '')

          if (extensions.includes(fileExt) || extensions.includes('all')) {
            try {
              const fileStat = await stat(fullPath)
              results.push({
                path: relative(searchDir, fullPath),
                size: fileStat.size,
                modified: fileStat.mtime,
                type: 'file',
              })
            } catch {
              // skip
            }
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // skip
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return '\x1b[90mNo results found\x1b[0m'
  }

  const lines: string[] = []
  lines.push(`\x1b[1mFound ${results.length} results:\x1b[0m`)
  lines.push('')

  for (const result of results) {
    const sizeStr = result.size ? formatSize(result.size) : ''
    const dateStr = result.modified ? formatDate(result.modified) : ''
    const typeIcon = result.type === 'directory' ? '📁' : '📄'

    let line = `${typeIcon} ${result.path}`
    if (sizeStr) line += ` \x1b[90m(${sizeStr})\x1b[0m`
    if (dateStr) line += ` \x1b[90m[${dateStr}]\x1b[0m`
    if (result.match) {
      line += `\n  \x1b[33m→ ${result.match}\x1b[0m`
      if (result.lineNumber) {
        line += ` \x1b[90m(line ${result.lineNumber})\x1b[0m`
      }
    }

    lines.push(line)
  }

  return lines.join('\n')
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(date: Date): string {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function resolvePath(path: string): string {
  if (path.startsWith('/')) return path
  return join(process.cwd(), path)
}

function relative(from: string, to: string): string {
  // Simple relative path calculation
  const fromParts = from.split('/').filter(p => p)
  const toParts = to.split('/').filter(p => p)

  let common = 0
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common++
  }

  const up = fromParts.length - common
  const down = toParts.slice(common)

  const result = [...Array(up).fill('..'), ...down].join('/')
  return result || '.'
}

// Import for sync version
import { readdirSync, statSync } from 'fs'

/**
 * Sync version of searchFiles
 */
export function searchFilesSync(path: string, pattern: string, options: SearchOptions = {}): SearchResult[] {
  const results: SearchResult[] = []
  const { recursive = true, ignoreCase = false, maxResults = 1000 } = options

  const searchDir = resolvePath(path)
  const regex = globToRegex(pattern, ignoreCase)

  const walkSync = (dir: string): void => {
    if (results.length >= maxResults) return

    try {
      const entries = readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)
        const relPath = relative(searchDir, fullPath)

        if (regex.test(relPath) || regex.test(entry.name)) {
          try {
            const fileStat = statSync(fullPath)
            results.push({
              path: relPath,
              size: fileStat.size,
              modified: fileStat.mtime,
              type: entry.isDirectory() ? 'directory' : 'file',
            })
          } catch {
            // skip
          }

          if (results.length >= maxResults) return
        }

        if (recursive && entry.isDirectory()) {
          walkSync(fullPath)
          if (results.length >= maxResults) return
        }
      }
    } catch {
      // skip
    }
  }

  walkSync(searchDir)
  return results
}
