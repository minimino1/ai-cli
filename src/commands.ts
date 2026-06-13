import { readFile, readdir, mkdir, rm, stat, rename, writeFile } from 'node:fs/promises'
import { join, extname, basename, dirname, isAbsolute } from 'node:path'
import type { Command, CommandContext, MessagePart, Config, Message, Session, Provider } from './types'
import { sendToAI } from './providers/ai'
import { SessionManager } from './history'

// Helper to safely get provider from config
function getProviderSafely(config: Config, providerId?: string): { success: boolean; provider?: Provider; error?: string } {
  const providersList = Array.isArray(config.providers) ? config.providers : []
  const id = providerId || config.activeProvider
  const provider = providersList.find(p => p.id === id)

  if (!provider) {
    return {
      success: false,
      error: `Provider not found: ${id}. Available: ${providersList.map(p => p.id).join(', ')}`,
    }
  }

  return { success: true, provider }
}

// Command history (in-memory for session)
let commandHistory: string[] = []
const MAX_HISTORY = 1000

// ─── Aliases Registry ────────────────────────────────────────────
const userAliases = new Map<string, string>()

import * as gitProvider from './providers/git'
import { executeCommand } from './providers/shell'
import { executeFile, executeCode } from './providers/execute'
import { networkCommands } from './commands/network'
import { systemCommands } from './commands/system'
import { fileCommands } from './commands/files'
import { gitAdvancedCommands } from './commands/git-advanced'
import { termuxCommands } from './commands/termux'
import { reviewEnhancedCommands } from './commands/review-enhanced'
import { pluginCommands } from './commands/plugin'
import { themeCommands } from './commands/theme'

// ─── Helper: Read File ───────────────────────────────────────────
async function readFileContent(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch (error: any) {
    return `Error: Could not read file ${path} - ${error?.message || 'unknown error'}`
  }
}

// ─── Helper: Write File ──────────────────────────────────────────
async function writeFileContent(path: string, content: string): Promise<string> {
  try {
    await writeFile(path, content, 'utf-8')
    return `Saved: ${path}`
  } catch (error: any) {
    return `Error: Could not write file ${path} - ${error?.message || 'unknown error'}`
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

// ─── Helper: Get File Info ───────────────────────────────────────
async function getFileInfo(path: string): Promise<string> {
  try {
    const stats = await stat(path)
    const info = [
      `Path: ${path}`,
      `Size: ${stats.size} bytes`,
      `Created: ${stats.birthtime}`,
      `Modified: ${stats.mtime}`,
      `Accessed: ${stats.atime}`,
      `Is File: ${stats.isFile()}`,
      `Is Directory: ${stats.isDirectory()}`,
    ]
    return info.join('\n')
  } catch (error: any) {
    return `Error: Could not stat ${path} - ${error?.message || 'unknown error'}`
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
export const builtinCommands: Command[] = [
  // /review - Code review
  {
    name: 'review',
    description: 'Review code for issues, bugs, and best practices',
    aliases: ['rv'],
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

       const providerResult = getProviderSafely(context.config)
       if (!providerResult.success) {
         return [{ type: 'text', text: providerResult.error }]
       }
       const { provider } = providerResult

       return sendToAI([{
         id: Date.now().toString(),
         role: 'user',
         parts: [
           ...userParts,
           { type: 'text', text: `Please review this code for bugs, security issues, performance problems, and best practices. File: ${filePath}` },
         ],
         timestamp: new Date(),
       }], provider)
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

       const providerResult = getProviderSafely(context.config)
       if (!providerResult.success) {
         return [{ type: 'text', text: providerResult.error }]
       }
       const { provider } = providerResult

       return sendToAI([{
         id: Date.now().toString(),
         role: 'user',
         parts: [
           { type: 'file', filename: filePath, content, language },
           { type: 'text', text: `Please explain how this code works. File: ${filePath}` },
         ],
         timestamp: new Date(),
       }], provider)
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

       const providerResult = getProviderSafely(context.config)
       if (!providerResult.success) {
         return [{ type: 'text', text: providerResult.error }]
       }
       const { provider } = providerResult

       return sendToAI([{
         id: Date.now().toString(),
         role: 'user',
         parts: [
           { type: 'file', filename: filePath, content, language },
           { type: 'text', text: `Please fix any issues in this code. Provide the fixes as a diff. File: ${filePath}` },
         ],
         timestamp: new Date(),
       }], provider)
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

  // /edit - Edit file in editor mode
  {
    name: 'edit',
    description: 'Open file in full-screen editor',
    aliases: ['e'],
    args: ['<file>'],
    run: async (args) => {
      // This is handled specially in app.tsx
      // The command is registered so parseCommand recognizes /edit
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
        const providersList = Array.isArray(context.config.providers) ? context.config.providers : []

        if (!providerName) {
          const providers = providersList.map(p =>
            `  ${p.id} - ${p.name} (${p.model})`
          ).join('\n')
          return [{
            type: 'text',
            text: `Available providers:\n${providers}\n\nCurrent: ${context.config.activeProvider}`,
          }]
        }

        const provider = providersList.find(p =>
          p.id === providerName || p.name.toLowerCase() === providerName.toLowerCase()
        )

        if (!provider) {
          return [{
            type: 'text',
            text: `Unknown provider: ${providerName}`,
          }]
        }

        context.config.activeProvider = provider.id
        return [{
          type: 'text',
          text: `Switched to ${provider.name} (${provider.model})`,
        }]
      },
    },

   // /git - Git operations
   {
     name: 'git',
     description: 'Execute git commands (status, diff, log, add, commit, branch)',
     aliases: ['g'],
     args: ['<subcommand> [args...]'],
     run: async (args) => {
       const trimmed = args.trim()
       if (!trimmed) {
         return [{
           type: 'text',
           text: `Git commands:\n  status - show working tree status\n  diff [staged] - show changes\n  log [N] - show recent commits (default 20)\n  add <file>... - stage files\n  commit -m "msg" - commit changes\n  branch - list branches`,
         }]
       }

       const parts = trimmed.split(/\s+/)
       const subcmd = parts[0]
       const subArgs = parts.slice(1)

       let result: string

       switch (subcmd) {
         case 'status':
           result = await gitProvider.gitStatus()
           break
         case 'diff':
           const staged = subArgs.includes('staged') || subArgs.includes('--cached')
           result = await gitProvider.gitDiff(staged)
           break
         case 'log':
           const limit = parseInt(subArgs[0]) || 20
           result = await gitProvider.gitLog(limit)
           break
         case 'add':
           result = await gitProvider.gitAdd(subArgs)
           break
         case 'commit':
           // Find -m flag and get message
           const mIndex = subArgs.indexOf('-m')
           if (mIndex === -1 || mIndex + 1 >= subArgs.length) {
             return [{
               type: 'text',
               text: 'Usage: /git commit -m "message"',
             }]
           }
           const message = subArgs.slice(mIndex + 1).join(' ')
           result = await gitProvider.gitCommit(message)
           break
         case 'branch':
           result = await gitProvider.gitBranch()
           break
         default:
           return [{
             type: 'text',
             text: `Unknown git command: ${subcmd}\nAvailable: status, diff, log, add, commit, branch`,
           }]
       }

       return [{ type: 'text', text: result }]
     },
   },

   // /sh - Shell command execution
   {
     name: 'sh',
     description: 'Execute shell command',
     aliases: ['!', 'shell'],
     args: ['<command>'],
     run: async (args) => {
       const result = await executeCommand(args)
       return [{ type: 'text', text: result }]
     },
   },

   // /run - Execute code file
   {
     name: 'run',
     description: 'Execute a code file (python, node, go, etc.)',
     aliases: ['r'],
     args: ['<file>'],
     run: async (args) => {
       const filePath = args.trim()
       if (!filePath) {
         return [{
           type: 'text',
           text: 'Usage: /run <file>\nSupported: .py, .js, .ts, .go, .rs, .rb, .java, .c, .cpp, .sh',
         }]
       }

       const result = await executeFile(filePath)
       return [{ type: 'text', text: result }]
     },
   },

    // /exec - Execute code snippet
    {
      name: 'exec',
      description: 'Execute code snippet (experimental)',
      aliases: ['x'],
      args: ['<language> <code>'],
      run: async (args) => {
        const trimmed = args.trim()
        if (!trimmed) {
          return [{
            type: 'text',
            text: 'Usage: /exec <language> <code>\nExample: /exec python print("hello")',
          }]
        }

        const parts = trimmed.split(/\s+/)
        const language = parts[0]
        const code = parts.slice(1).join(' ')

        const result = await executeCode(code, language)
        return [{ type: 'text', text: result }]
      },
    },

    // /open - View file (read-only)
    {
      name: 'open',
      description: 'View file content (read-only)',
      aliases: ['view'],
      args: ['<file>'],
      run: async (args) => {
        const filePath = args.trim()
        if (!filePath) {
          return [{ type: 'text', text: 'Usage: /open <path>' }]
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

    // /cd - Change working directory
    {
      name: 'cd',
      description: 'Change working directory',
      aliases: ['chdir'],
      args: ['[path]'],
      run: async (args, context) => {
        const targetPath = args.trim() || process.env.HOME || process.cwd()
        try {
          const resolvedPath = isAbsolute(targetPath)
            ? targetPath
            : join(context.cwd, targetPath)
          const stats = await stat(resolvedPath)
          if (!stats.isDirectory()) {
            return [{ type: 'text', text: `Error: ${resolvedPath} is not a directory` }]
          }
          process.chdir(resolvedPath)
          return [{
            type: 'text',
            text: `Changed directory to: ${resolvedPath}`,
          }]
        } catch (error: any) {
          return [{ type: 'text', text: `Error: ${error.message}` }]
        }
      },
    },

    // /pwd - Print working directory
    {
      name: 'pwd',
      description: 'Print current working directory',
      run: async (_, context) => {
        return [{
          type: 'text',
          text: `Current directory: ${context.cwd}`,
        }]
      },
    },

    // /env - Show environment variables
    {
      name: 'env',
      description: 'Show environment variables',
      run: async () => {
        const envEntries = Object.entries(process.env)
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, value]) => `${key}=${value}`)
          .sort()
        return [{
          type: 'text',
          text: `Environment variables:\n${envEntries.join('\n')}`,
        }]
      },
    },

    // /export - Set environment variable
    {
      name: 'export',
      description: 'Set environment variable',
      aliases: ['set'],
      args: ['KEY=value'],
      run: async (args) => {
        const match = args.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
        if (!match) {
          return [{ type: 'text', text: 'Usage: /export KEY=value' }]
        }
        const [, key, value] = match
        process.env[key] = value
        return [{
          type: 'text',
          text: `Set ${key}=${value}`,
        }]
      },
    },

    // /alias - Create command alias
    {
      name: 'alias',
      description: 'Create command alias',
      args: ['name=command'],
      run: async (args) => {
        const match = args.match(/^([a-zA-Z0-9_-]+)=(.*)$/)
        if (!match) {
          return [{ type: 'text', text: 'Usage: /alias name=command' }]
        }
        const [, aliasName, command] = match
        userAliases.set(aliasName, command)
        return [{
          type: 'text',
          text: `Alias created: /${aliasName} -> ${command}`,
        }]
      },
    },

    // /history - Show command history
    {
      name: 'history',
      description: 'Show command history',
      run: async () => {
        if (commandHistory.length === 0) {
          return [{ type: 'text', text: 'No command history' }]
        }
        const history = commandHistory
          .map((cmd, i) => `  ${String(i + 1).padStart(4)} ${cmd}`)
          .join('\n')
        return [{
          type: 'text',
          text: `Command History:\n${history}`,
        }]
      },
    },

    // /browse - Open file explorer
    {
      name: 'browse',
      description: 'Open interactive file explorer to select files',
      aliases: ['b', 'files'],
      args: ['[path] [--ext <ext>] [--search <query>]'],
      run: async (args, context) => {
        const parts = args.trim().split(/\s+/)
        let cwd = parts[0] || '.'
        let filterExt: string | undefined
        let searchQuery: string | undefined

        // Simple arg parsing
        for (let i = 1; i < parts.length; i++) {
          if (parts[i] === '--ext' && i + 1 < parts.length) {
            filterExt = parts[i + 1]
            i++
          } else if (parts[i] === '--search' && i + 1 < parts.length) {
            searchQuery = parts[i + 1]
            i++
          }
        }

        // Signal the app to open file explorer
        if (context.setFileExplorerMode) {
          context.setFileExplorerMode({
            active: true,
            cwd,
            filterExt,
            searchQuery,
            onSelect: (path: string) => {
              // After selection, we could insert the path into input
              // This will be handled by the app
            },
          })
        }

        return [{
          type: 'file-explorer',
          cwd,
          filterExt,
          searchQuery,
        }]
      },
    },

    // /sessions - List all sessions
    {
      name: 'sessions',
      description: 'List all saved sessions',
      aliases: ['ls-sessions', 'session-list'],
      run: async (_, context) => {
        const sessionManager = context.getSessionManager?.()
        if (!sessionManager) {
          return [{ type: 'text', text: 'Session manager not available' }]
        }

        const sessions = await sessionManager.listSessions()

        if (sessions.length === 0) {
          return [{ type: 'text', text: 'No saved sessions' }]
        }

        const text = sessions.map((s, i) =>
          `${i + 1}. ${s.id}\n   Title: ${s.title}\n   Messages: ${s.messages.length}\n   Updated: ${s.updatedAt.toLocaleString()}`
        ).join('\n\n')

        return [{ type: 'text', text: `Saved sessions (${sessions.length}):\n\n${text}` }]
      },
    },

    // /load - Load a session
    {
      name: 'load',
      description: 'Load a saved session by ID',
      aliases: ['restore'],
      args: ['<session-id>'],
      run: async (args, context) => {
        const sessionId = args.trim()
        if (!sessionId) {
          return [{ type: 'text', text: 'Usage: /load <session-id>\nUse /sessions to list available sessions' }]
        }

        const sessionManager = context.getSessionManager?.()
        if (!sessionManager) {
          return [{ type: 'text', text: 'Session manager not available' }]
        }

        const session = await sessionManager.loadSession(sessionId)
        if (!session) {
          return [{ type: 'text', text: `Session not found: ${sessionId}` }]
        }

        // Set messages in context
        if (context.setMessages) {
          context.setMessages(session.messages)
        }

        return [{
          type: 'text',
          text: `Loaded session: ${session.title}\nMessages: ${session.messages.length}\nUse /save to save current session`,
        }]
      },
    },

    // /save - Save current session
    {
      name: 'save',
      description: 'Save current chat session',
      aliases: ['save-session'],
      args: ['[title]'],
      run: async (args, context) => {
        const customTitle = args.trim() || undefined
        const messages = context.getMessages?.() || []

        if (messages.length === 0) {
          return [{ type: 'text', text: 'No messages to save' }]
        }

        const sessionManager = context.getSessionManager?.()
        if (!sessionManager) {
          return [{ type: 'text', text: 'Session manager not available' }]
        }

        const id = await sessionManager.saveSession(messages, customTitle)
        const session = await sessionManager.loadSession(id)

        return [{
          type: 'text',
          text: `Session saved:\nID: ${id}\nTitle: ${customTitle || session?.title || 'Untitled'}\nMessages: ${messages.length}`,
        }]
      },
    },

    // /delete - Delete a session
    {
      name: 'delete',
      description: 'Delete a saved session',
      aliases: ['rm-session', 'del-session'],
      args: ['<session-id>'],
      run: async (args, context) => {
        const sessionId = args.trim()
        if (!sessionId) {
          return [{ type: 'text', text: 'Usage: /delete <session-id>\nUse /sessions to list available sessions' }]
        }

        const sessionManager = context.getSessionManager?.()
        if (!sessionManager) {
          return [{ type: 'text', text: 'Session manager not available' }]
        }

        const success = await sessionManager.deleteSession(sessionId)
        if (success) {
          return [{ type: 'text', text: `Deleted session: ${sessionId}` }]
        } else {
          return [{ type: 'text', text: `Failed to delete session: ${sessionId}` }]
        }
      },
    },
  ]

export const commands: Command[] = [
  ...builtinCommands,
  ...networkCommands,
  ...systemCommands,
  ...fileCommands,
  ...gitAdvancedCommands,
  ...termuxCommands,
  ...reviewEnhancedCommands,
  ...pluginCommands,
  ...themeCommands,
]

// ─── Command Parser ──────────────────────────────────────────────
export function parseCommand(input: string): { command: Command; args: string } | null {
  if (!input.startsWith('/')) return null

  const parts = input.slice(1).split(/\s+/)
  const commandName = parts[0]
  const args = parts.slice(1).join(' ')

  // Check user aliases first
  if (userAliases.has(commandName)) {
    const aliasedCommand = `/${userAliases.get(commandName)} ${args}`.trim()
    return parseCommand(aliasedCommand)
  }

  const command = commands.find(cmd =>
    cmd.name === commandName || cmd.aliases?.includes(commandName)
  )

  if (!command) return null

  // Add to history
  commandHistory.push(input)
  if (commandHistory.length > MAX_HISTORY) {
    commandHistory = commandHistory.slice(-MAX_HISTORY)
  }

  return { command, args }
}

// ─── Create Context ──────────────────────────────────────────────
export function createContext(
  config: Config,
  cwd: string,
  deps?: {
    getMessages?: () => Message[]
    setMessages?: (messages: Message[]) => void
    getSessionManager?: () => SessionManager
    setFileExplorerMode?: (mode: { active: boolean; cwd?: string; filterExt?: string; searchQuery?: string; onSelect?: (path: string) => void }) => void
  }
): CommandContext {
   return {
     config,
     cwd,
     readFile: readFileContent,
     listFiles,
     sendToAI: (parts) => {
       const providerResult = getProviderSafely(config)
       if (!providerResult.success) {
         throw new Error(providerResult.error)
       }
       const { provider } = providerResult
       return sendToAI([{
         id: Date.now().toString(),
         role: 'user',
         parts,
         timestamp: new Date(),
       }], provider)
     },
     ...deps,
   }
}
