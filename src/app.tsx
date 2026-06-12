import React, { useState, useCallback } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { opencodeTheme } from './theme'
import { ToolOutput } from './components/tool-output'
import { parseCommand, createContext, commands } from './commands'
import { sendToAI } from './providers/ai'
import type { Message, MessagePart, Config } from './types'

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
    if (key.ctrl && inputChar === 'c') {
      exit()
    }
    if (key.ctrl && inputChar === 'b') {
      setSidebarOpen(prev => !prev)
    }
    if (key.escape) {
      setInput('')
    }
  })

  // Send message to AI
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim() || isLoading) return

    const context = createContext(config, process.cwd())

    // Check for slash command
    const cmd = parseCommand(value)
    if (cmd) {
      // Handle /clear specially
      if (cmd.command.name === 'clear') {
        setMessages([])
        setInput('')
        return
      }

      // Handle /provider specially
      if (cmd.command.name === 'provider') {
        const result = await cmd.command.run(cmd.args, context)
        if (result.length > 0) {
          const systemMessage: Message = {
            id: Date.now().toString(),
            role: 'system',
            parts: result,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, systemMessage])
        }
        setInput('')
        return
      }

      // Execute command
      setIsLoading(true)
      try {
        const result = await cmd.command.run(cmd.args, context)
        if (result.length > 0) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            parts: result,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, assistantMessage])
        }
      } catch (error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          parts: [{ type: 'text', text: `Error: ${error}` }],
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
        setInput('')
      }
      return
    }

    // Regular message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      parts: [{ type: 'text', text: value }],
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const provider = config.providers.find(p => p.id === config.activeProvider)
      if (!provider) throw new Error('Provider not found')

      const resultParts = await sendToAI([...messages, userMessage], provider)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        parts: resultParts,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        parts: [{ type: 'text', text: `Error: ${error}` }],
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [config, messages, isLoading])

  // Render a message
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'

    return (
      <Box key={message.id} flexDirection="column" marginBottom={1} paddingLeft={1}>
        {/* Role indicator */}
        {!isSystem && (
          <Text
            color={isUser ? theme.primary : theme.accent}
            bold
          >
            {isUser ? '>' : '<'}
          </Text>
        )}

        {/* Message parts */}
        {message.parts.map((part, index) => (
          <ToolOutput key={index} part={part} />
        ))}
      </Box>
    )
  }

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)

  const handleInputChange = (value: string) => {
    setInput(value)

    // Command autocomplete
    if (value.startsWith('/')) {
      const query = value.slice(1).toLowerCase()
      const matching = commands
        .filter(cmd => cmd.name.startsWith(query) || cmd.aliases?.some(a => a.startsWith(query)))
        .map(cmd => `/${cmd.name}`)
      setSuggestions(matching.slice(0, 5))
      setSelectedSuggestion(0)
    } else {
      setSuggestions([])
    }
  }

  const handleSubmitWithAutocomplete = (value: string) => {
    if (suggestions.length > 0 && value === '') {
      handleSubmit(suggestions[selectedSuggestion])
    } else {
      handleSubmit(value)
    }
    setSuggestions([])
  }

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
          {messages.map(renderMessage)}

          {isLoading && (
            <Box paddingLeft={1}>
              <Text color={theme.info}>Thinking...</Text>
            </Box>
          )}
        </Box>

        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <Box flexDirection="column" paddingLeft={1} marginBottom={1}>
            {suggestions.map((suggestion, index) => (
              <Text
                key={suggestion}
                color={index === selectedSuggestion ? theme.primary : theme.textMuted}
              >
                {suggestion}
              </Text>
            ))}
          </Box>
        )}

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
            onChange={handleInputChange}
            onSubmit={handleSubmitWithAutocomplete}
            placeholder="Ask anything or type / for commands..."
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
            <Text color={theme.text}>/review [file] - Review code</Text>
            <Text color={theme.text}>/explain [file] - Explain code</Text>
            <Text color={theme.text}>/fix [file] - Fix issues</Text>
            <Text color={theme.text}>/file [path] - Show file</Text>
            <Text color={theme.text}>/ls [path] - List files</Text>
            <Text color={theme.text}>/provider - Switch provider</Text>
            <Text color={theme.text}>/clear - Clear chat</Text>
            <Text color={theme.text}>/help - Show help</Text>
          </Box>
          <Box marginTop={2}>
            <Text color={theme.textMuted}>Keyboard Shortcuts</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.text}>Ctrl+B - Toggle sidebar</Text>
            <Text color={theme.text}>Ctrl+C - Exit</Text>
            <Text color={theme.text}>Escape - Clear input</Text>
            <Text color={theme.text}>Tab - Autocomplete</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
