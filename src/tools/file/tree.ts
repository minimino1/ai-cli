import { readdir, stat } from 'fs/promises'
import { join, relative, basename, extname } from 'path'
import { existsSync } from 'fs'

// Box-drawing characters for tree structure
const TREE_CHARS = {
  vertical: '│   ',
  branch: '├── ',
  lastBranch: '└── ',
  indent: '    ',
}

// File type icons (simple unicode)
const ICONS: Record<string, string> = {
  dir: '📁',
  file: '📄',
  js: '📜',
  ts: '📘',
  tsx: '⚛️',
  json: '📋',
  md: '📝',
  py: '🐍',
  go: '🐹',
  rs: '🦀',
  c: '📎',
  cpp: '📎',
  h: '📎',
  hpp: '📎',
  java: '☕',
  sh: '⚡',
  bash: '⚡',
  zsh: '⚡',
  default: '📄',
}

interface TreeOptions {
  maxDepth?: number
  showFiles?: boolean
  ignorePatterns?: string[]
  icons?: boolean
  showHidden?: boolean
}

interface TreeResult {
  tree: string
  stats: {
    dirs: number
    files: number
    totalSize: number
  }
}

// Default ignore patterns (like .gitignore)
const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.cache',
  '__pycache__',
  '.DS_Store',
  'Thumbs.db',
]

// Check if path should be ignored
function shouldIgnore(name: string, ignorePatterns: string[]): boolean {
  for (const pattern of ignorePatterns) {
    if (pattern.startsWith('*')) {
      // Simple glob: *.ext
      const ext = pattern.slice(1)
      if (name.endsWith(ext)) return true
    } else if (pattern.endsWith('/')) {
      // Directory pattern
      if (name === pattern.slice(0, -1)) return true
    } else {
      // Exact match
      if (name === pattern) return true
    }
  }
  return false
}

// Get icon for file/directory
function getIcon(name: string, isDir: boolean): string {
  if (isDir) return ICONS.dir

  const ext = extname(name).slice(1).toLowerCase()
  return ICONS[ext] || ICONS.default
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Build tree recursively
async function buildTree(
  dirPath: string,
  options: TreeOptions,
  depth: number = 0,
  prefix: string = '',
  isLast: boolean = true,
  basePath: string,
  stats: { dirs: number; files: number; totalSize: number }
): Promise<string[]> {
  const lines: string[] = []

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })

    // Filter entries
    let filtered = entries.filter(entry => {
      // Skip hidden files unless showHidden
      if (!options.showHidden && entry.name.startsWith('.')) return false
      // Skip ignored patterns
      if (shouldIgnore(entry.name, options.ignorePatterns || DEFAULT_IGNORE)) return false
      return true
    })

    // Sort: directories first, then files, alphabetically
    filtered.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

    // Limit depth
    if (options.maxDepth !== undefined && depth >= options.maxDepth) {
      return lines
    }

    // Process each entry
    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i]
      const isLastEntry = i === filtered.length - 1
      const entryPath = join(dirPath, entry.name)

      // Build prefix for this entry
      const currentPrefix = isLast ? TREE_CHARS.lastBranch : TREE_CHARS.branch
      const childPrefix = isLast ? TREE_CHARS.indent : TREE_CHARS.vertical

      // Get icon if enabled
      const icon = options.icons ? getIcon(entry.name, entry.isDirectory()) + ' ' : ''

      // Add line
      lines.push(prefix + currentPrefix + icon + entry.name)

      // Update stats
      if (entry.isDirectory()) {
        stats.dirs++
      } else {
        stats.files++
        try {
          const fileStat = await stat(entryPath)
          stats.totalSize += fileStat.size
        } catch {
          // Ignore stat errors
        }
      }

      // Recurse into directories
      if (entry.isDirectory() && (options.maxDepth === undefined || depth < options.maxDepth - 1)) {
        const childLines = await buildTree(
          entryPath,
          options,
          depth + 1,
          prefix + childPrefix,
          isLastEntry,
          basePath,
          stats
        )
        lines.push(...childLines)
      }
    }
  } catch (error) {
    // Handle permission errors, etc.
    lines.push(prefix + TREE_CHARS.lastBranch + `❌ [Error: ${error instanceof Error ? error.message : 'Unknown'}]`)
  }

  return lines
}

/**
 * Generate a directory tree structure
 */
export async function tree(path: string, options: TreeOptions = {}): Promise<TreeResult> {
  const resolvedPath = resolvePath(path)
  const stats: { dirs: number; files: number; totalSize: number } = { dirs: 0, files: 0, totalSize: 0 }

  // Get root name
  const rootName = basename(resolvedPath)
  const icon = options.icons ? getIcon(rootName, true) + ' ' : ''
  const lines: string[] = [icon + rootName]

  // Build tree
  const treeLines = await buildTree(resolvedPath, options, 0, '', true, resolvedPath, stats)
  lines.push(...treeLines)

  // Add stats summary
  lines.push('')
  lines.push(`📊 Stats: ${stats.dirs} directories, ${stats.files} files, ${formatSize(stats.totalSize)}`)

  return {
    tree: lines.join('\n'),
    stats,
  }
}

/**
 * Resolve path relative to cwd or absolute
 */
function resolvePath(path: string): string {
  if (path.startsWith('/')) return path
  return join(process.cwd(), path)
}

/**
 * Generate a simple tree (sync version for quick operations)
 */
export function treeSync(path: string, options: TreeOptions = {}): TreeResult {
  const resolvedPath = resolvePath(path)
  const stats: { dirs: number; files: number; totalSize: number } = { dirs: 0, files: 0, totalSize: 0 }

  const rootName = basename(resolvedPath)
  const icon = options.icons ? getIcon(rootName, true) + ' ' : ''
  const lines: string[] = [icon + rootName]

  // Simple sync traversal (limited functionality)
  const buildSync = (dirPath: string, depth: number = 0, prefix: string = '', isLast: boolean = true): string[] => {
    const result: string[] = []

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true })

      let filtered = entries.filter(entry => {
        if (!options.showHidden && entry.name.startsWith('.')) return false
        if (shouldIgnore(entry.name, options.ignorePatterns || DEFAULT_IGNORE)) return false
        return true
      })

      filtered.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      if (options.maxDepth !== undefined && depth >= options.maxDepth) {
        return result
      }

      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i]
        const isLastEntry = i === filtered.length - 1
        const entryPath = join(dirPath, entry.name)

        const currentPrefix = isLast ? TREE_CHARS.lastBranch : TREE_CHARS.branch
        const childPrefix = isLast ? TREE_CHARS.indent : TREE_CHARS.vertical

        const icon = options.icons ? getIcon(entry.name, entry.isDirectory()) + ' ' : ''
        result.push(prefix + currentPrefix + icon + entry.name)

        if (entry.isDirectory()) {
          stats.dirs++
          if (options.maxDepth === undefined || depth < options.maxDepth - 1) {
            result.push(...buildSync(entryPath, depth + 1, prefix + childPrefix, isLastEntry))
          }
        } else {
          stats.files++
          try {
            const fileStat = statSync(entryPath)
            stats.totalSize += fileStat.size
          } catch {
            // ignore
          }
        }
      }
    } catch {
      result.push(prefix + TREE_CHARS.lastBranch + '❌ [Access Denied]')
    }

    return result
  }

  lines.push(...buildSync(resolvedPath))
  lines.push('')
  lines.push(`📊 Stats: ${stats.dirs} directories, ${stats.files} files, ${formatSize(stats.totalSize)}`)

  return {
    tree: lines.join('\n'),
    stats,
  }
}

// Sync helpers (import from fs)
import { readdirSync, statSync } from 'fs'
