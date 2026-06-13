import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { opencodeTheme } from './theme'
import { ToolOutput } from './components/tool-output'
import { parseCommand, createContext, commands } from './commands'
import { sendToAI } from './providers/ai'
import type { Message, MessagePart, Config, FileExplorerPart } from './types'
import { SessionManager } from './history'
import { FileExplorer } from './components/file-explorer'
import { Editor } from './components/editor'
import { ToastContainer, useNotification } from './components/notifications'
import { applyTheme } from './theme/apply'
import { getTheme } from './theme/index'
import { loadAllPlugins } from './plugins/loader'

interface AppProps {
  config: Config
}

export const App: React.FC<AppProps> = ({ config }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingFile, setEditingFile] = useState<string>('')
  const [editingContent, setEditingContent] = useState<string>('')

  // File explorer state
  const [fileExplorerMode, setFileExplorerMode] = useState<{
    active: boolean
    cwd?: string
    filterExt?: string
    searchQuery?: string
  }>({ active: false })

  const sessionManager = useRef(SessionManager.getInstance()).current
  const { exit } = useApp()
  const notification = useNotification()

  const theme = opencodeTheme

  // Auto-save sessions periodically
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => {
    // Load theme
    const savedThemeName = config.theme || 'dark'
    const theme = getTheme(savedThemeName) || getTheme('dark')!
    if (theme) applyTheme(theme)

    // Load plugins
    loadAllPlugins().catch(error => {
      console.error('Failed to load plugins:', error)
      notification.error('Failed to load plugins')
    })

    // Auto-save sessions
    sessionManager.startAutoSave(() => messagesRef.current, 60000)

    return () => {
      sessionManager.stopAutoSave()
      sessionManager.saveOnExit(messagesRef.current).catch(console.error)
    }
  }, [sessionManager, config.theme, notification])

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
      if (fileExplorerMode.active) {
        setFileExplorerMode({ active: false })
      }
    }
  })

  // Editor handlers
  const openEditor = useCallback((filePath: string, content: string) => {
    setEditingFile(filePath)
    setEditingContent(content)
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditingFile('')
    setEditingContent('')
  }, [])

  const saveEditor = useCallback(async (content: string) => {
    try {
      await Bun.file(editingFile).write(content)
      closeEditor()
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        parts: [{ type: 'text', text: `Saved: ${editingFile}` }],
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, systemMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        parts: [{ type: 'text', text: `Error saving file: ${error}` }],
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }, [editingFile, closeEditor])

  // Send message to AI
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim() || isLoading) return

    const context = createContext(
      config,
      process.cwd(),
      {
        getMessages: () => messages,
        setMessages: (newMessages) => setMessages(newMessages),
        getSessionManager: () => sessionManager,
        setFileExplorerMode: (mode) => {
          if (mode.active) {
            setFileExplorerMode({
              active: true,
              cwd: mode.cwd || process.cwd(),
              filterExt: mode.filterExt,
              searchQuery: mode.searchQuery,
            })
          } else {
            setFileExplorerMode({ active: false })
          }
        },
      }
    )

    // Check for slash command
    const cmd = parseCommand(value)
    if (cmd) {
      // Handle /clear specially
      if (cmd.command.name === 'clear') {
        setMessages([])
        setInput('')
        return
      }

      // Handle /edit specially - open editor
      if (cmd.command.name === 'edit') {
        const filePath = cmd.args.trim() || '.'
        try {
          const content = await Bun.file(filePath).text()
          openEditor(filePath, content)
        } catch (error) {
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'system',
            parts: [{ type: 'text', text: `Error opening file: ${error}` }],
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, errorMessage])
        }
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

        // Check if command wants to open file explorer
        const explorerPart = result.find(p => p.type === 'file-explorer') as FileExplorerPart | undefined
        if (explorerPart && context.setFileExplorerMode) {
          context.setFileExplorerMode({
            active: true,
            cwd: explorerPart.cwd || process.cwd(),
            filterExt: explorerPart.filterExt,
            searchQuery: explorerPart.searchQuery,
          })
          // Don't show the part as a message, just open explorer
          setInput('')
          setIsLoading(false)
          return
        }

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

  // Handle file selection from file explorer
  const handleFileSelect = useCallback((filePath: string) => {
    setInput(filePath)
    setFileExplorerMode({ active: false })
  }, [])

  return (
    <Box flexDirection="column" width="100%" height="100%" position="relative">
      {editorOpen ? (
        <Box width="100%" height="100%">
          <Editor
            filePath={editingFile}
            initialContent={editingContent}
            onSave={saveEditor}
            onCancel={closeEditor}
          />
        </Box>
      ) : fileExplorerMode.active ? (
        <Box width="100%" height="100%">
          <FileExplorer
            cwd={fileExplorerMode.cwd || process.cwd()}
            onSelect={handleFileSelect}
            onClose={() => setFileExplorerMode({ active: false })}
            filterExt={fileExplorerMode.filterExt}
            searchQuery={fileExplorerMode.searchQuery}
          />
        </Box>
      ) : (
        <Box flexDirection="row" flexGrow={1}>
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
            {/* Messages - scrollable area */}
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

            {/* Input area - fixed at bottom */}
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

          {/* Sidebar - fixed width */}
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
                 <Text color={theme.text}>/browse [path] - File browser</Text>
                 <Text color={theme.text}>/sessions - List sessions</Text>
                  <Text color={theme.text}>{'/load [id] - Load session'}</Text>
                 <Text color={theme.text}>/save [title] - Save session</Text>
                  <Text color={theme.text}>{'/delete [id] - Delete session'}</Text>
                 <Text color={theme.text}>/edit [file] - Edit file</Text>
                 <Text color={theme.text}>/open [file] - View file</Text>
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
      )}
      <ToastContainer />
    </Box>
  )
}
