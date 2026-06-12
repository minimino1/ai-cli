// ─── Message Parts ───────────────────────────────────────────────
export interface TextPart {
  type: 'text'
  text: string
}

export interface CodePart {
  type: 'code'
  language: string
  code: string
  filename?: string
}

export interface DiffPart {
  type: 'diff'
  filename: string
  hunks: DiffHunk[]
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk'
  content: string
  oldLineNum?: number
  newLineNum?: number
}

export interface ReviewPart {
  type: 'review'
  filename: string
  severity: 'error' | 'warning' | 'info' | 'suggestion'
  line?: number
  message: string
  suggestion?: string
}

export interface ExplainPart {
  type: 'explain'
  title: string
  content: string
  code?: CodePart
  references?: string[]
}

export interface FixPart {
  type: 'fix'
  description: string
  diff: DiffPart
  applied?: boolean
}

export interface FilePart {
  type: 'file'
  filename: string
  content: string
  language?: string
}

export type MessagePart = TextPart | CodePart | DiffPart | ReviewPart | ExplainPart | FixPart | FilePart

// ─── Message ─────────────────────────────────────────────────────
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: MessagePart[]
  timestamp: Date
  toolCallId?: string
}

// ─── Tool Definitions ────────────────────────────────────────────
export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  status: 'pending' | 'running' | 'completed' | 'error'
}

// ─── Provider ────────────────────────────────────────────────────
export interface Provider {
  id: string
  name: string
  apiUrl: string
  model: string
  apiKey?: string
}

// ─── Config ──────────────────────────────────────────────────────
export interface Config {
  providers: Provider[]
  activeProvider: string
}

// ─── Command ─────────────────────────────────────────────────────
export interface Command {
  name: string
  description: string
  aliases?: string[]
  args?: string[]
  run: (args: string, context: CommandContext) => Promise<MessagePart[]>
}

export interface CommandContext {
  config: Config
  cwd: string
  readFile: (path: string) => Promise<string>
  listFiles: (path: string) => Promise<string[]>
  sendToAI: (parts: MessagePart[]) => Promise<MessagePart[]>
}

// ─── Default Config ──────────────────────────────────────────────
export const defaultConfig: Config = {
  providers: [
    {
      id: 'nvidia',
      name: 'NVIDIA',
      apiUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
      model: 'gemma3n-e4b-it-q4',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4',
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      apiUrl: 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-opus',
    },
    {
      id: 'ollama',
      name: 'Ollama',
      apiUrl: 'http://localhost:11434/api/chat',
      model: 'llama2',
    },
  ],
  activeProvider: 'nvidia',
}
