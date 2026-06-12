export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface Provider {
  id: string
  name: string
  apiUrl: string
  model: string
  apiKey?: string
}

export interface Config {
  providers: Provider[]
  activeProvider: string
}

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
