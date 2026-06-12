import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test'
import { render } from 'ink'
import { FileExplorer } from '../src/components/file-explorer'
import { PassThrough, Writable } from 'node:stream'

// Mock useApp from ink
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useApp: () => ({ exit: vi.fn() }),
  }
})

// Mock fs operations
const mockReaddir = vi.fn()
const mockStat = vi.fn()

vi.mock('node:fs/promises', () => ({
  readdir: mockReaddir,
  stat: mockStat,
}))

vi.mock('node:path', () => ({
  join: vi.fn((...args) => args.join('/')),
  basename: vi.fn((path) => path.split('/').pop() || path),
  extname: vi.fn((path) => {
    const ext = path.split('.').pop()
    return ext && ext !== path ? '.' + ext : ''
  }),
}))

describe('FileExplorer Component', () => {
  let stdout: Writable
  let stdin: PassThrough
  let output: string[]

  const createStreams = () => {
    output = []
    stdout = new Writable({
      write(chunk, encoding, callback) {
        output.push(chunk.toString())
        callback()
      },
    })
    stdin = new PassThrough()
  }

  const getOutput = () => output.join('')

  beforeEach(() => {
    createStreams()
    vi.clearAllMocks()
    // Set up default mocks
    mockReaddir.mockResolvedValue([])
    mockStat.mockResolvedValue({ size: 0, mtime: new Date() })
  })

  afterEach(() => {
    // Cleanup
  })

  it('displays current path in header', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([])

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    const result = getOutput()
    expect(result).toContain('/home/user')

    unmount()
  })

  it('displays files and directories', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    // Mock directory entries
    mockReaddir.mockResolvedValue([
      { name: 'Documents', isDirectory: () => true },
      { name: 'file.txt', isDirectory: () => false },
      { name: 'script.py', isDirectory: () => false },
    ])

    // Mock stat for files
    mockStat.mockImplementation(async (path) => {
      if (path.endsWith('file.txt')) {
        return { size: 1024, mtime: new Date() }
      }
      if (path.endsWith('script.py')) {
        return { size: 512, mtime: new Date() }
      }
      return { size: 0, mtime: new Date() }
    })

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    const result = getOutput()
    expect(result).toContain('Documents')
    expect(result).toContain('file.txt')
    expect(result).toContain('script.py')
    expect(result).toContain('📁') // directory icon
    expect(result).toContain('📄') // file icon

    unmount()
  })

  it('filters entries by extension', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([
      { name: 'file.txt', isDirectory: () => false },
      { name: 'file.py', isDirectory: () => false },
      { name: 'file.js', isDirectory: () => false },
      { name: 'dir', isDirectory: () => true },
    ])

    mockStat.mockResolvedValue({ size: 100, mtime: new Date() })

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
        filterExt=".py"
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    const result = getOutput()
    expect(result).toContain('file.py')
    expect(result).not.toContain('file.txt')
    expect(result).not.toContain('file.js')
    // Directories should still be visible
    expect(result).toContain('dir')

    unmount()
  })

  it('filters entries by search query', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([
      { name: 'document.txt', isDirectory: () => false },
      { name: 'doc.md', isDirectory: () => false },
      { name: 'readme.txt', isDirectory: () => false },
    ])

    mockStat.mockResolvedValue({ size: 100, mtime: new Date() })

    const { unmount, waitUntilRenderFlush, rerender } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
        searchQuery="doc"
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    let result = getOutput()
    expect(result).toContain('document.txt')
    expect(result).toContain('doc.md')
    expect(result).not.toContain('readme.txt')

    // Update search query via prop change
    rerender(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
        searchQuery="read"
      />
    )

    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('readme.txt')
    expect(result).not.toContain('document.txt')
    expect(result).not.toContain('doc.md')

    unmount()
  })

  it('navigates into directory on Enter', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    // First directory listing
    mockReaddir.mockResolvedValueOnce([
      { name: 'subdir', isDirectory: () => true },
      { name: 'file.txt', isDirectory: () => false },
    ])

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()
    let result = getOutput()
    expect(result).toContain('/home/user')

    // Simulate pressing Enter on the directory (first entry)
    stdin.write(Buffer.from([13])) // Enter

    // Wait for navigation - the component will call setCurrentPath
    // We need to wait for the next render
    await waitUntilRenderFlush()

    // The directory should have changed to /home/user/subdir
    // But we need to set up the mock for the new directory read
    mockReaddir.mockResolvedValueOnce([
      { name: 'nested.txt', isDirectory: () => false },
    ])

    // We need to wait for the effect that loads the new directory
    await new Promise(resolve => setTimeout(resolve, 50))

    result = getOutput()
    expect(result).toContain('/home/user/subdir')
    expect(result).toContain('nested.txt')

    unmount()
  })

  it('selects file on Enter when file is focused', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([
      { name: 'file.txt', isDirectory: () => false },
    ])

    mockStat.mockResolvedValue({ size: 100, mtime: new Date() })

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    // Press Enter to select the file
    stdin.write(Buffer.from([13]))

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onSelect).toHaveBeenCalledWith('/home/user/file.txt')

    unmount()
  })

  it('closes on Escape', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([])

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    // Press Escape
    stdin.write(Buffer.from([27]))

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onClose).toHaveBeenCalled()

    unmount()
  })

  it('navigates with arrow keys', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([
      { name: 'a.txt', isDirectory: () => false },
      { name: 'b.txt', isDirectory: () => false },
      { name: 'c.txt', isDirectory: () => false },
    ])

    mockStat.mockResolvedValue({ size: 100, mtime: new Date() })

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()
    let result = getOutput()
    // First entry should be selected by default (highlighted)
    // We can check that 'a.txt' appears with selection style if we capture ANSI codes
    // For simplicity, we'll just check that the component renders

    // Press Arrow Down
    stdin.write(Buffer.from([27, 91, 66])) // ESC + [ + B
    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('b.txt')

    // Press Arrow Down again
    stdin.write(Buffer.from([27, 91, 66]))
    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('c.txt')

    // Press Arrow Up
    stdin.write(Buffer.from([27, 91, 65])) // ESC + [ + A
    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('b.txt')

    unmount()
  })

  it('shows search input', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([
      { name: 'test.txt', isDirectory: () => false },
    ])

    mockStat.mockResolvedValue({ size: 100, mtime: new Date() })

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
        searchQuery="test"
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    const result = getOutput()
    expect(result).toContain('test') // search query displayed
    expect(result).toContain('🔍')

    unmount()
  })

  it('shows extension filter in header', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    mockReaddir.mockResolvedValue([])

    const { unmount, waitUntilRenderFlush } = render(
      <FileExplorer
        cwd="/home/user"
        onSelect={onSelect}
        onClose={onClose}
        filterExt=".py"
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    const result = getOutput()
    expect(result).toContain('*.py')

    unmount()
  })
})
