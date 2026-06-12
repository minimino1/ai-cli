import { Box, Text } from 'ink'
import { Command, CommandContext } from '../types'
import { tree, treeSync } from '../tools/file/tree'
import { diffFiles, formatDiff, compareDirs, findDuplicates } from '../tools/file/compare'
import { searchFiles, grepFiles, searchBySize, searchByDate, searchByType, formatSearchResults } from '../tools/file/search'
import { analyzeDir, formatAnalysis, findLargeFiles, findOldFiles, emptyDirs, diskUsage, formatDiskUsage } from '../tools/file/analyze'
import { viewFile } from '../tools/file/viewer'

/**
 * /tree [path] [depth] - Directory tree
 */
export const treeCommand: Command = {
  name: 'tree',
  description: 'Show directory tree',
  aliases: ['ls-tree', 'dir-tree'],
  args: ['[path]', '[depth]'],
  run: async (args, context) => {
    const parts = args.split(/\s+/)
    const path = parts[0] || '.'
    const maxDepth = parts[1] ? parseInt(parts[1]) : undefined

    const options = {
      maxDepth,
      icons: true,
      showHidden: false,
    }

    const result = await tree(path, options)

    return [{ type: 'text', text: result.tree }]
  },
}

/**
 * /diff <file1> <file2> - Compare files
 */
export const diffCommand: Command = {
  name: 'diff',
  description: 'Compare two files',
  aliases: ['compare'],
  args: ['<file1>', '<file2>'],
  run: async (args, context) => {
    const parts = args.split(/\s+/)
    if (parts.length < 2) {
      return [{ type: 'text', text: '\x1b[31mError: Two files required\x1b[0m' }]
    }

    const [file1, file2] = parts

    try {
      const diff = await diffFiles(file1, file2)
      const formatted = formatDiff(diff)

      return [{ type: 'text', text: formatted }]
    } catch (error) {
      return [{ type: 'text', text: `\x1b[31mError: ${error instanceof Error ? error.message : 'Failed to compare files'}\x1b[0m` }]
    }
  },
}

/**
 * /find <pattern> - Find files by pattern
 */
export const findCommand: Command = {
  name: 'find',
  description: 'Find files by glob pattern',
  aliases: ['search'],
  args: ['<pattern>'],
  run: async (args, context) => {
    const pattern = args || '*'
    const results = await searchFiles('.', pattern, {
      recursive: true,
      maxResults: 100,
    })

    return [{ type: 'text', text: formatSearchResults(results) }]
  },
}

/**
 * /grep <pattern> [path] - Search file contents
 */
export const grepCommand: Command = {
  name: 'grep',
  description: 'Search file contents',
  aliases: ['rg', 'search-content'],
  args: ['<pattern>', '[path]'],
  run: async (args, context) => {
    const parts = args.split(/\s+/)
    if (parts.length < 1) {
      return [{ type: 'text', text: '\x1b[31mError: Pattern required\x1b[0m' }]
    }

    const pattern = parts[0]
    const path = parts[1] || '.'

    const results = await grepFiles(path, pattern, {
      recursive: true,
      maxResults: 50,
      showContext: 2,
    })

    return [{ type: 'text', text: formatSearchResults(results) }]
  },
}

/**
 * /du [path] - Disk usage
 */
export const duCommand: Command = {
  name: 'du',
  description: 'Show disk usage for path',
  aliases: ['disk-usage', 'size'],
  args: ['[path]'],
  run: async (args, context) => {
    const path = args || '.'

    try {
      const usage = await diskUsage(path)
      const formatted = formatDiskUsage(usage)

      return [{ type: 'text', text: formatted }]
    } catch (error) {
      return [{ type: 'text', text: `\x1b[31mError: ${error instanceof Error ? error.message : 'Failed to calculate disk usage'}\x1b[0m` }]
    }
  },
}

/**
 * /view <file> - Smart file viewer
 */
export const viewCommand: Command = {
  name: 'view',
  description: 'View file with auto-detected format',
  aliases: ['cat', 'open'],
  args: ['<file>'],
  run: async (args, context) => {
    const file = args

    if (!file) {
      return [{ type: 'text', text: '\x1b[31mError: File path required\x1b[0m' }]
    }

    try {
      const result = await viewFile(file)
      return [{ type: 'text', text: result.content }]
    } catch (error) {
      return [{ type: 'text', text: `\x1b[31mError: ${error instanceof Error ? error.message : 'Failed to read file'}\x1b[0m` }]
    }
  },
}

/**
 * /analyze <path> - Analyze directory
 */
export const analyzeCommand: Command = {
  name: 'analyze',
  description: 'Analyze directory structure and statistics',
  aliases: ['stats', 'dir-stats'],
  args: ['[path]'],
  run: async (args, context) => {
    const path = args || '.'

    try {
      const analysis = await analyzeDir(path)
      const formatted = formatAnalysis(analysis)

      return [{ type: 'text', text: formatted }]
    } catch (error) {
      return [{ type: 'text', text: `\x1b[31mError: ${error instanceof Error ? error.message : 'Failed to analyze directory'}\x1b[0m` }]
    }
  },
}

/**
 * /duplicates <path> - Find duplicate files
 */
export const duplicatesCommand: Command = {
  name: 'duplicates',
  description: 'Find duplicate files by hash',
  aliases: ['dup', 'find-dup'],
  args: ['[path]'],
  run: async (args, context) => {
    const path = args || '.'

    try {
      const duplicates = await findDuplicates(path)

      if (duplicates.length === 0) {
        return [{ type: 'text', text: '\x1b[32mNo duplicate files found\x1b[0m' }]
      }

      const lines: string[] = []
      lines.push(`\x1b[1mFound ${duplicates.length} duplicate groups:\x1b[0m`)
      lines.push('')

      let totalWasted = 0
      for (const group of duplicates) {
        lines.push(`\x1b[36mHash: ${group.hash.substring(0, 12)}...\x1b[0m`)
        for (const file of group.files) {
          lines.push(`  ${file.path} (\x1b[32m${formatBytes(file.size)}\x1b[0m)`)
          if (group.files.indexOf(file) > 0) {
            totalWasted += file.size
          }
        }
        lines.push('')
      }

      lines.push(`\x1b[33mTotal wasted space: ${formatBytes(totalWasted)}\x1b[0m`)

      return [{ type: 'text', text: lines.join('\n') }]
    } catch (error) {
      return [{ type: 'text', text: `\x1b[31mError: ${error instanceof Error ? error.message : 'Failed to find duplicates'}\x1b[0m` }]
    }
  },
}

/**
 * /large [path] [limit] - Find large files
 */
export const largeCommand: Command = {
  name: 'large',
  description: 'Find largest files',
  aliases: ['big', 'huge'],
  args: ['[path]', '[limit]'],
  run: async (args, context) => {
    const parts = args.split(/\s+/)
    const path = parts[0] || '.'
    const limit = parts[1] ? parseInt(parts[1]) : 20

    try {
      const files = await findLargeFiles(path, limit)

      if (files.length === 0) {
        return [{ type: 'text', text: '\x1b[32mNo files found\x1b[0m' }]
      }

      const lines: string[] = []
      lines.push(`\x1b[1mTop ${files.length} largest files:\x1b[0m`)
      lines.push('')

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        lines.push(`${String(i + 1).padStart(3)}. ${file.path}`)
        lines.push(`    \x1b[32m${formatBytes(file.size)}\x1b[0m  (${file.modified.toLocaleDateString()})`)
      }

      return [{ type: 'text', text: lines.join('\n') }]
    } catch (error) {
      return [{ type: 'text', text: `\x1b[31mError: ${error instanceof Error ? error.message : 'Failed to find large files'}\x1b[0m` }]
    }
  },
}

/**
 * /empty-dirs [path] - Find empty directories
 */
export const emptyDirsCommand: Command = {
  name: 'empty-dirs',
  description: 'Find empty directories',
  aliases: ['empty', 'clean'],
  args: ['[path]'],
  run: async (args, context) => {
    const path = args || '.'

    try {
      const empty = await emptyDirs(path)

      if (empty.length === 0) {
        return [{ type: 'text', text: '\x1b[32mNo empty directories found\x1b[0m' }]
      }

      const lines: string[] = []
      lines.push(`\x1b[1mFound ${empty.length} empty directories:\x1b[0m`)
      lines.push('')

      for (const dir of empty) {
        lines.push(`  ${dir.path}`)
      }

      return [{ type: 'text', text: lines.join('\n') }]
    } catch (error) {
      return [{ type: 'text', text: `\x1b[31mError: ${error instanceof Error ? error.message : 'Failed to find empty directories'}\x1b[0m` }]
    }
  },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
