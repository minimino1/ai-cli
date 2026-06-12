import { readFile, stat } from 'fs/promises'
import { createHash } from 'crypto'
import { join, extname } from 'path'

export interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
  lineNum?: number
}

export interface DiffResult {
  hunks: Array<{
    oldStart: number
    oldLines: number
    newStart: number
    newLines: number
    lines: DiffLine[]
  }>
  totalAdded: number
  totalRemoved: number
  totalChanged: number
}

export interface DuplicateGroup {
  hash: string
  files: Array<{
    path: string
    size: number
    modified: Date
  }>
}

export interface CompareDirsResult {
  onlyInDir1: string[]
  onlyInDir2: string[]
  different: Array<{
    path: string
    reason: 'size' | 'content' | 'permissions'
  }>
  identical: string[]
}

/**
 * Calculate MD5 hash of a file
 */
export async function fileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath)
  return createHash('md5').update(content).digest('hex')
}

/**
 * Line-by-line diff between two files
 */
export async function diffFiles(file1: string, file2: string): Promise<DiffResult> {
  const [content1, content2] = await Promise.all([
    readFile(file1, 'utf-8'),
    readFile(file2, 'utf-8'),
  ])

  const lines1 = content1.split('\n')
  const lines2 = content2.split('\n')

  // Simple LCS-based diff (Myers algorithm simplified)
  const hunks: DiffResult['hunks'] = []
  let i = 0, j = 0
  let hunkStartI = 0, hunkStartJ = 0
  let inHunk = false

  const maxLen = Math.max(lines1.length, lines2.length)
  const contextLines = 3

  // Simplified diff - find matching lines
  while (i < lines1.length || j < lines2.length) {
    if (i < lines1.length && j < lines2.length && lines1[i] === lines2[j]) {
      // Lines match
      if (inHunk) {
        // Close current hunk
        hunks.push({
          oldStart: hunkStartI + 1,
          oldLines: i - hunkStartI,
          newStart: hunkStartJ + 1,
          newLines: j - hunkStartJ,
          lines: [],
        })
        inHunk = false
      }
      i++
      j++
    } else {
      // Lines differ
      if (!inHunk) {
        hunkStartI = i
        hunkStartJ = j
        inHunk = true
      }

      // Look ahead for matches
      let foundMatch = false
      const lookAhead = Math.min(10, lines1.length - i, lines2.length - j)

      for (let k = 1; k <= lookAhead; k++) {
        if (i + k < lines1.length && lines1[i + k] === lines2[j]) {
          // Deletion in file1
          i += k
          foundMatch = true
          break
        }
        if (j + k < lines2.length && lines1[i] === lines2[j + k]) {
          // Addition in file2
          j += k
          foundMatch = true
          break
        }
      }

      if (!foundMatch) {
        // No match found, advance both
        if (i < lines1.length) i++
        if (j < lines2.length) j++
      }
    }
  }

  // Close final hunk
  if (inHunk) {
    hunks.push({
      oldStart: hunkStartI + 1,
      oldLines: i - hunkStartI,
      newStart: hunkStartJ + 1,
      newLines: j - hunkStartJ,
      lines: [],
    })
  }

  // Calculate stats
  let totalAdded = 0, totalRemoved = 0, totalChanged = 0
  for (const hunk of hunks) {
    for (let lineNum = 0; lineNum < Math.max(hunk.oldLines, hunk.newLines); lineNum++) {
      const oldLine = lines1[hunk.oldStart - 1 + lineNum]
      const newLine = lines2[hunk.newStart - 1 + lineNum]

      if (oldLine !== undefined && newLine !== undefined && oldLine !== newLine) {
        totalChanged++
      } else if (oldLine !== undefined && newLine === undefined) {
        totalRemoved++
      } else if (oldLine === undefined && newLine !== undefined) {
        totalAdded++
      }
    }
  }

  return { hunks, totalAdded, totalRemoved, totalChanged }
}

/**
 * Format diff with colors (ANSI escape codes)
 */
export function formatDiff(diff: DiffResult, useColors: boolean = true): string {
  const lines: string[] = []
  const colors = {
    added: useColors ? '\x1b[32m' : '', // green
    removed: useColors ? '\x1b[31m' : '', // red
    context: useColors ? '\x1b[90m' : '', // dim
    reset: useColors ? '\x1b[0m' : '',
  }

  lines.push(`\x1b[1m=== Diff ===\x1b[0m`)
  lines.push(`Added: ${diff.totalAdded}, Removed: ${diff.totalRemoved}, Changed: ${diff.totalChanged}`)
  lines.push('')

  for (const hunk of diff.hunks) {
    lines.push(`\x1b[36m@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\x1b[0m`)

    const maxLines = Math.max(hunk.oldLines, hunk.newLines)
    for (let i = 0; i < maxLines; i++) {
      const oldLine = i < hunk.oldLines ? (lines1[hunk.oldStart - 1 + i] ?? '') : undefined
      const newLine = i < hunk.newLines ? (lines2[hunk.newStart - 1 + i] ?? '') : undefined

      if (oldLine !== undefined && newLine !== undefined) {
        if (oldLine === newLine) {
          lines.push(`${colors.context}  ${oldLine}${colors.reset}`)
        } else {
          lines.push(`${colors.removed}- ${oldLine}${colors.reset}`)
          lines.push(`${colors.added}+ ${newLine}${colors.reset}`)
        }
      } else if (oldLine !== undefined) {
        lines.push(`${colors.removed}- ${oldLine}${colors.reset}`)
      } else if (newLine !== undefined) {
        lines.push(`${colors.added}+ ${newLine}${colors.reset}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

// Helper to get lines arrays (would need to be passed in real implementation)
let lines1: string[] = []
let lines2: string[] = []

// Store lines globally for formatDiff (simplified approach)
function setLinesForFormatting(l1: string[], l2: string[]) {
  lines1 = l1
  lines2 = l2
}

/**
 * Compare two directories
 */
export async function compareDirs(dir1: string, dir2: string): Promise<CompareDirsResult> {
  const result: CompareDirsResult = {
    onlyInDir1: [],
    onlyInDir2: [],
    different: [],
    identical: [],
  }

  // Get all files recursively
  const files1 = await listFilesRecursive(dir1)
  const files2 = await listFilesRecursive(dir2)

  const base1 = dir1.endsWith('/') ? dir1.slice(0, -1) : dir1
  const base2 = dir2.endsWith('/') ? dir2.slice(0, -1) : dir2

  // Find files only in dir1
  for (const file of files1) {
    const relPath = relative(base1, file)
    if (!files2.has(relPath)) {
      result.onlyInDir1.push(relPath)
    }
  }

  // Find files only in dir2
  for (const file of files2) {
    const relPath = relative(base2, file)
    if (!files1.has(relPath)) {
      result.onlyInDir2.push(relPath)
    }
  }

  // Compare common files
  const commonFiles = files1.filter((_, idx) => {
    const relPath = relative(base1, Array.from(files1.keys())[idx])
    return files2.has(relPath)
  })

  for (const [relPath, file1] of files1) {
    if (files2.has(relPath)) {
      const file2 = files2.get(relPath)!

      try {
        const stat1 = await stat(file1)
        const stat2 = await stat(file2)

        if (stat1.size !== stat2.size) {
          result.different.push({ path: relPath, reason: 'size' })
        } else {
          // Check content hash
          const hash1 = await fileHash(file1)
          const hash2 = await fileHash(file2)
          if (hash1 !== hash2) {
            result.different.push({ path: relPath, reason: 'content' })
          } else {
            result.identical.push(relPath)
          }
        }
      } catch {
        result.different.push({ path: relPath, reason: 'permissions' })
      }
    }
  }

  return result
}

/**
 * Find duplicate files by hash
 */
export async function findDuplicates(path: string): Promise<DuplicateGroup[]> {
  const files = await listFilesRecursive(path)
  const hashMap = new Map<string, DuplicateGroup['files']>()

  for (const [relPath, fullPath] of files) {
    try {
      const hash = await fileHash(fullPath)
      const fileStat = await stat(fullPath)

      if (!hashMap.has(hash)) {
        hashMap.set(hash, [])
      }
      hashMap.get(hash)!.push({
        path: relPath,
        size: fileStat.size,
        modified: fileStat.mtime,
      })
    } catch {
      // Skip files that can't be read
    }
  }

  // Filter to only groups with duplicates
  const groups: DuplicateGroup[] = []
  for (const [hash, files] of hashMap) {
    if (files.length > 1) {
      groups.push({ hash, files })
    }
  }

  // Sort by size (largest first)
  groups.sort((a, b) => {
    const sizeA = a.files[0].size
    const sizeB = b.files[0].size
    return sizeB - sizeA
  })

  return groups
}

/**
 * Recursively list all files
 */
async function listFilesRecursive(dir: string): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  const baseDir = dir.endsWith('/') ? dir.slice(0, -1) : dir

  const walk = async (currentDir: string): Promise<void> => {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue // Skip hidden

        const fullPath = join(currentDir, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          const relPath = relative(baseDir, fullPath)
          files.set(relPath, fullPath)
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walk(dir)
  return files
}

// Import for sync version
import { readdirSync, statSync } from 'fs'

/**
 * Sync version of diffFiles
 */
export function diffFilesSync(file1: string, file2: string): DiffResult {
  const content1 = readFileSync(file1, 'utf-8')
  const content2 = readFileSync(file2, 'utf-8')

  const l1 = content1.split('\n')
  const l2 = content2.split('\n')
  setLinesForFormatting(l1, l2)

  // Same algorithm as async version
  const hunks: DiffResult['hunks'] = []
  let i = 0, j = 0
  let hunkStartI = 0, hunkStartJ = 0
  let inHunk = false

  while (i < l1.length || j < l2.length) {
    if (i < l1.length && j < l2.length && l1[i] === l2[j]) {
      if (inHunk) {
        hunks.push({
          oldStart: hunkStartI + 1,
          oldLines: i - hunkStartI,
          newStart: hunkStartJ + 1,
          newLines: j - hunkStartJ,
          lines: [],
        })
        inHunk = false
      }
      i++
      j++
    } else {
      if (!inHunk) {
        hunkStartI = i
        hunkStartJ = j
        inHunk = true
      }

      let foundMatch = false
      const lookAhead = Math.min(10, l1.length - i, l2.length - j)

      for (let k = 1; k <= lookAhead; k++) {
        if (i + k < l1.length && l1[i + k] === l2[j]) {
          i += k
          foundMatch = true
          break
        }
        if (j + k < l2.length && l1[i] === l2[j + k]) {
          j += k
          foundMatch = true
          break
        }
      }

      if (!foundMatch) {
        if (i < l1.length) i++
        if (j < l2.length) j++
      }
    }
  }

  if (inHunk) {
    hunks.push({
      oldStart: hunkStartI + 1,
      oldLines: i - hunkStartI,
      newStart: hunkStartJ + 1,
      newLines: j - hunkStartJ,
      lines: [],
    })
  }

  let totalAdded = 0, totalRemoved = 0, totalChanged = 0
  for (const hunk of hunks) {
    for (let lineNum = 0; lineNum < Math.max(hunk.oldLines, hunk.newLines); lineNum++) {
      const oldLine = hunk.oldStart - 1 + lineNum < l1.length ? l1[hunk.oldStart - 1 + lineNum] : undefined
      const newLine = hunk.newStart - 1 + lineNum < l2.length ? l2[hunk.newStart - 1 + lineNum] : undefined

      if (oldLine !== undefined && newLine !== undefined && oldLine !== newLine) {
        totalChanged++
      } else if (oldLine !== undefined && newLine === undefined) {
        totalRemoved++
      } else if (oldLine === undefined && newLine !== undefined) {
        totalAdded++
      }
    }
  }

  return { hunks, totalAdded, totalRemoved, totalChanged }
}

import { readFileSync } from 'fs'
