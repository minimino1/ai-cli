import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { Session, Message } from './types'

const SESSIONS_DIR = `${process.env.HOME}/.config/ai-cli/sessions`

export class SessionManager {
  private static instance: SessionManager
  private sessions: Map<string, Session> = new Map()
  private autoSaveInterval?: NodeJS.Timeout

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  async ensureDir(): Promise<void> {
    try {
      await mkdir(SESSIONS_DIR, { recursive: true })
    } catch {
      // Directory already exists or can't be created
    }
  }

  generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  extractTitle(messages: Message[]): string {
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (!firstUserMessage) return 'Untitled Session'

    const textPart = firstUserMessage.parts.find(p => p.type === 'text') as { text: string } | undefined
    if (!textPart) return 'Untitled Session'

    const text = textPart.text.trim()
    if (text.length <= 50) return text
    return text.substring(0, 50) + '...'
  }

  async saveSession(messages: Message[], customId?: string): Promise<string> {
    await this.ensureDir()

    const id = customId || this.generateId()
    const title = this.extractTitle(messages)
    const now = new Date()

    const session: Session = {
      id,
      title,
      messages,
      createdAt: customId && this.sessions.has(id) ? this.sessions.get(id)!.createdAt : now,
      updatedAt: now,
    }

    this.sessions.set(id, session)

    const filePath = join(SESSIONS_DIR, `${id}.json`)
    const serialized = JSON.stringify(session, (key, value) => {
      if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
        if (value instanceof Date) return value.toISOString()
        if (typeof value === 'string') return value // already serialized
        return String(value)
      }
      return value
    }, 2)
    await writeFile(filePath, serialized)

    return id
  }

  async loadSession(id: string): Promise<Session | null> {
    // Check cache first
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!
    }

    const filePath = join(SESSIONS_DIR, `${id}.json`)
    try {
      const data = await readFile(filePath, 'utf-8')
      const session = JSON.parse(data) as Session

      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt)
      session.updatedAt = new Date(session.updatedAt)
      session.messages = session.messages.map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))

      this.sessions.set(id, session)
      return session
    } catch {
      return null
    }
  }

  async listSessions(): Promise<Session[]> {
    await this.ensureDir()

    try {
      const files = await readdir(SESSIONS_DIR)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      const sessions: Session[] = []
      for (const file of jsonFiles) {
        const id = file.replace('.json', '')
        const session = await this.loadSession(id)
        if (session) {
          sessions.push(session)
        }
      }

      // Sort by updatedAt descending
      sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      return sessions
    } catch {
      return []
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    const filePath = join(SESSIONS_DIR, `${id}.json`)
    try {
      await unlink(filePath)
      this.sessions.delete(id)
      return true
    } catch {
      return false
    }
  }

  async autoSave(messages: Message[]): Promise<void> {
    if (messages.length === 0) return
    await this.saveSession(messages, 'autosave_latest')
  }

  startAutoSave(messagesGetter: () => Message[], intervalMs: number = 60000): void {
    this.autoSaveInterval = setInterval(async () => {
      const messages = messagesGetter()
      await this.autoSave(messages)
    }, intervalMs)
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = undefined
    }
  }

  async saveOnExit(messages: Message[]): Promise<void> {
    if (messages.length > 0) {
      await this.saveSession(messages, 'last_session')
    }
  }
}
