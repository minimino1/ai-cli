import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { readdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

interface FileExplorerProps {
  cwd: string
  onSelect: (path: string) => void
  onClose: () => void
  filterExt?: string
  searchQuery?: string
}

interface FileEntry {
  name: string
  path: string
  isDir: boolean
  stat?: { size: number; mtime: Date }
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  cwd,
  onSelect,
  onClose,
  filterExt,
  searchQuery,
}) => {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [currentPath, setCurrentPath] = useState(cwd)
  const [history, setHistory] = useState<string[]>([])
  const [preview, setPreview] = useState<string>('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [search, setSearch] = useState(searchQuery || '')

  const loadDirectory = useCallback(async (dirPath: string) => {
    try {
      const items = await readdir(dirPath, { withFileTypes: true })
      const fileEntries: FileEntry[] = []

      for (const item of items) {
        if (item.name.startsWith('.') && item.name !== '.' && item.name !== '..') {
          continue
        }

        const fullPath = join(dirPath, item.name)
        const isDir = item.isDirectory()

        let statInfo
        if (!isDir) {
          try {
            const s = await stat(fullPath)
            statInfo = { size: s.size, mtime: s.mtime }
          } catch {
            statInfo = undefined
          }
        }

        fileEntries.push({
          name: item.name,
          path: fullPath,
          isDir,
          stat: statInfo,
        })
      }

      // Sort: directories first, then files, both alphabetically
      fileEntries.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })

      setEntries(fileEntries)
      setSelectedIndex(0)
    } catch (error) {
      setEntries([])
    }
  }, [])

  const loadPreview = useCallback(async (filePath: string) => {
    if (loadingPreview) return
    setLoadingPreview(true)
    try {
      const content = await Bun.file(filePath).text()
      // Limit preview to 500 chars
      setPreview(content.length > 500 ? content.substring(0, 500) + '...' : content)
    } catch {
      setPreview('(Unable to read file)')
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  useEffect(() => {
    loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  useEffect(() => {
    if (search) {
      const filtered = entries.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) &&
        (!filterExt || (!e.isDir && extname(e.name) === filterExt))
      )
      // We don't modify entries directly, just adjust selection
    }
  }, [search, entries, filterExt])

  const filteredEntries = entries.filter(e => {
    const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    const matchesExt = !filterExt || (!e.isDir && extname(e.name) === filterExt)
    return matchesSearch && matchesExt
  })

  useInput((input, key) => {
    if (key.escape) {
      onClose()
      return
    }

    if (key.enter) {
      if (filteredEntries.length > 0 && !filteredEntries[selectedIndex]?.isDir) {
        onSelect(filteredEntries[selectedIndex].path)
      }
      return
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1))
      const newIndex = Math.max(0, selectedIndex - 1)
      if (filteredEntries[newIndex] && !filteredEntries[newIndex].isDir) {
        loadPreview(filteredEntries[newIndex].path)
      }
      return
    }

    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredEntries.length - 1, prev + 1))
      const newIndex = Math.min(filteredEntries.length - 1, selectedIndex + 1)
      if (filteredEntries[newIndex] && !filteredEntries[newIndex].isDir) {
        loadPreview(filteredEntries[newIndex].path)
      }
      return
    }

    if (key.leftArrow || key.rightArrow) {
      // Navigation not implemented for simplicity
      return
    }

    // Handle character input for search
    if (input && !key.ctrl && !key.meta) {
      setSearch(prev => prev + input)
    }

    // Handle backspace
    if (key.backspace) {
      setSearch(prev => prev.slice(0, -1))
    }
  })

  const handleEnter = useCallback(() => {
    if (filteredEntries.length > 0 && !filteredEntries[selectedIndex]?.isDir) {
      onSelect(filteredEntries[selectedIndex].path)
    }
  }, [filteredEntries, selectedIndex, onSelect])

  const handleDoubleClick = useCallback(async (entry: FileEntry) => {
    if (entry.isDir) {
      setHistory(prev => [...prev, currentPath])
      setCurrentPath(entry.path)
      setSearch('')
      setPreview('')
    } else {
      loadPreview(entry.path)
    }
  }, [currentPath, loadPreview])

  // Navigate into directory on Enter if it's a directory
  useEffect(() => {
    if (filteredEntries.length > 0 && filteredEntries[selectedIndex]?.isDir) {
      const handle = setTimeout(() => {
        // Could auto-navigate, but let's keep it simple
      }, 500)
      return () => clearTimeout(handle)
    }
  }, [selectedIndex, filteredEntries])

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderBottom={true} paddingX={1}>
        <Text bold color="cyan">📂 File Explorer</Text>
        <Text> </Text>
        <Text color="gray">{currentPath}</Text>
      </Box>

      {/* Search bar */}
      <Box paddingX={1}>
        <Text color="yellow">🔍 </Text>
        <Text>{search || '(type to search)'}</Text>
        {filterExt && <Text color="magenta"> [*.{filterExt}]</Text>}
      </Box>

      {/* File list */}
      <Box flexDirection="column" overflow="hidden" height="50%">
        {filteredEntries.length === 0 ? (
          <Text color="gray" dimColor paddingX={1}>
            No files found
          </Text>
        ) : (
          filteredEntries.map((entry, index) => (
            <Box
              key={entry.path}
              paddingX={1}
              backgroundColor={index === selectedIndex ? 'blue' : undefined}
            >
              <Text>{entry.isDir ? '📁' : '📄'}</Text>
              <Text> </Text>
              <Text
                color={index === selectedIndex ? 'white' : entry.isDir ? 'cyan' : 'white'}
                bold={index === selectedIndex}
              >
                {entry.name}
              </Text>
              {!entry.isDir && entry.stat && (
                <Text color="gray"> ({formatSize(entry.stat.size)})</Text>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Preview */}
      <Box flexDirection="column" borderStyle="single" borderTop={true} height="50%" overflow="hidden">
        <Box paddingX={1} backgroundColor="gray">
          <Text bold color="white">Preview</Text>
        </Box>
        <Box paddingX={1} overflow="hidden" flexDirection="column">
          {loadingPreview ? (
            <Text color="yellow">Loading...</Text>
          ) : preview ? (
            <Text wrap="truncate">{preview}</Text>
          ) : (
            <Text color="gray" dimColor>
              Select a file to preview
            </Text>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderTop={true} paddingX={1}>
        <Text color="cyan">Enter: Select file</Text>
        <Text> </Text>
        <Text color="cyan">Esc: Close</Text>
        <Text> </Text>
        <Text color="cyan">Type: Search</Text>
        <Text> </Text>
        <Text color="cyan">↑↓: Navigate</Text>
      </Box>
    </Box>
  )
}
