// ─── Enhanced Review Commands ──────────────────────────────────────────
// Advanced code review commands with context, imports, tests, and more

import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import * as reviewContext from '../tools/review/context'
import * as reviewImports from '../tools/review/imports'
import * as reviewRelated from '../tools/review/related'
import { sendToAI } from '../providers/ai'
import type { Command, CommandContext, MessagePart } from '../types'

/**
 * Liest den Inhalt einer Datei und gibt den Text oder eine formatierte Fehlermeldung zurück.
 *
 * @param path - Pfad zur Datei
 * @returns Den UTF‑8-kodierten Dateiinhalt; bei Fehlern eine Zeichenkette beginnend mit `Error: Could not read file ${path} - ...`
 */
async function readFileContent(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch (error: any) {
    return `Error: Could not read file ${path} - ${error?.message || 'unknown error'}`
  }
}

/**
 * Ermittelt die Programmiersprache anhand der Dateierweiterung.
 *
 * @param filename - Pfad oder Dateiname; die Entscheidung basiert auf der Dateiendung
 * @returns Die erkannte Sprache (z. B. `typescript`, `python`, `javascript`) oder `'text'`, wenn die Erweiterung nicht zugeordnet ist
 */
function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    css: 'css',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
  }
  return langMap[ext] || 'text'
}

// ─── Enhanced Review Commands ─────────────────────────────────────────
export const reviewEnhancedCommands: Command[] = [
  // ─── Review with Context ────────────────────────────────────────────
  {
    name: 'review-context',
    description: 'Review code with imported files as context',
    aliases: ['review-c', 'rv-c'],
    args: ['<file> [--tests] [--types] [--max N]'],
    run: async (args, context) => {
      const parts = args.trim().split(/\s+/)
      const filePath = parts[0] || '.'

      const options: reviewContext.ReviewContextOptions = {
        includeImports: true,
        includeTests: false,
        includeTypes: false,
        maxFiles: 20,
        maxTokens: 100000,
      }

      // Parse flags
      for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '--tests') {
          options.includeTests = true
        } else if (parts[i] === '--types') {
          options.includeTypes = true
        } else if (parts[i] === '--max' && i + 1 < parts.length) {
          options.maxFiles = parseInt(parts[i + 1])
          i++
        }
      }

      const { files, warnings } = await reviewContext.selectContextFiles(filePath, options)

      if (files.length === 0) {
        return [{ type: 'text', text: 'No files found for review.' }]
      }

      // Build prompt with context
      const userParts: MessagePart[] = []

      for (const file of files) {
        userParts.push({
          type: 'file',
          filename: file.path,
          content: file.content,
          language: file.language,
        })
      }

      const prompt = `Please review the code in ${filePath} with the provided context files.\n\nFocus on:\n- Bugs and errors\n- Security issues\n- Performance problems\n- Best practices violations\n- Code smells\n\nContext files included: ${files.map(f => f.path).join(', ')}`

      const result = await sendToAI(
        [
          {
            id: Date.now().toString(),
            role: 'user',
            parts: [...userParts, { type: 'text', text: prompt }],
            timestamp: new Date(),
          },
        ],
        context.config.providers.find(p => p.id === context.config.activeProvider)!
      )

      return result
    },
  },

  // ─── Review with All Context ─────────────────────────────────────────
  {
    name: 'review-all',
    description: 'Review code with all available context (imports, tests, types)',
    aliases: ['review-a', 'rv-a'],
    args: ['<file> [--max N]'],
    run: async (args, context) => {
      const parts = args.trim().split(/\s+/)
      const filePath = parts[0] || '.'

      const options: reviewContext.ReviewContextOptions = {
        includeImports: true,
        includeTests: true,
        includeTypes: true,
        maxFiles: 30,
        maxTokens: 150000,
        prioritize: ['imports', 'tests', 'types', 'related', 'utils'],
      }

      if (parts.includes('--max') && parts.indexOf('--max') + 1 < parts.length) {
        options.maxFiles = parseInt(parts[parts.indexOf('--max') + 1])
      }

      const { files, warnings } = await reviewContext.selectContextFiles(filePath, options)

      const userParts: MessagePart[] = []

      for (const file of files) {
        userParts.push({
          type: 'file',
          filename: file.path,
          content: file.content,
          language: file.language,
        })
      }

      const prompt = `Perform a comprehensive code review of ${filePath} with full context.\n\nInclude analysis of:\n1. Correctness and bugs\n2. Security vulnerabilities\n3. Performance issues\n4. Code style and best practices\n5. Test coverage (if tests included)\n6. Architecture and design patterns\n7. Potential edge cases\n\nProvide specific line numbers and actionable fixes.`

      const result = await sendToAI(
        [
          {
            id: Date.now().toString(),
            role: 'user',
            parts: [...userParts, { type: 'text', text: prompt }],
            timestamp: new Date(),
          },
        ],
        context.config.providers.find(p => p.id === context.config.activeProvider)!
      )

      return result
    },
  },

  // ─── Explain with Imports ────────────────────────────────────────────
  {
    name: 'explain-imports',
    description: 'Explain code with import flow analysis',
    aliases: ['explain-i', 'e-i'],
    args: ['<file>'],
    run: async (args, context) => {
      const filePath = args.trim() || '.'

      // Get imports
      let imports: reviewImports.ImportInfo[] = []
      try {
        const content = await readFile(filePath, 'utf-8')
        const language = detectLanguage(filePath)
        imports = await reviewImports.parseImports(content, language)
      } catch (error: any) {
        return [{ type: 'text', text: `Error reading file: ${error.message}` }]
      }

      // Resolve imports to files
      const importedFiles: string[] = []
      for (const imp of imports) {
        if (imp.type === 'relative') {
          const resolved = await reviewImports.resolveImport(imp.source, filePath)
          if (resolved) {
            importedFiles.push(resolved)
          }
        }
      }

      // Build context
      const userParts: MessagePart[] = []

      // Add main file
      const mainContent = await readFileContent(filePath)
      userParts.push({
        type: 'file',
        filename: filePath,
        content: mainContent,
        language: detectLanguage(filePath),
      })

      // Add imported files
      for (const importedFile of importedFiles.slice(0, 10)) { // Limit to 10
        try {
          const content = await readFile(importedFile, 'utf-8')
          userParts.push({
            type: 'file',
            filename: importedFile,
            content,
            language: detectLanguage(importedFile),
          })
        } catch {
          // Skip
        }
      }

      const prompt = `Explain how this code works, including the flow through imported modules.\n\nImported modules: ${importedFiles.map(f => f.split('/').pop()).join(', ')}\n\nProvide:\n1. High-level overview\n2. Key functions/classes\n3. Data flow between modules\n4. Important dependencies\n5. Any potential issues`

      const result = await sendToAI(
        [
          {
            id: Date.now().toString(),
            role: 'user',
            parts: [...userParts, { type: 'text', text: prompt }],
            timestamp: new Date(),
          },
        ],
        context.config.providers.find(p => p.id === context.config.activeProvider)!
      )

      return result
    },
  },

  // ─── Explain Data Flow ───────────────────────────────────────────────
  {
    name: 'explain-flow',
    description: 'Explain data flow through the codebase',
    aliases: ['explain-f', 'e-flow'],
    args: ['<file>'],
    run: async (args, context) => {
      const filePath = args.trim() || '.'

      // Build dependency graph
      const graph = await reviewImports.buildDependencyGraph(filePath)

      // Get all files in graph
      const allFiles = graph.map(node => node.file)

      const userParts: MessagePart[] = []

      // Add all files in graph (limited)
      for (const file of allFiles.slice(0, 15)) {
        try {
          const content = await readFile(file, 'utf-8')
          userParts.push({
            type: 'file',
            filename: file,
            content,
            language: detectLanguage(file),
          })
        } catch {
          // Skip
        }
      }

      // Build dependency description
      const depsDesc = graph
        .map(node => `${node.file} -> ${node.imports.map(i => i.resolvedPath || i.source).join(', ')}`)
        .join('\n')

      const prompt = `Analyze the data flow through this codebase.\n\nDependency graph:\n${depsDesc}\n\nTrace:\n1. Entry points and main flows\n2. How data moves between modules\n3. Key transformations\n4. Potential bottlenecks\n5. Circular dependencies (if any)`

      const result = await sendToAI(
        [
          {
            id: Date.now().toString(),
            role: 'user',
            parts: [...userParts, { type: 'text', text: prompt }],
            timestamp: new Date(),
          },
        ],
        context.config.providers.find(p => p.id === context.config.activeProvider)!
      )

      return result
    },
  },

  // ─── Show Dependency Graph ───────────────────────────────────────────
  {
    name: 'deps',
    description: 'Show dependency graph for a file',
    aliases: ['deps', 'dependencies', 'graph'],
    args: ['<file> [--circular]'],
    run: async (args) => {
      const parts = args.trim().split(/\s+/)
      const filePath = parts[0] || '.'
      const showCircular = parts.includes('--circular')

      const graph = await reviewImports.buildDependencyGraph(filePath)

      if (graph.length === 0) {
        return [{ type: 'text', text: 'No dependencies found.' }]
      }

      const lines: string[] = []
      lines.push(`Dependency Graph: ${filePath}`)
      lines.push('─'.repeat(60))

      for (const node of graph) {
        const indent = '  '.repeat(node.depth)
        const imports = node.imports.map(i => i.resolvedPath?.split('/').pop() || i.source).join(', ')
        lines.push(`${indent}${node.file.split('/').pop()}`)
        if (imports) {
          lines.push(`${indent}  -> ${imports}`)
        }
      }

      if (showCircular) {
        const cycles = await reviewImports.findCircularDeps(filePath)
        if (cycles.length > 0) {
          lines.push('')
          lines.push('⚠ Circular Dependencies Detected:')
          for (const cycle of cycles) {
            lines.push(`  ${cycle.join(' -> ')}`)
          }
        } else {
          lines.push('')
          lines.push('✓ No circular dependencies found')
        }
      }

      return [{ type: 'text', text: lines.join('\n') }]
    },
  },

  // ─── Find Test File ──────────────────────────────────────────────────
  {
    name: 'find-test',
    description: 'Find test file for a source file',
    aliases: ['test-for', 'find-test-file'],
    args: ['<source-file>'],
    run: async (args) => {
      const filePath = args.trim()
      if (!filePath) {
        return [{ type: 'text', text: 'Usage: /find-test <source-file>' }]
      }

      const testFile = await reviewRelated.findTestFile(filePath)

      if (testFile) {
        return [{ type: 'text', text: `Test file: ${testFile}` }]
      } else {
        return [{ type: 'text', text: `No test file found for ${filePath}` }]
      }
    },
  },

  // ─── Find Source File ────────────────────────────────────────────────
  {
    name: 'find-source',
    description: 'Find source file for a test file',
    aliases: ['source-for', 'find-source-file'],
    args: ['<test-file>'],
    run: async (args) => {
      const filePath = args.trim()
      if (!filePath) {
        return [{ type: 'text', text: 'Usage: /find-source <test-file>' }]
      }

      const sourceFile = await reviewRelated.findSourceFile(filePath)

      if (sourceFile) {
        return [{ type: 'text', text: `Source file: ${sourceFile}` }]
      } else {
        return [{ type: 'text', text: `No source file found for ${filePath}` }]
      }
    },
  },

  // ─── Find Related Files ──────────────────────────────────────────────
  {
    name: 'related',
    description: 'Find all files related to a given file',
    aliases: ['related', 'find-related'],
    args: ['<file>'],
    run: async (args) => {
      const filePath = args.trim() || '.'

      const related = await reviewRelated.findRelatedFiles(filePath)

      if (related.length === 0) {
        return [{ type: 'text', text: `No related files found for ${filePath}` }]
      }

      const lines: string[] = []
      lines.push(`Related files for: ${filePath}`)
      lines.push('─'.repeat(60))

      for (const rel of related) {
        const confidence = `${rel.confidence}%`.padStart(4)
        lines.push(`${confidence}  ${rel.relationship.padEnd(10)}  ${rel.path}`)
        lines.push(`       ${rel.reason}`)
      }

      return [{ type: 'text', text: lines.join('\n') }]
    },
  },

  // ─── Auto-Fix with Context ───────────────────────────────────────────
  {
    name: 'fix-context',
    description: 'Auto-fix issues with full context',
    aliases: ['fix-c', 'auto-fix'],
    args: ['<file> [--tests] [--types]'],
    run: async (args, context) => {
      const parts = args.trim().split(/\s+/)
      const filePath = parts[0] || '.'

      const options: reviewContext.ReviewContextOptions = {
        includeImports: true,
        includeTests: parts.includes('--tests'),
        includeTypes: parts.includes('--types'),
        maxFiles: 20,
        maxTokens: 100000,
      }

      const { files } = await reviewContext.selectContextFiles(filePath, options)

      const userParts: MessagePart[] = []

      for (const file of files) {
        userParts.push({
          type: 'file',
          filename: file.path,
          content: file.content,
          language: file.language,
        })
      }

      const prompt = `Analyze ${filePath} and provide fixes for any issues found.\n\nReturn the fixes as a unified diff (git diff format) that can be applied.\n\nInclude:\n- Bug fixes\n- Security improvements\n- Performance optimizations\n- Code style improvements\n\nProvide ONLY the diff, no explanations.`

      const result = await sendToAI(
        [
          {
            id: Date.now().toString(),
            role: 'user',
            parts: [...userParts, { type: 'text', text: prompt }],
            timestamp: new Date(),
          },
        ],
        context.config.providers.find(p => p.id === context.config.activeProvider)!
      )

      return result
    },
  },
]
