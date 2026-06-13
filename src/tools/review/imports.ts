// ─── Import Analysis ────────────────────────────────────────────────────
// Parse imports, resolve paths, build dependency graphs

import { readFile, stat } from 'node:fs/promises'
import { join, extname, basename, dirname, isAbsolute, resolve } from 'node:path'

export interface ImportInfo {
  source: string
  resolvedPath?: string
  type: 'relative' | 'absolute' | 'package' | 'builtin' | 'unknown'
  line?: number
  namedImports?: string[]
  defaultImport?: string
  namespaceImport?: boolean
}

export interface DependencyNode {
  file: string
  imports: ImportInfo[]
  importedBy: string[]
  depth: number
}

// ─── Supported Languages ─────────────────────────────────────────────
const languageExtensions = {
  typescript: ['.ts', '.tsx', '.d.ts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py'],
  go: ['.go'],
  rust: ['.rs'],
  ruby: ['.rb'],
  java: ['.java'],
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx', '.hh'],
}

// ─── Detect Language ─────────────────────────────────────────────────
export function detectLanguage(filename: string): string | null {
  const ext = extname(filename).toLowerCase()

  for (const [lang, exts] of Object.entries(languageExtensions)) {
    if (exts.includes(ext)) {
      return lang
    }
  }

  return null
}

// ─── Parse Imports from Content ───────────────────────────────────────
export async function parseImports(content: string, language: string): Promise<ImportInfo[]> {
  const imports: ImportInfo[] = []
  const lines = content.split('\n')

  if (language === 'typescript' || language === 'javascript') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip comments
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        continue
      }

      // Match: import X from 'path'
      // Match: import { X, Y } from 'path'
      // Match: import * as X from 'path'
      // Match: import 'path' (side-effect only)
      // Match: const X = require('path')
      // Match: from module import X (Python)
      const importMatch = line.match(/^(?:import|from\s+\S+\s+import|const\s+\w+\s*=\s*require)\s/)
      if (!importMatch) continue

      // Extract source path using a simple approach
      const quoteMatch = line.match(/['"]([^'"]+)['"]/)
      if (!quoteMatch) continue

      const source = quoteMatch[1]
      const isNamespace = /\*\s+as\s+\w+/.test(line)
      const namedImportsMatch = line.match(/\{([^}]+)\}/)
      const namedImportsStr = namedImportsMatch ? namedImportsMatch[1] : null
      const defaultImportMatch = line.match(/import\s+(\w+)\s+from/)
      const defaultImport = defaultImportMatch ? defaultImportMatch[1] : null

      const importInfo: ImportInfo = {
        source,
        line: i + 1,
        type: 'unknown',
        namespaceImport: isNamespace,
      }

      if (isNamespace) {
        importInfo.namespaceImport = true
      }

      if (namedImportsStr) {
        // Parse named imports: { A, B as C }
        const namedImports = namedImportsStr
          .split(',')
          .map(imp => imp.trim())
          .filter(imp => imp)
        importInfo.namedImports = namedImports
      }

      if (defaultImport && !namedImportsStr && !isNamespace) {
        importInfo.defaultImport = defaultImport
      }

      // Classify import type
      if (source.startsWith('.')) {
        importInfo.type = 'relative'
      } else if (source.startsWith('/') || source.startsWith('http://') || source.startsWith('https://')) {
        importInfo.type = 'absolute'
      } else if (source.startsWith('@')) {
        importInfo.type = 'package' // Scoped package
      } else if (!source.includes('.') && !source.includes('/')) {
        importInfo.type = 'builtin' // Node.js built-in or package
      }

      imports.push(importInfo)
    }
  } else if (language === 'python') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip comments
      if (line.startsWith('#')) {
        continue
      }

      // Match: import module
      // Match: import module as alias
      // Match: from module import X
      // Match: from module import X, Y
      // Match: from module import *

      const importRegex = /^(?:import\s+([\w\.]+)(?:\s+as\s+(\w+))?|from\s+([\w\.]+)\s+import\s+(\*|[^\n]+))/g

      let match
      while ((match = importRegex.exec(line)) !== null) {
        const [, module, alias, fromModule, imported] = match

        if (module) {
          imports.push({
            source: module,
            type: module.startsWith('.') ? 'relative' : 'package',
            defaultImport: alias || undefined,
          })
        } else if (fromModule) {
          const importInfo: ImportInfo = {
            source: fromModule,
            type: fromModule.startsWith('.') ? 'relative' : 'package',
          }

          if (imported === '*') {
            importInfo.namespaceImport = true
          } else {
            importInfo.namedImports = imported.split(',').map(imp => imp.trim())
          }

          imports.push(importInfo)
        }
      }
    }
  }

  return imports
}

// ─── Resolve Import Path ──────────────────────────────────────────────
export async function resolveImport(importPath: string, fromFile: string): Promise<string | null> {
  try {
    // Skip built-ins and packages
    if (importPath.startsWith('@') || !importPath.startsWith('.')) {
      return null // Not a local file
    }

    // Resolve relative path
    const baseDir = dirname(fromFile)
    let resolved = resolve(baseDir, importPath)

    // Try with extensions
    const extensions = ['', '.ts', '.tsx', '.d.ts', '.js', '.jsx', '.json', '.py', '.go', '.rs']

    for (const ext of extensions) {
      const fullPath = resolved + ext
      try {
        const fileStat = await stat(fullPath)
        if (fileStat.isFile()) {
          return fullPath
        }
      } catch {
        // Try next extension
      }
    }

    // Try as directory with index file
    try {
      const dirStat = await stat(resolved)
      if (dirStat.isDirectory()) {
        for (const indexFile of ['index.ts', 'index.tsx', 'index.js', 'index.jsx', '__init__.py']) {
          try {
            const indexPath = join(resolved, indexFile)
            const fileStat = await stat(indexPath)
            if (fileStat.isFile()) {
              return indexPath
            }
          } catch {
            // Continue
          }
        }
      }
    } catch {
      // Not a directory
    }
  } catch (error) {
    // Could not resolve
  }

  return null
}

// ─── Get All Imported Files ───────────────────────────────────────────
export async function getImportedFiles(filePath: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(filePath)) {
    return []
  }
  visited.add(filePath)

  const importedFiles: string[] = []

  try {
    const content = await readFile(filePath, 'utf-8')
    const language = detectLanguage(filePath)

    if (!language) {
      return []
    }

    const imports = await parseImports(content, language)

    for (const imp of imports) {
      const resolved = await resolveImport(imp.source, filePath)
      if (resolved) {
        importedFiles.push(resolved)
        // Recursively get imports of imported file
        const nestedImports = await getImportedFiles(resolved, visited)
        importedFiles.push(...nestedImports)
      }
    }
  } catch (error) {
    // Could not read file or parse
  }

  return [...new Set(importedFiles)] // Deduplicate
}

// ─── Build Dependency Graph ───────────────────────────────────────────
export async function buildDependencyGraph(entryFile: string): Promise<DependencyNode[]> {
  const nodes = new Map<string, DependencyNode>()
  const visited = new Set<string>()

  async function buildNode(filePath: string, depth: number = 0): Promise<void> {
    if (visited.has(filePath)) {
      return
    }
    visited.add(filePath)

    try {
      const content = await readFile(filePath, 'utf-8')
      const language = detectLanguage(filePath)

      if (!language) {
        return
      }

      const imports = await parseImports(content, language)
      const resolvedImports: ImportInfo[] = []

      for (const imp of imports) {
        const resolved = await resolveImport(imp.source, filePath)
        if (resolved) {
          resolvedImports.push({ ...imp, resolvedPath: resolved })
        }
      }

      const node: DependencyNode = {
        file: filePath,
        imports: resolvedImports,
        importedBy: [],
        depth,
      }

      nodes.set(filePath, node)

      // Recursively build child nodes
      for (const imp of resolvedImports) {
        if (imp.resolvedPath) {
          await buildNode(imp.resolvedPath, depth + 1)
        }
      }
    } catch (error) {
      // Could not process file
    }
  }

  await buildNode(entryFile)

  // Build importedBy relationships
  for (const [filePath, node] of nodes) {
    for (const imp of node.imports) {
      if (imp.resolvedPath && nodes.has(imp.resolvedPath)) {
        nodes.get(imp.resolvedPath)!.importedBy.push(filePath)
      }
    }
  }

  return Array.from(nodes.values())
}

// ─── Find Circular Dependencies ───────────────────────────────────────
export async function findCircularDeps(entryFile: string): Promise<string[][]> {
  const graph = await buildDependencyGraph(entryFile)
  const cycles: string[][] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  function dfs(filePath: string): boolean {
    if (visiting.has(filePath)) {
      // Found cycle
      const cycleStart = stack.indexOf(filePath)
      if (cycleStart !== -1) {
        cycles.push([...stack.slice(cycleStart), filePath])
      }
      return true
    }

    if (visited.has(filePath)) {
      return false
    }

    visiting.add(filePath)
    stack.push(filePath)

    const node = graph.find(n => n.file === filePath)
    if (node) {
      for (const imp of node.imports) {
        if (imp.resolvedPath && dfs(imp.resolvedPath)) {
          return true
        }
      }
    }

    stack.pop()
    visiting.delete(filePath)
    visited.add(filePath)

    return false
  }

  dfs(entryFile)

  return cycles
}
