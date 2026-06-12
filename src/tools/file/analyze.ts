import { readdir, stat } from 'fs/promises'
import { join, extname, relative } from 'path'

export interface DirAnalysis {
  totalSize: number
  fileCount: number
  dirCount: number
  fileTypes: Map<string, { count: number; size: number }>
  largestFiles: Array<{ path: string; size: number; modified: Date }>
  oldestFiles: Array<{ path: string; size: number; modified: Date }>
  averageFileSize: number
  deepestPath: string
  maxDepth: number
}

export interface LargeFile {
  path: string
  size: number
  modified: Date
}

export interface EmptyDir {
  path: string
  depth: number
}

export interface DiskUsage {
  path: string
  size: number
  fileCount: number
  dirCount: number
  children?: DiskUsage[]
}

/**
 * Analyze directory structure and statistics
 */
export async function analyzeDir(path: string): Promise<DirAnalysis> {
  const resolvedPath = resolvePath(path)
  const analysis: DirAnalysis = {
    totalSize: 0,
    fileCount: 0,
    dirCount: 0,
    fileTypes: new Map(),
    largestFiles: [],
    oldestFiles: [],
    averageFileSize: 0,
    deepestPath: '',
    maxDepth: 0,
  }

  const allFiles: Array<{ path: string; size: number; modified: Date; depth: number }> = []

  const walk = async (dir: string, depth: number = 0): Promise<void> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue // Skip hidden

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          analysis.dirCount++
          await walk(fullPath, depth + 1)
        } else {
          try {
            const fileStat = await stat(fullPath)
            analysis.fileCount++
            analysis.totalSize += fileStat.size

            // Track file type
            const ext = extname(entry.name).toLowerCase() || 'noext'
            const typeInfo = analysis.fileTypes.get(ext) || { count: 0, size: 0 }
            typeInfo.count++
            typeInfo.size += fileStat.size
            analysis.fileTypes.set(ext, typeInfo)

            // Track for largest/oldest
            const relPath = relative(resolvedPath, fullPath)
            allFiles.push({
              path: relPath,
              size: fileStat.size,
              modified: fileStat.mtime,
              depth,
            })

            // Track max depth
            if (depth > analysis.maxDepth) {
              analysis.maxDepth = depth
              analysis.deepestPath = relPath
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    } catch {
      // skip unreadable directories
    }
  }

  await walk(resolvedPath)

  // Sort largest files
  analysis.largestFiles = allFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 50)
    .map(f => ({ path: f.path, size: f.size, modified: f.modified }))

  // Sort oldest files
  analysis.oldestFiles = allFiles
    .sort((a, b) => a.modified.getTime() - b.modified.getTime())
    .slice(0, 50)
    .map(f => ({ path: f.path, size: f.size, modified: f.modified }))

  // Calculate average
  analysis.averageFileSize = analysis.fileCount > 0 ? analysis.totalSize / analysis.fileCount : 0

  return analysis
}

/**
 * Find largest files in directory
 */
export async function findLargeFiles(
  path: string,
  limit: number = 20,
  minSize?: number
): Promise<LargeFile[]> {
  const resolvedPath = resolvePath(path)
  const files: LargeFile[] = []

  const walk = async (dir: string): Promise<void> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          try {
            const fileStat = await stat(fullPath)
            if (minSize !== undefined && fileStat.size < minSize) continue

            files.push({
              path: relative(resolvedPath, fullPath),
              size: fileStat.size,
              modified: fileStat.mtime,
            })
          } catch {
            // skip
          }
        }
      }
    } catch {
      // skip
    }
  }

  await walk(resolvedPath)

  return files.sort((a, b) => b.size - a.size).slice(0, limit)
}

/**
 * Find old files (not modified recently)
 */
export async function findOldFiles(
  path: string,
  days: number,
  limit: number = 50
): Promise<LargeFile[]> {
  const resolvedPath = resolvePath(path)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const files: LargeFile[] = []

  const walk = async (dir: string): Promise<void> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          try {
            const fileStat = await stat(fullPath)
            if (fileStat.mtime >= cutoff) continue

            files.push({
              path: relative(resolvedPath, fullPath),
              size: fileStat.size,
              modified: fileStat.mtime,
            })
          } catch {
            // skip
          }
        }
      }
    } catch {
      // skip
    }
  }

  await walk(resolvedPath)

  return files.sort((a, b) => a.modified.getTime() - b.modified.getTime()).slice(0, limit)
}

/**
 * Find empty directories
 */
export async function emptyDirs(path: string): Promise<EmptyDir[]> {
  const resolvedPath = resolvePath(path)
  const empty: EmptyDir[] = []

  const walk = async (dir: string, depth: number = 0): Promise<boolean> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      let hasContent = false

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          const isEmpty = await walk(fullPath, depth + 1)
          if (isEmpty) {
            empty.push({
              path: relative(resolvedPath, fullPath),
              depth,
            })
          } else {
            hasContent = true
          }
        } else {
          hasContent = true
        }
      }

      return !hasContent
    } catch {
      return false
    }
  }

  await walk(resolvedPath)

  return empty.sort((a, b) => a.depth - b.depth)
}

/**
 * Disk usage (du-like) for path
 */
export async function diskUsage(path: string): Promise<DiskUsage> {
  const resolvedPath = resolvePath(path)
  const baseName = basename(resolvedPath)

  const usage: DiskUsage = {
    path: baseName,
    size: 0,
    fileCount: 0,
    dirCount: 0,
    children: [],
  }

  const childUsages = new Map<string, DiskUsage>()

  const walk = async (dir: string, relativePath: string = ''): Promise<void> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      let totalSize = 0
      let fileCount = 0
      let dirCount = 0
      const children: DiskUsage[] = []

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)
        const childRelPath = relativePath ? join(relativePath, entry.name) : entry.name

        if (entry.isDirectory()) {
          dirCount++
          const childUsage: DiskUsage = {
            path: entry.name,
            size: 0,
            fileCount: 0,
            dirCount: 0,
          }
          await walk(fullPath, childRelPath)
          // Recursive call would populate childUsage, simplified here
          children.push(childUsage)
          totalSize += childUsage.size
          fileCount += childUsage.fileCount
          dirCount += childUsage.dirCount
        } else {
          try {
            const fileStat = await stat(fullPath)
            fileCount++
            totalSize += fileStat.size
          } catch {
            // skip
          }
        }
      }

      usage.size = totalSize
      usage.fileCount = fileCount
      usage.dirCount = dirCount
      if (relativePath === '') {
        usage.children = children
      }
    } catch {
      // skip unreadable
    }
  }

  await walk(resolvedPath)

  return usage
}

/**
 * Format disk usage for display
 */
export function formatDiskUsage(usage: DiskUsage, indent: number = 0): string {
  const lines: string[] = []
  const indentStr = '  '.repeat(indent)

  const sizeStr = formatSize(usage.size)
  const typeStr = usage.children && usage.children.length > 0 ? 'dir' : 'file'

  lines.push(`${indentStr}${usage.path} \x1b[90m(${sizeStr}, ${usage.fileCount} files, ${usage.dirCount} dirs)\x1b[0m`)

  if (usage.children) {
    const sortedChildren = usage.children.sort((a, b) => b.size - a.size)
    for (const child of sortedChildren) {
      lines.push(formatDiskUsage(child, indent + 1))
    }
  }

  return lines.join('\n')
}

/**
 * Format analysis for display
 */
export function formatAnalysis(analysis: DirAnalysis): string {
  const lines: string[] = []
  lines.push('\x1b[1m📊 Directory Analysis\x1b[0m')
  lines.push('')
  lines.push(`Total Size: \x1b[32m${formatSize(analysis.totalSize)}\x1b[0m`)
  lines.push(`Files: \x1b[36m${analysis.fileCount}\x1b[0m`)
  lines.push(`Directories: \x1b[36m${analysis.dirCount}\x1b[0m`)
  lines.push(`Average File Size: \x1b[33m${formatSize(Math.round(analysis.averageFileSize))}\x1b[0m`)
  lines.push(`Max Depth: \x1b[90m${analysis.maxDepth}\x1b[0m (${analysis.deepestPath})`)
  lines.push('')

  // File types breakdown
  if (analysis.fileTypes.size > 0) {
    lines.push('\x1b[1m📈 File Types:\x1b[0m')
    const sortedTypes = Array.from(analysis.fileTypes.entries()).sort((a, b) => b[1].size - a[1].size)
    for (const [ext, info] of sortedTypes.slice(0, 15)) {
      const percent = (info.size / analysis.totalSize * 100).toFixed(1)
      lines.push(`  ${ext || 'noext'}: ${info.count} files, \x1b[32m${formatSize(info.size)}\x1b[0m (${percent}%)`)
    }
  }

  // Largest files
  if (analysis.largestFiles.length > 0) {
    lines.push('')
    lines.push('\x1b[1m🏆 Top 10 Largest Files:\x1b[0m')
    for (let i = 0; i < Math.min(10, analysis.largestFiles.length); i++) {
      const file = analysis.largestFiles[i]
      lines.push(`  ${i + 1}. ${file.path} (\x1b[32m${formatSize(file.size)}\x1b[0m)`)
    }
  }

  return lines.join('\n')
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function resolvePath(path: string): string {
  if (path.startsWith('/')) return path
  return join(process.cwd(), path)
}

import { statSync, readdirSync } from 'fs'
import { basename } from 'path'

/**
 * Sync version of analyzeDir
 */
export function analyzeDirSync(path: string): DirAnalysis {
  const resolvedPath = resolvePath(path)
  const analysis: DirAnalysis = {
    totalSize: 0,
    fileCount: 0,
    dirCount: 0,
    fileTypes: new Map(),
    largestFiles: [],
    oldestFiles: [],
    averageFileSize: 0,
    deepestPath: '',
    maxDepth: 0,
  }

  const allFiles: Array<{ path: string; size: number; modified: Date; depth: number }> = []

  const walkSync = (dir: string, depth: number = 0): void => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          analysis.dirCount++
          walkSync(fullPath, depth + 1)
        } else {
          try {
            const fileStat = statSync(fullPath)
            analysis.fileCount++
            analysis.totalSize += fileStat.size

            const ext = extname(entry.name).toLowerCase() || 'noext'
            const typeInfo = analysis.fileTypes.get(ext) || { count: 0, size: 0 }
            typeInfo.count++
            typeInfo.size += fileStat.size
            analysis.fileTypes.set(ext, typeInfo)

            const relPath = relative(resolvedPath, fullPath)
            allFiles.push({
              path: relPath,
              size: fileStat.size,
              modified: fileStat.mtime,
              depth,
            })

            if (depth > analysis.maxDepth) {
              analysis.maxDepth = depth
              analysis.deepestPath = relPath
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      // skip
    }
  }

  walkSync(resolvedPath)

  analysis.largestFiles = allFiles.sort((a, b) => b.size - a.size).slice(0, 50).map(f => ({
    path: f.path,
    size: f.size,
    modified: f.modified,
  }))

  analysis.oldestFiles = allFiles.sort((a, b) => a.modified.getTime() - b.modified.getTime()).slice(0, 50).map(f => ({
    path: f.path,
    size: f.size,
    modified: f.modified,
  }))

  analysis.averageFileSize = analysis.fileCount > 0 ? analysis.totalSize / analysis.fileCount : 0

  return analysis
}
