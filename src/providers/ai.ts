import type { Provider, Message, MessagePart } from '../types'

// ─── Provider Interface ──────────────────────────────────────────
export interface AIProvider {
  id: string
  name: string
  send(messages: Message[], provider: Provider): Promise<string>
}

// ─── System Prompt for Code Review/Explain/Fix ───────────────────
const SYSTEM_PROMPT = `You are an expert code assistant. You help with:
1. Code Review - Analyze code for bugs, security issues, performance, best practices
2. Code Explanation - Explain how code works, its purpose, and architecture
3. Code Fixing - Identify issues and provide fixes with diffs

When reviewing code, respond in this JSON format:
{
  "type": "review",
  "filename": "path/to/file.ts",
  "severity": "error|warning|info|suggestion",
  "line": 42,
  "message": "Description of the issue",
  "suggestion": "How to fix it"
}

When explaining code, respond in this JSON format:
{
  "type": "explain",
  "title": "Brief title",
  "content": "Detailed explanation",
  "references": ["related docs or patterns"]
}

When fixing code, respond with a diff in this JSON format:
{
  "type": "fix",
  "description": "What was fixed",
  "diff": {
    "filename": "path/to/file.ts",
    "hunks": [{
      "oldStart": 10,
      "oldLines": 5,
      "newStart": 10,
      "newLines": 8,
      "lines": [
        {"type": "removed", "content": "old line", "oldLineNum": 10},
        {"type": "added", "content": "new line", "newLineNum": 10}
      ]
    }]
  }
}

For general questions, respond naturally. Always be concise and helpful.`

// ─── OpenAI Compatible Provider ──────────────────────────────────
class OpenAICompatibleProvider implements AIProvider {
  id: string
  name: string

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  async send(messages: Message[], provider: Provider): Promise<string> {
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.parts
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n'),
    }))

    // Add system prompt
    apiMessages.unshift({
      role: 'system',
      content: SYSTEM_PROMPT,
    })

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    return data.choices[0]?.message?.content || ''
  }
}

// ─── Anthropic Provider ──────────────────────────────────────────
class AnthropicProvider implements AIProvider {
  id = 'anthropic'
  name = 'Anthropic'

  async send(messages: Message[], provider: Provider): Promise<string> {
    const apiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.parts
          .filter(p => p.type === 'text')
          .map(p => p.text)
          .join('\n'),
      }))

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        system: SYSTEM_PROMPT,
        messages: apiMessages,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
    }

    return data.content[0]?.text || ''
  }
}

// ─── Ollama Provider ─────────────────────────────────────────────
class OllamaProvider implements AIProvider {
  id = 'ollama'
  name = 'Ollama'

  async send(messages: Message[], provider: Provider): Promise<string> {
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.parts
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n'),
    }))

    apiMessages.unshift({
      role: 'system',
      content: SYSTEM_PROMPT,
    })

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: apiMessages,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as {
      message: { content: string }
    }

    return data.message?.content || ''
  }
}

// ─── Provider Registry ───────────────────────────────────────────
const providers: Record<string, AIProvider> = {
  nvidia: new OpenAICompatibleProvider('nvidia', 'NVIDIA'),
  openai: new OpenAICompatibleProvider('openai', 'OpenAI'),
  anthropic: new AnthropicProvider(),
  ollama: new OllamaProvider(),
}

// ─── Main Send Function ──────────────────────────────────────────
export async function sendToAI(
  messages: Message[],
  provider: Provider
): Promise<MessagePart[]> {
  const aiProvider = providers[provider.id]
  if (!aiProvider) {
    throw new Error(`Unknown provider: ${provider.id}`)
  }

  const response = await aiProvider.send(messages, provider)

  // Try to parse as JSON for tool outputs
  try {
    const parsed = JSON.parse(response)
    if (parsed.type) {
      return [parsed as MessagePart]
    }
  } catch {
    // Not JSON, return as text
  }

  // Return as text part
  return [{
    type: 'text',
    text: response,
  }]
}

// ─── Streaming Support (for future) ──────────────────────────────
export async function* streamToAI(
  messages: Message[],
  provider: Provider
): AsyncGenerator<string> {
  // For now, just send and yield the full response
  const parts = await sendToAI(messages, provider)
  for (const part of parts) {
    if (part.type === 'text') {
      yield part.text
    }
  }
}
