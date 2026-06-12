import { readFile, readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import type { Command, CommandContext, MessagePart, Config } from './types'
import { sendToAI } from './providers/ai'

// ─── Helper: Read File ───────────────────────────────────────────
async function readFileContent(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return `Error: Could not read file ${path}`
  }
}

// ─── Helper: List Files ──────────────────────────────────────────
async function listFiles(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => e.name)
  } catch {
    return []
  }
}

// ─── Helper: Detect Language ─────────────────────────────────────
function detectLanguage(filename: string): string {
  const ext = extname(filename).toLowerCase()
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.css': 'css',
    '.html': 'html',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
  }
  return langMap[ext] || 'text'
}

// ─── Commands ────────────────────────────────────────────────────
export const commands: Command[] = [
  // /review - Code review
  {
    name: 'review',
    description: 'Review code for issues, bugs, and best practices',
    aliases: ['r'],
    args: ['[file]'],
    run: async (args, context) => {
      const filePath = args.trim() || '.'
      const content = await readFileContent(filePath)
      const language = detectLanguage(filePath)

      const userParts: MessagePart[] = [{
        type: 'file',
        filename: filePath,
        content,
        language,
      }]

      return sendToAI([{
        id: Date.now().toString(),
        role: 'user',
        parts: [
          ...userParts,
          { type: 'text', text: `Please review this code for bugs, security issues, performance problems, and best practices. File: ${filePath}` },
        ],
        timestamp: new Date(),
      }], context.config.providers.find(p => p.id === context.config.activeProvider)!)
    },
  },

  // /explain - Code explanation
  {
    name: 'explain',
    description: 'Explain how code works',
    aliases: ['e'],
    args: ['[file]'],
    run: async (args, context) => {
      const filePath = args.trim() || '.'
      const content = await readFileContent(filePath)
      const language = detectLanguage(filePath)

      return sendToAI([{
        id: Date.now().toString(),
        role: 'user',
        parts: [
          { type: 'file', filename: filePath, content, language },
          { type: 'text', text: `Please explain how this code works. File: ${filePath}` },
        ],
        timestamp: new Date(),
      }], context.config.providers.find(p => p.id === context.config.activeProvider)!)
    },
  },

  // /fix - Code fixing
  {
    name: 'fix',
    description: 'Fix issues in code',
    aliases: ['f'],
    args: ['[file]'],
    run: async (args, context) => {
      const filePath = args.trim() || '.'
      const content = await readFileContent(filePath)
      const language = detectLanguage(filePath)

      return sendToAI([{
        id: Date.now().toString(),
        role: 'user',
        parts: [
          { type: 'file', filename: filePath, content, language },
          { type: 'text', text: `Please fix any issues in this code. Provide the fixes as a diff. File: ${filePath}` },
        ],
        timestamp: new Date(),
      }], context.config.providers.find(p => p.id === context.config.activeProvider)!)
    },
  },

  // /file - Show file content
  {
    name: 'file',
    description: 'Show file content with syntax highlighting',
    aliases: ['cat'],
    args: ['<file>'],
    run: async (args, context) => {
      const filePath = args.trim()
      if (!filePath) {
        return [{ type: 'text', text: 'Usage: /file <path>' }]
      }

      const content = await readFileContent(filePath)
      const language = detectLanguage(filePath)

      return [{
        type: 'file',
        filename: filePath,
        content,
        language,
      }]
    },
  },

  // /ls - List files
  {
    name: 'ls',
    description: 'List files in directory',
    args: ['[path]'],
    run: async (args, context) => {
      const dirPath = args.trim() || '.'
      const files = await listFiles(dirPath)

      if (files.length === 0) {
        return [{ type: 'text', text: `No files found in ${dirPath}` }]
      }

      return [{
        type: 'text',
        text: `Files in ${dirPath}:\n${files.map(f => `  ${f}`).join('\n')}`,
      }]
    },
  },

  // /help - Show help
  {
    name: 'help',
    description: 'Show available commands',
    aliases: ['h', '?'],
    run: async () => {
      const helpText = commands.map(cmd => {
        const args = cmd.args ? ` ${cmd.args.join(' ')}` : ''
        const aliases = cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : ''
        return `  /${cmd.name}${args} - ${cmd.description}${aliases}`
      }).join('\n')

      return [{
        type: 'text',
        text: `Available commands:\n${helpText}`,
      }]
    },
  },

  // /clear - Clear chat
  {
    name: 'clear',
    description: 'Clear chat history',
    aliases: ['cls'],
    run: async () => {
      // This is handled by the app, just return empty
      return []
    },
  },

  // /provider - Switch provider
  {
    name: 'provider',
    description: 'Switch AI provider',
    aliases: ['model'],
    args: ['[provider]'],
    run: async (args, context) => {
      const providerName = args.trim()
      if (!providerName) {
        // Ensure providers is an array
        const providersList = Array.isArray(context.config.providers) ? context.config.providers : []
        const providers = providersList.map(p =>
          `  ${p.id} - ${p.name} (${p.model})`
        ).join('\n')
        return [{
          type: 'text',
          text: `Available providers:\n${providers}\n\nCurrent: ${context.config.activeProvider}`,
        }]
      }

      // Ensure providers is an array
      const providersList = Array.isArray(context.config.providers) ? context.config.providers : []
      const provider = providersList.find(p =>
        p.id === providerName || p.name.toLowerCase() === providerName.toLowerCase()
      )

      if (!provider) {
        return [{
          type: 'text',
          text: `Unknown provider: ${providerName}`,
        }]
      }

      return [{
        type: 'text',
        text: `Switched to ${provider.name} (${provider.model})`,
      }]
    },
  },
]

// ─── Command Parser ──────────────────────────────────────────────
export function parseCommand(input: string): { command: Command; args: string } | null {
  if (!input.startsWith('/')) return null

  const parts = input.slice(1).split(/\s+/)
  const commandName = parts[0]
  const args = parts.slice(1).join(' ')

  const command = commands.find(cmd =>
    cmd.name === commandName || cmd.aliases?.includes(commandName)
  )

  if (!command) return null

  return { command, args }
}

// ─── Create Context ──────────────────────────────────────────────
export function createContext(config: Config, cwd: string): CommandContext {
  return {
    config,
    cwd,
    readFile: readFileContent,
    listFiles,
    sendToAI: (parts) => sendToAI([{
      id: Date.now().toString(),
      role: 'user',
      parts,
      timestamp: new Date(),
    }], config.providers.find(p => p.id === config.activeProvider)!),
  }
}
