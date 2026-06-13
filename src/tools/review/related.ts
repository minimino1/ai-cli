// ─── Related File Detection ─────────────────────────────────────────────
// Find related files using heuristics: same directory, similar names, imports

import { readFile, stat } from 'node:fs/promises'
import { join, extname, basename, dirname, resolve } from 'node:path'
import { parseImports, detectLanguage } from './imports'

export interface RelatedFile {
  path: string
  relationship: 'test' | 'source' | 'types' | 'styles' | 'component' | 'related'
  confidence: number // 0-100
  reason: string
}

// ─── Find Test File for Source ─────────────────────────────────────────
/**
 * Find the corresponding test file for a source file
 */
export async function findTestFile(sourceFile: string): Promise<string | null> {
  const sourceDir = dirname(sourceFile)
  const sourceBase = basename(sourceFile, extname(sourceFile))
  const sourceExt = extname(sourceFile).toLowerCase()

  // Common test file patterns
  const testPatterns = [
    `${sourceBase}.test${sourceExt}`,
    `${sourceBase}.spec${sourceExt}`,
    `${sourceBase}.test.ts`,
    `${sourceBase}.spec.ts`,
    `${sourceBase}.test.tsx`,
    `${sourceBase}.spec.tsx`,
    `${sourceBase}.test.js`,
    `${sourceBase}.spec.js`,
    `${sourceBase}.test.jsx`,
    `${sourceBase}.spec.jsx`,
    // Also try with .test before extension
    ...(sourceExt ? [`${sourceBase}.test${sourceExt}`, `${sourceBase}.spec${sourceExt}`] : []),
  ]

  // Also try __tests__ directory
  const testDirPatterns = [
    join(sourceDir, '__tests__', `${sourceBase}.test${sourceExt}`),
    join(sourceDir, '__tests__', `${sourceBase}.spec${sourceExt}`),
    join(sourceDir, 'tests', `${sourceBase}.test${sourceExt}`),
    join(sourceDir, 'tests', `${sourceBase}.spec${sourceExt}`),
    join(sourceDir, 'test', `${sourceBase}.test${sourceExt}`),
    join(sourceDir, 'test', `${sourceBase}.spec${sourceExt}`),
  ]

  const allPatterns = [...testPatterns, ...testDirPatterns]

  for (const pattern of allPatterns) {
    try {
      const fileStat = await stat(pattern)
      if (fileStat.isFile()) {
        return pattern
      }
    } catch {
      // Continue to next pattern
    }
  }

  return null
}

// ─── Find Source File for Test ────────────────────────────────────────
/**
 * Find the source file for a test file
 */
export async function findSourceFile(testFile: string): Promise<string | null> {
  const testDir = dirname(testFile)
  const testBase = basename(testFile, extname(testFile))

  // Remove .test or .spec from filename
  const sourceBase = testBase
    .replace(/\.test$/, '')
    .replace(/\.spec$/, '')
    .replace(/\.test\./, '.')
    .replace(/\.spec\./, '.')

  const sourceExt = extname(testFile).toLowerCase()

  // Try same directory
  const sameDirPatterns = [
    join(testDir, `${sourceBase}${sourceExt}`),
    join(testDir, `${sourceBase}.ts`),
    join(testDir, `${sourceBase}.tsx`),
    join(testDir, `${sourceBase}.js`),
    join(testDir, `${sourceBase}.jsx`),
  ]

  // Try parent directory
  const parentDir = dirname(testDir)
  const parentPatterns = [
    join(parentDir, `${sourceBase}${sourceExt}`),
    join(parentDir, `${sourceBase}.ts`),
    join(parentDir, `${sourceBase}.tsx`),
    join(parentDir, `${sourceBase}.js`),
    join(parentDir, `${sourceBase}.jsx`),
  ]

  const allPatterns = [...sameDirPatterns, ...parentPatterns]

  for (const pattern of allPatterns) {
    try {
      const fileStat = await stat(pattern)
      if (fileStat.isFile()) {
        return pattern
      }
    } catch {
      // Continue
    }
  }

  return null
}

// ─── Find Types File ───────────────────────────────────────────────────
/**
 * Find type definition file (.d.ts or types file)
 */
export async function findTypesFile(filePath: string): Promise<string | null> {
  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const ext = extname(filePath).toLowerCase()

  // Common patterns
  const patterns = [
    join(dir, `${base}.d.ts`),
    join(dir, `${base}.types.ts`),
    join(dir, `${base}.type.ts`),
    join(dir, `${base}.types.tsx`),
    join(dir, `${base}.type.tsx`),
    join(dir, `${base}.d.cts`), // For TypeScript config
  ]

  // Also check for separate types directory
  const typesDir = join(dir, 'types')
  const typesDirPatterns = [
    join(typesDir, `${base}.d.ts`),
    join(typesDir, `${base}.ts`),
  ]

  const allPatterns = [...patterns, ...typesDirPatterns]

  for (const pattern of allPatterns) {
    try {
      const fileStat = await stat(pattern)
      if (fileStat.isFile()) {
        return pattern
      }
    } catch {
      // Continue
    }
  }

  return null
}

// ─── Find Related Files by Name ───────────────────────────────────────
/**
 * Find files with similar names in the same directory
 */
export async function findFilesBySimilarName(filePath: string): Promise<string[]> {
  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const related: string[] = []

  try {
    const { readdir } = await import('node:fs/promises')
    const files = await readdir(dir)

    for (const file of files) {
      if (file.startsWith('.') || file === 'node_modules') continue

      const fullPath = join(dir, file)
      const fileBase = basename(file, extname(file))

      // Check if name is similar
      if (
        fileBase === base ||
        fileBase.startsWith(base) ||
        base.startsWith(fileBase) ||
        fileBase.includes(base) ||
        base.includes(fileBase)
      ) {
        if (fullPath !== filePath) {
          related.push(fullPath)
        }
      }
    }
  } catch {
    // Could not read directory
  }

  return related
}

// ─── Find Style Files ──────────────────────────────────────────────────
/**
 * Find associated style files (CSS, SCSS, CSS Modules)
 */
export async function findStyleFiles(filePath: string): Promise<string[]> {
  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const styles: string[] = []

  const patterns = [
    join(dir, `${base}.css`),
    join(dir, `${base}.scss`),
    join(dir, `${base}.sass`),
    join(dir, `${base}.less`),
    join(dir, `${base}.module.css`),
    join(dir, `${base}.module.scss`),
    join(dir, `${base}.module.sass`),
    join(dir, `${base}.module.less`),
    join(dir, `styles.ts`),
    join(dir, `style.ts`),
    join(dir, `${base}.styles.ts`),
  ]

  for (const pattern of patterns) {
    try {
      const fileStat = await stat(pattern)
      if (fileStat.isFile()) {
        styles.push(pattern)
      }
    } catch {
      // Continue
    }
  }

  return styles
}

// ─── Main: Find Related Files ─────────────────────────────────────────
/**
 * Find all related files using multiple heuristics
 */
export async function findRelatedFiles(filePath: string): Promise<RelatedFile[]> {
  const related: RelatedFile[] = []

  // 1. Check for test file
  const testFile = await findTestFile(filePath)
  if (testFile) {
    related.push({
      path: testFile,
      relationship: 'test',
      confidence: 95,
      reason: 'found test file by naming convention',
    })
  }

  // 2. Check for source file (if this is a test)
  const isTest = basename(filePath).includes('.test') || basename(filePath).includes('.spec')
  if (isTest) {
    const sourceFile = await findSourceFile(filePath)
    if (sourceFile) {
      related.push({
        path: sourceFile,
        relationship: 'source',
        confidence: 95,
        reason: 'found source file from test naming',
      })
    }
  }

  // 3. Check for types file
  const typesFile = await findTypesFile(filePath)
  if (typesFile) {
    related.push({
      path: typesFile,
      relationship: 'types',
      confidence: 90,
      reason: 'found type definition file',
    })
  }

  // 4. Check for style files (for components)
  const styleFiles = await findStyleFiles(filePath)
  for (const styleFile of styleFiles) {
    related.push({
      path: styleFile,
      relationship: 'styles',
      confidence: 85,
      reason: 'found associated style file',
    })
  }

  // 5. Find files with similar names
  const similarFiles = await findFilesBySimilarName(filePath)
  for (const similarFile of similarFiles) {
    // Avoid duplicates
    if (!related.find(r => r.path === similarFile)) {
      related.push({
        path: similarFile,
        relationship: 'related',
        confidence: 70,
        reason: 'similar filename',
      })
    }
  }

  // 6. Check imports (if it's a source file)
  try {
    const content = await readFile(filePath, 'utf-8')
    const language = detectLanguage(filePath)
    if (language && (language === 'typescript' || language === 'javascript' || language === 'python')) {
      const imports = await parseImports(content, language)

      for (const imp of imports) {
        if (imp.resolvedPath && !related.find(r => r.path === imp.resolvedPath)) {
          related.push({
            path: imp.resolvedPath,
            relationship: 'imports',
            confidence: 100,
            reason: `imported in ${filePath}`,
          })
        }
      }
    }
  } catch {
    // Could not parse imports
  }

  // Remove duplicates and sort by confidence
  const unique = Array.from(new Map(related.map(r => [r.path, r])).values())
  unique.sort((a, b) => b.confidence - a.confidence)

  return unique
}

// ─── Find All Related Recursively ─────────────────────────────────────
/**
 * Find related files recursively (up to depth N)
 */
export async function findRelatedRecursive(
  filePath: string,
  maxDepth: number = 2
): Promise<Map<string, { depth: number; path: string }>> {
  const result = new Map<string, { depth: number; path: string }>()
  const visited = new Set<string>()

  async function explore(file: string, depth: number): Promise<void> {
    if (depth > maxDepth || visited.has(file)) {
      return
    }
    visited.add(file)

    result.set(file, { depth, path: file })

    if (depth < maxDepth) {
      const related = await findRelatedFiles(file)
      for (const rel of related) {
        await explore(rel.path, depth + 1)
      }
    }
  }

  await explore(filePath, 0)
  return result
}
