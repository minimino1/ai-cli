// ─── Code Review Context Builder ───────────────────────────────────────
// Build intelligent context for code reviews with smart file selection

import { readFile, stat } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'
import { parseImports, getImportedFiles, detectLanguage } from './imports'

export interface ReviewContextOptions {
  includeImports?: boolean      // Include directly imported files
  includeTests?: boolean        // Include test files
  includeTypes?: boolean        // Include type definitions
  maxFiles?: number             // Maximum files to include
  maxTokens?: number            // Maximum tokens (approximate)
  prioritize?: ('imports' | 'tests' | 'types' | 'related' | 'utils')[] // Priority order
}

export interface ContextFile {
  path: string
  content: string
  language: string
  size: number
  tokens: number
  priority: number
  reason: string
}

export interface ReviewContext {
  files: ContextFile[]
  totalFiles: number
  totalTokens: number
  skippedFiles: number
  warnings: string[]
}

// ─── Token Estimation ────────────────────────────────────────────────
function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for code
  // More accurate: ~1 token per word + punctuation
  return Math.ceil(text.length / 4)
}

// ─── Calculate Priority ───────────────────────────────────────────────
function calculatePriority(
  filePath: string,
  mainFile: string,
  options: ReviewContextOptions
): { priority: number; reason: string } {
  const priorities = options.prioritize || ['imports', 'tests', 'types', 'related', 'utils']
  const ext = extname(filePath).toLowerCase()
  const baseName = basename(filePath)
  const dir = dirname(filePath)

  // Same file gets highest priority
  if (filePath === mainFile) {
    return { priority: 100, reason: 'main file' }
  }

  // Check each priority category
  for (const category of priorities) {
    switch (category) {
      case 'imports':
        // Direct imports of main file
        if (dir === dirname(mainFile) && !baseName.includes('.test') && !baseName.includes('.spec')) {
          return { priority: 90, reason: 'direct import' }
        }
        break

      case 'tests':
        if (baseName.includes('.test') || baseName.includes('.spec') || baseName.endsWith('.test') || baseName.endsWith('.spec')) {
          return { priority: 80, reason: 'test file' }
        }
        break

      case 'types':
        if (ext === '.d.ts' || baseName.includes('.types') || baseName.includes('.type')) {
          return { priority: 70, reason: 'type definition' }
        }
        break

      case 'related':
        // Same directory, similar name
        if (dir === dirname(mainFile)) {
          return { priority: 60, reason: 'same directory' }
        }
        // Similar base name (e.g., Button.tsx and Button.test.tsx)
        const mainBase = basename(mainFile, extname(mainFile))
        if (baseName.startsWith(mainBase) || mainBase.startsWith(basename(filePath, ext))) {
          return { priority: 60, reason: 'related file' }
        }
        break

      case 'utils':
        if (dir.includes('utils') || dir.includes('helpers') || dir.includes('lib')) {
          return { priority: 50, reason: 'utility' }
        }
        break
    }
  }

  return { priority: 10, reason: 'other' }
}

// ─── Build Context Files List ─────────────────────────────────────────
export async function buildReviewContext(
  mainFile: string,
  options: ReviewContextOptions = {}
): Promise<ReviewContext> {
  const {
    includeImports = true,
    includeTests = false,
    includeTypes = false,
    maxFiles = 20,
    maxTokens = 100000, // ~25k words, safe for most AI contexts
    prioritize = ['imports', 'tests', 'types', 'related', 'utils'],
  } = options

  const contextFiles: ContextFile[] = []
  const warnings: string[] = []
  const candidateFiles = new Map<string, ContextFile>()

  // 1. Always include main file
  try {
    const mainContent = await readFile(mainFile, 'utf-8')
    const mainLang = detectLanguage(mainFile) || 'text'
    const mainTokens = estimateTokens(mainContent)

    candidateFiles.set(mainFile, {
      path: mainFile,
      content: mainContent,
      language: mainLang,
      size: mainContent.length,
      tokens: mainTokens,
      priority: 100,
      reason: 'main file',
    })
  } catch (error: any) {
    warnings.push(`Could not read main file: ${error.message}`)
    return { files: [], totalFiles: 0, totalTokens: 0, skippedFiles: 0, warnings }
  }

  // 2. Include imports if requested
  if (includeImports) {
    try {
      const importedFiles = await getImportedFiles(mainFile)

      for (const importedFile of importedFiles) {
        try {
          const content = await readFile(importedFile, 'utf-8')
          const language = detectLanguage(importedFile) || 'text'
          const tokens = estimateTokens(content)
          const { priority, reason } = calculatePriority(importedFile, mainFile, options)

          candidateFiles.set(importedFile, {
            path: importedFile,
            content,
            language,
            size: content.length,
            tokens,
            priority,
            reason,
          })
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // Import analysis failed, continue
    }
  }

  // 3. Find related files (tests, types, etc.)
  const mainDir = dirname(mainFile)
  const mainBase = basename(mainFile, extname(mainFile))

  try {
    const entries = await stat(mainDir).then(() => []).catch(() => [])
    // We'll use readdir instead
  } catch {
    // Can't read directory
  }

  // Try to find test files
  if (includeTests || includeTypes) {
    try {
      const dirEntries = await readFile(mainDir, 'utf-8') // This will fail, we need readdir
    } catch {
      // Use a different approach
    }
  }

  // Actually, let's use readdir properly
  try {
    const { readdir } = await import('node:fs/promises')
    const dirFiles = await readdir(mainDir)

    for (const file of dirFiles) {
      const fullPath = join(mainDir, file)
      if (fullPath === mainFile) continue

      const ext = extname(file).toLowerCase()
      const base = basename(file)

      // Check if it's a test file
      const isTest = base.includes('.test') || base.includes('.spec') || base.endsWith('.test') || base.endsWith('.spec')
      if (isTest && !includeTests) continue

      // Check if it's a type definition
      const isType = ext === '.d.ts' || base.includes('.types') || base.includes('.type')
      if (isType && !includeTypes) continue

      // Skip node_modules and hidden files
      if (file.startsWith('.') || file === 'node_modules') continue

      try {
        const content = await readFile(fullPath, 'utf-8')
        const language = detectLanguage(fullPath) || 'text'
        const tokens = estimateTokens(content)
        const { priority, reason } = calculatePriority(fullPath, mainFile, options)

        candidateFiles.set(fullPath, {
          path: fullPath,
          content,
          language,
          size: content.length,
          tokens,
          priority,
          reason,
        })
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Could not read directory
  }

  // 4. Sort by priority and token count
  const sorted = Array.from(candidateFiles.values()).sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    // Within same priority, prefer smaller files
    return a.tokens - b.tokens
  })

  // 5. Apply limits
  let totalTokens = 0
  const selectedFiles: ContextFile[] = []
  let skippedCount = 0

  for (const file of sorted) {
    // Check max files
    if (selectedFiles.length >= maxFiles) {
      skippedCount++
      continue
    }

    // Check max tokens (with some buffer)
    if (totalTokens + file.tokens > maxTokens) {
      // If this is the main file, include it anyway
      if (file.priority === 100) {
        selectedFiles.push(file)
        totalTokens += file.tokens
      } else {
        skippedCount++
        continue
      }
    } else {
      selectedFiles.push(file)
      totalTokens += file.tokens
    }
  }

  // 6. Sort final list by priority
  selectedFiles.sort((a, b) => b.priority - a.priority)

  return {
    files: selectedFiles,
    totalFiles: selectedFiles.length,
    totalTokens,
    skippedFiles: skippedCount + (candidateFiles.size - selectedFiles.length),
    warnings,
  }
}

// ─── Smart Context Selection ──────────────────────────────────────────
export async function selectContextFiles(
  mainFile: string,
  options: ReviewContextOptions = {}
): Promise<{ files: ContextFile[]; warnings: string[] }> {
  const context = await buildReviewContext(mainFile, options)

  if (context.skippedFiles > 0) {
    context.warnings.push(`Skipped ${context.skippedFiles} files due to limits (maxFiles: ${options.maxFiles}, maxTokens: ${options.maxTokens})`)
  }

  return { files: context.files, warnings: context.warnings }
}

// ─── Token Counting for AI Context ────────────────────────────────────
export function countTokens(files: ContextFile[]): number {
  return files.reduce((sum, file) => sum + file.tokens, 0)
}

// ─── Format Context for AI ────────────────────────────────────────────
export function formatContextForAI(files: ContextFile[]): string {
  const parts: string[] = []

  for (const file of files) {
    parts.push(`\n${'='.repeat(60)}`)
    parts.push(`File: ${file.path} (${file.language})`)
    parts.push(`${'='.repeat(60)}`)
    parts.push(file.content)
  }

  return parts.join('\n')
}
