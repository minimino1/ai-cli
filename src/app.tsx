import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { opencodeTheme, type Theme } from './theme'
import type { Message, Config } from './types'

interface AppProps {
  config: Config
}

export const App: React.FC<AppProps> = ({ config }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { exit } = useApp()

  const theme = opencodeTheme

  // Handle keyboard shortcuts
  useInput((inputChar, key) => {
    // Ctrl+C to exit
    if (key.ctrl && inputChar === 'c') {
      exit()
    }
    // Ctrl+B to toggle sidebar
    if (key.ctrl && inputChar === 'b') {
      setSidebarOpen(prev => !prev)
    }
    // Escape to clear input
    if (key.escape) {
      setInput('')
    }
  })

  // Send message to AI
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: value,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const provider = config.providers.find(p => p.id === config.activeProvider)
      if (!provider) throw new Error('Provider not found')

      // TODO: Implement actual AI API call
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000))

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `This is a simulated response from ${provider.name}. The AI API integration is not yet implemented.`,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [config, isLoading])

  return (
    <Box flexDirection="row" width="100%" height="100%">
      {/* Main chat area */}
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        borderStyle="single"
        borderColor={theme.border}
        borderLeft={false}
        borderTop={false}
        borderBottom={false}
        borderRight={sidebarOpen}
      >
        {/* Messages */}
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {messages.map((message) => (
            <Box
              key={message.id}
              flexDirection="column"
              marginBottom={1}
              paddingLeft={1}
            >
              <Text
                color={message.role === 'user' ? theme.primary : theme.accent}
                bold
              >
                {message.role === 'user' ? '>' : '<'}
              </Text>
              <Text color={theme.text}>{message.content}</Text>
            </Box>
          ))}

          {isLoading && (
            <Box paddingLeft={1}>
              <Text color={theme.textMuted}>Thinking...</Text>
            </Box>
          )}
        </Box>

        {/* Input area */}
        <Box
          borderStyle="single"
          borderColor={isLoading ? theme.info : theme.border}
          borderTop={true}
          paddingLeft={1}
          flexDirection="row"
        >
          <Text color={theme.primary} bold>› </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Ask anything..."
          />
        </Box>

        {/* Footer */}
        <Box justifyContent="space-between" paddingLeft={1}>
          <Text color={theme.textMuted} dimColor>
            {sidebarOpen ? 'Ctrl+B: hide sidebar' : 'Ctrl+B: show sidebar'}
          </Text>
          <Text color={theme.textMuted} dimColor>
            {config.activeProvider} · {messages.length} messages
          </Text>
        </Box>
      </Box>

      {/* Sidebar */}
      {sidebarOpen && (
        <Box
          width={42}
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.border}
          borderLeft={true}
          borderTop={false}
          borderBottom={false}
          borderRight={false}
          paddingLeft={1}
        >
          <Text color={theme.accent} bold>AI CLI</Text>
          <Box marginTop={1}>
            <Text color={theme.textMuted}>Provider: </Text>
            <Text color={theme.primary}>{config.activeProvider}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.textMuted}>Quick Actions</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.text}>/clear - Clear chat</Text>
            <Text color={theme.text}>/provider - Switch provider</Text>
            <Text color={theme.text}>/help - Show help</Text>
            <Text color={theme.text}>/exit - Exit</Text>
          </Box>
          <Box marginTop={2}>
            <Text color={theme.textMuted}>Keyboard Shortcuts</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.text}>Ctrl+B - Toggle sidebar</Text>
            <Text color={theme.text}>Ctrl+C - Exit</Text>
            <Text color={theme.text}>Escape - Clear input</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
