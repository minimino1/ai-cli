import { describe, it, expect, beforeEach } from 'bun:test'
import { parseCommand, createContext, commands, commandHistory } from '../src/commands'
import type { Config, Message } from '../src/types'

// Mock the dependencies
vi.mock('../src/providers/ai', () => ({
  sendToAI: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../src/history', () => ({
  SessionManager: {
    getInstance: vi.fn(() => ({
      listSessions: vi.fn(() => Promise.resolve([])),
      loadSession: vi.fn(() => Promise.resolve(null)),
      saveSession: vi.fn(() => Promise.resolve('test-id')),
      deleteSession: vi.fn(() => Promise.resolve(true)),
    })),
  },
}))

describe('parseCommand', () => {
  beforeEach(() => {
    // Clear command history before each test
    while (commandHistory.length > 0) {
      commandHistory.pop()
    }
  })

  it('should parse valid command with args', () => {
    const result = parseCommand('/review test.ts')
    expect(result).not.toBeNull()
    expect(result!.command.name).toBe('review')
    expect(result!.args).toBe('test.ts')
  })

  it('should parse command without args', () => {
    const result = parseCommand('/help')
    expect(result).not.toBeNull()
    expect(result!.command.name).toBe('help')
    expect(result!.args).toBe('')
  })

  it('should return null for non-command input', () => {
    const result = parseCommand('hello world')
    expect(result).toBeNull()
  })

  it('should return null for unknown command', () => {
    const result = parseCommand('/unknown')
    expect(result).toBeNull()
  })

  it('should resolve aliases', () => {
    const result = parseCommand('/rv test.ts') // 'rv' is alias for 'review'
    expect(result).not.toBeNull()
    expect(result!.command.name).toBe('review')
    expect(result!.args).toBe('test.ts')
  })

  it('should add commands to history', () => {
    expect(commandHistory.length).toBe(0)
    parseCommand('/ls')
    expect(commandHistory.length).toBe(1)
    expect(commandHistory[0]).toBe('/ls')
  })

  it('should respect MAX_HISTORY limit', () => {
    // Parse more than MAX_HISTORY (1000) commands
    for (let i = 0; i < 1100; i++) {
      parseCommand(`/test${i}`)
    }
    expect(commandHistory.length).toBe(1000)
    // Should keep the most recent commands
    expect(commandHistory[0]).toBe('/test100')
  })

  it('should handle alias with args', () => {
    const result = parseCommand('/e test.ts') // 'e' is alias for 'explain'
    expect(result).not.toBeNull()
    expect(result!.command.name).toBe('explain')
    expect(result!.args).toBe('test.ts')
  })

  it('should handle command with multiple word args', () => {
    const result = parseCommand('/git commit -m "test message"')
    expect(result).not.toBeNull()
    expect(result!.command.name).toBe('git')
    expect(result!.args).toContain('commit')
    expect(result!.args).toContain('-m')
    expect(result!.args).toContain('test message')
  })

  it('should handle command with special characters in args', () => {
    const result = parseCommand('/export KEY=value with spaces')
    expect(result).not.toBeNull()
    expect(result!.command.name).toBe('export')
    expect(result!.args).toContain('KEY=value')
    expect(result!.args).toContain('with')
    expect(result!.args).toContain('spaces')
  })
})

describe('createContext', () => {
  const mockConfig: Config = {
    providers: [
      { id: 'test', name: 'Test', apiUrl: 'http://test.com', model: 'test-model' },
    ],
    activeProvider: 'test',
  }

  const mockCwd = '/test/path'

  it('should create context with required fields', () => {
    const context = createContext(mockConfig, mockCwd)
    expect(context.config).toBe(mockConfig)
    expect(context.cwd).toBe(mockCwd)
    expect(typeof context.readFile).toBe('function')
    expect(typeof context.listFiles).toBe('function')
    expect(typeof context.sendToAI).toBe('function')
  })

  it('should include optional deps when provided', () => {
    const mockGetMessages = () => []
    const mockSetMessages = () => {}
    const mockGetSessionManager = () => ({
      listSessions: () => Promise.resolve([]),
      loadSession: () => Promise.resolve(null),
      saveSession: () => Promise.resolve('id'),
      deleteSession: () => Promise.resolve(true),
    })
    const mockSetFileExplorerMode = () => {}

    const context = createContext(mockConfig, mockCwd, {
      getMessages: mockGetMessages,
      setMessages: mockSetMessages,
      getSessionManager: mockGetSessionManager,
      setFileExplorerMode: mockSetFileExplorerMode,
    })

    expect(context.getMessages).toBe(mockGetMessages)
    expect(context.setMessages).toBe(mockSetMessages)
    expect(context.getSessionManager).toBe(mockGetSessionManager)
    expect(context.setFileExplorerMode).toBe(mockSetFileExplorerMode)
  })

  it('should create sendToAI with correct structure', async () => {
    const context = createContext(mockConfig, mockCwd)
    const parts = [{ type: 'text', text: 'Hello' }]
    const result = await context.sendToAI(parts)

    expect(Array.isArray(result)).toBe(true)
  })

  it('should handle readFile errors gracefully', async () => {
    const context = createContext(mockConfig, mockCwd)
    const result = await context.readFile('/nonexistent/file')
    expect(result).toContain('Error: Could not read file')
  })

  it('should handle listFiles errors gracefully', async () => {
    const context = createContext(mockConfig, mockCwd)
    const result = await context.listFiles('/nonexistent')
    expect(result).toEqual([])
  })
})

describe('commands array', () => {
  it('should have all expected commands', () => {
    const commandNames = commands.map(c => c.name)
    expect(commandNames).toContain('review')
    expect(commandNames).toContain('explain')
    expect(commandNames).toContain('fix')
    expect(commandNames).toContain('file')
    expect(commandNames).toContain('ls')
    expect(commandNames).toContain('help')
    expect(commandNames).toContain('clear')
    expect(commandNames).toContain('edit')
    expect(commandNames).toContain('provider')
    expect(commandNames).toContain('git')
    expect(commandNames).toContain('sh')
    expect(commandNames).toContain('run')
    expect(commandNames).toContain('exec')
    expect(commandNames).toContain('open')
    expect(commandNames).toContain('cd')
    expect(commandNames).toContain('pwd')
    expect(commandNames).toContain('env')
    expect(commandNames).toContain('export')
    expect(commandNames).toContain('alias')
    expect(commandNames).toContain('history')
    expect(commandNames).toContain('browse')
    expect(commandNames).toContain('sessions')
    expect(commandNames).toContain('load')
    expect(commandNames).toContain('save')
    expect(commandNames).toContain('delete')
  })

  it('should have unique command names', () => {
    const commandNames = commands.map(c => c.name)
    const uniqueNames = new Set(commandNames)
    expect(uniqueNames.size).toBe(commandNames.length)
  })

  it('should have description for all commands', () => {
    commands.forEach(cmd => {
      expect(cmd.description).toBeTruthy()
      expect(typeof cmd.description).toBe('string')
      expect(cmd.description.length).toBeGreaterThan(0)
    })
  })

  it('should have run function for all commands', () => {
    commands.forEach(cmd => {
      expect(typeof cmd.run).toBe('function')
    })
  })
})
