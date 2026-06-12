import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { SessionManager } from '../src/history'
import type { Message } from '../src/types'

// Mock fs operations
const mockMkdir = vi.fn()
const mockReaddir = vi.fn()
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockUnlink = vi.fn()

vi.mock('node:fs/promises', () => ({
  mkdir: mockMkdir,
  readdir: mockReaddir,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  unlink: mockUnlink,
}))

vi.mock('node:path', () => ({
  join: vi.fn((...args) => args.join('/')),
}))

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton instance
    // @ts-ignore - accessing private static field
    SessionManager.instance = undefined
    mockMkdir.mockResolvedValue(undefined)
    mockReaddir.mockResolvedValue([])
    mockReadFile.mockResolvedValue('')
    mockWriteFile.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = SessionManager.getInstance()
      const instance2 = SessionManager.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should create instance only once', () => {
      expect(() => SessionManager.getInstance()).not.toThrow()
      const instance = SessionManager.getInstance()
      expect(instance).toBeInstanceOf(SessionManager)
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const instance = SessionManager.getInstance()
      const id1 = instance.generateId()
      const id2 = instance.generateId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/)
    })

    it('should start with "session_" prefix', () => {
      const instance = SessionManager.getInstance()
      const id = instance.generateId()
      expect(id.startsWith('session_')).toBe(true)
    })

    it('should include timestamp', () => {
      const instance = SessionManager.getInstance()
      const id = instance.generateId()
      const timestamp = parseInt(id.split('_')[1])
      expect(timestamp).toBeGreaterThan(0)
      expect(timestamp).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('extractTitle', () => {
    it('should extract title from first user message text', () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello, I need help with TypeScript' }],
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'I can help you with TypeScript' }],
          timestamp: new Date(),
        },
      ]

      const title = instance.extractTitle(messages)
      expect(title).toBe('Hello, I need help with TypeScript')
    })

    it('should return "Untitled Session" for empty messages', () => {
      const instance = SessionManager.getInstance()
      const title = instance.extractTitle([])
      expect(title).toBe('Untitled Session')
    })

    it('should return "Untitled Session" when no user message', () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello' }],
          timestamp: new Date(),
        },
      ]

      const title = instance.extractTitle(messages)
      expect(title).toBe('Untitled Session')
    })

    it('should return "Untitled Session" when user message has no text part', () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'code', language: 'typescript', code: 'console.log("hi")' }],
          timestamp: new Date(),
        },
      ]

      const title = instance.extractTitle(messages)
      expect(title).toBe('Untitled Session')
    })

    it('should truncate long titles to 50 characters', () => {
      const instance = SessionManager.getInstance()
      const longText = 'a'.repeat(100)
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: longText }],
          timestamp: new Date(),
        },
      ]

      const title = instance.extractTitle(messages)
      expect(title.length).toBe(53) // 50 + '...'
      expect(title.endsWith('...')).toBe(true)
    })

    it('should not truncate short titles', () => {
      const instance = SessionManager.getInstance()
      const shortText = 'Short title'
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: shortText }],
          timestamp: new Date(),
        },
      ]

      const title = instance.extractTitle(messages)
      expect(title).toBe(shortText)
    })

    it('should trim whitespace from title', () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: '   Hello World   ' }],
          timestamp: new Date(),
        },
      ]

      const title = instance.extractTitle(messages)
      expect(title).toBe('Hello World')
    })
  })

  describe('saveSession', () => {
    it('should save session with custom ID', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
          timestamp: new Date(),
        },
      ]

      const id = await instance.saveSession(messages, 'custom-id')

      expect(id).toBe('custom-id')
      expect(mockWriteFile).toHaveBeenCalled()
      expect(mockMkdir).toHaveBeenCalled()
    })

    it('should generate ID when not provided', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
          timestamp: new Date(),
        },
      ]

      const id = await instance.saveSession(messages)

      expect(id).toMatch(/^session_\d+_[a-z0-9]+$/)
    })

    it('should extract title from messages', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'My Session Title' }],
          timestamp: new Date(),
        },
      ]

      await instance.saveSession(messages)

      const writeFileCall = mockWriteFile.mock.calls[0]
      const sessionData = JSON.parse(writeFileCall[1])
      expect(sessionData.title).toBe('My Session Title')
    })

    it('should set createdAt and updatedAt', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
          timestamp: new Date(),
        },
      ]

      await instance.saveSession(messages)

      const writeFileCall = mockWriteFile.mock.calls[0]
      const sessionData = JSON.parse(writeFileCall[1])
      expect(sessionData.createdAt).toBeDefined()
      expect(sessionData.updatedAt).toBeDefined()
    })

    it('should preserve createdAt when updating existing session', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
          timestamp: new Date(),
        },
      ]

      // First save
      await instance.saveSession(messages, 'existing-id')
      const firstWriteFileCall = mockWriteFile.mock.calls[0]
      const firstSessionData = JSON.parse(firstWriteFileCall[1])
      const firstCreatedAt = firstSessionData.createdAt

      // Reset mock to simulate loading from cache
      mockWriteFile.mockClear()
      mockReadFile.mockResolvedValue(JSON.stringify({
        id: 'existing-id',
        title: 'Existing Title',
        messages,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      }))

      // Second save with same ID
      await instance.saveSession(messages, 'existing-id')

      expect(mockWriteFile).toHaveBeenCalled()
      const secondWriteFileCall = mockWriteFile.mock.calls[0]
      const secondSessionData = JSON.parse(secondWriteFileCall[1])
      expect(secondSessionData.createdAt).toBe(firstCreatedAt)
    })
  })

  describe('loadSession', () => {
    it('should load session from cache if available', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
          timestamp: new Date(),
        },
      ]

      // Save to cache first
      await instance.saveSession(messages, 'cached-id')

      // Clear mocks to verify cache is used
      mockReadFile.mockClear()

      const session = await instance.loadSession('cached-id')

      expect(session).not.toBeNull()
      expect(session!.id).toBe('cached-id')
      expect(mockReadFile).not.toHaveBeenCalled() // Should use cache
    })

    it('should load from file if not in cache', async () => {
      const instance = SessionManager.getInstance()
      const sessionData = {
        id: 'test-id',
        title: 'Test Session',
        messages: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockReadFile.mockResolvedValue(JSON.stringify(sessionData))

      const session = await instance.loadSession('test-id')

      expect(session).not.toBeNull()
      expect(session!.id).toBe('test-id')
      expect(session!.title).toBe('Test Session')
      expect(mockReadFile).toHaveBeenCalled()
    })

    it('should convert date strings to Date objects', async () => {
      const instance = SessionManager.getInstance()
      const now = new Date()
      const sessionData = {
        id: 'test-id',
        title: 'Test',
        messages: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'Test' }],
            timestamp: now.toISOString(),
          },
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      mockReadFile.mockResolvedValue(JSON.stringify(sessionData))

      const session = await instance.loadSession('test-id')

      expect(session!.createdAt instanceof Date).toBe(true)
      expect(session!.updatedAt instanceof Date).toBe(true)
      expect(session!.messages[0].timestamp instanceof Date).toBe(true)
    })

    it('should return null for non-existent file', async () => {
      const instance = SessionManager.getInstance()
      mockReadFile.mockRejectedValue(new Error('File not found'))

      const session = await instance.loadSession('nonexistent')

      expect(session).toBeNull()
    })

    it('should cache loaded session', async () => {
      const instance = SessionManager.getInstance()
      const sessionData = {
        id: 'test-id',
        title: 'Test',
        messages: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'Test' }],
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockReadFile.mockResolvedValue(JSON.stringify(sessionData))

      await instance.loadSession('test-id')
      mockReadFile.mockClear()

      // Load again - should use cache
      await instance.loadSession('test-id')
      expect(mockReadFile).not.toHaveBeenCalled()
    })
  })

  describe('listSessions', () => {
    it('should return empty array if no sessions', async () => {
      const instance = SessionManager.getInstance()
      mockReaddir.mockResolvedValue([])

      const sessions = await instance.listSessions()

      expect(sessions).toEqual([])
    })

    it('should list all session files', async () => {
      const instance = SessionManager.getInstance()
      mockReaddir.mockResolvedValue(['session1.json', 'session2.json', 'not-a-session.txt'])

      const sessionData = {
        id: 'session1',
        title: 'Session 1',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockReadFile.mockResolvedValue(JSON.stringify(sessionData))

      const sessions = await instance.listSessions()

      expect(sessions.length).toBe(2)
      expect(sessions.map(s => s.id)).toContain('session1')
    })

    it('should sort sessions by updatedAt descending', async () => {
      const instance = SessionManager.getInstance()
      mockReaddir.mockResolvedValue(['session1.json', 'session2.json'])

      const olderDate = new Date('2024-01-01T00:00:00Z')
      const newerDate = new Date('2024-12-01T00:00:00Z')

      mockReadFile
        .mockResolvedValueOnce(
          JSON.stringify({
            id: 'session1',
            title: 'Old',
            messages: [],
            createdAt: olderDate.toISOString(),
            updatedAt: olderDate.toISOString(),
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            id: 'session2',
            title: 'New',
            messages: [],
            createdAt: newerDate.toISOString(),
            updatedAt: newerDate.toISOString(),
          })
        )

      const sessions = await instance.listSessions()

      expect(sessions[0].id).toBe('session2')
      expect(sessions[1].id).toBe('session1')
    })

    it('should handle readdir errors gracefully', async () => {
      const instance = SessionManager.getInstance()
      mockReaddir.mockRejectedValue(new Error('Permission denied'))

      const sessions = await instance.listSessions()

      expect(sessions).toEqual([])
    })
  })

  describe('deleteSession', () => {
    it('should delete session file and cache entry', async () => {
      const instance = SessionManager.getInstance()
      await instance.saveSession([], 'to-delete')
      mockUnlink.mockResolvedValue(undefined)

      const result = await instance.deleteSession('to-delete')

      expect(result).toBe(true)
      expect(mockUnlink).toHaveBeenCalled()
    })

    it('should return false on failure', async () => {
      const instance = SessionManager.getInstance()
      mockUnlink.mockRejectedValue(new Error('File not found'))

      const result = await instance.deleteSession('nonexistent')

      expect(result).toBe(false)
    })

    it('should remove from cache', async () => {
      const instance = SessionManager.getInstance()
      await instance.saveSession([], 'cache-id')
      mockUnlink.mockResolvedValue(undefined)

      await instance.deleteSession('cache-id')

      // Verify cache is cleared by trying to load
      mockReadFile.mockRejectedValue(new Error('Not found'))
      const session = await instance.loadSession('cache-id')
      expect(session).toBeNull()
    })
  })

  describe('autoSave', () => {
    it('should not save empty messages', async () => {
      const instance = SessionManager.getInstance()
      await instance.autoSave([])
      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it('should save with 'autosave_latest' ID', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
          timestamp: new Date(),
        },
      ]

      await instance.autoSave(messages)

      expect(mockWriteFile).toHaveBeenCalled()
      const writeFileCall = mockWriteFile.mock.calls[0]
      expect(writeFileCall[0]).toContain('autosave_latest.json')
    })
  })

  describe('saveOnExit', () => {
    it('should save with 'last_session' ID for non-empty messages', async () => {
      const instance = SessionManager.getInstance()
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
          timestamp: new Date(),
        },
      ]

      await instance.saveOnExit(messages)

      expect(mockWriteFile).toHaveBeenCalled()
      const writeFileCall = mockWriteFile.mock.calls[0]
      expect(writeFileCall[0]).toContain('last_session.json')
    })

    it('should not save empty messages', async () => {
      const instance = SessionManager.getInstance()
      await instance.saveOnExit([])
      expect(mockWriteFile).not.toHaveBeenCalled()
    })
  })
})
