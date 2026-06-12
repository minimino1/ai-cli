import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test'
import { render } from 'ink'
import { Editor } from '../src/components/editor'
import { PassThrough, Writable } from 'node:stream'

// Mock useApp from ink to prevent test exits
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useApp: () => ({ exit: vi.fn() }),
  }
})

describe('Editor Component', () => {
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
  })

  afterEach(() => {
    // Clean up any render instances
  })

  it('renders with line numbers', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush } = render(
      <Editor
        filePath="test.txt"
        initialContent="line1\nline2\nline3"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    const result = getOutput()
    // Check that line numbers are present (padded with spaces)
    expect(result).toContain('1 ')
    expect(result).toContain('2 ')
    expect(result).toContain('3 ')
    // Check file path in header
    expect(result).toContain('test.txt')
    // Check that line count is displayed
    expect(result).toContain('Line 1/3')

    unmount()
  })

  it('shows modified status when content changes', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush, rerender } = render(
      <Editor
        filePath="test.txt"
        initialContent="original"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()
    let result = getOutput()
    // Initially not modified
    expect(result).toContain('SAVED')

    // Simulate typing by changing the input value - this is tricky without TextInput internals
    // Instead, we can test that the component state updates when we simulate keypresses
    // But that's complex. For now, we'll test that the modified flag appears after a change.
    // We'll need to simulate keypresses that modify the input.

    // Write a character to stdin to change the current line
    // This simulates typing 'x' on the first line
    stdin.write('x')
    await waitUntilRenderFlush()

    result = getOutput()
    expect(result).toContain('MODIFIED')

    unmount()
  })

  it('calls onSave when Ctrl+S is pressed', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush } = render(
      <Editor
        filePath="test.txt"
        initialContent="test content"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    // Simulate Ctrl+S (ASCII 19)
    stdin.write(Buffer.from([19])) // Ctrl+S

    // Wait for any async updates
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onSave).toHaveBeenCalled()
    // The saved content should be the current line content
    expect(onSave).toHaveBeenCalledWith('test content')

    unmount()
  })

  it('calls onCancel when Escape is pressed', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush } = render(
      <Editor
        filePath="test.txt"
        initialContent="test"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    // Simulate Escape (ASCII 27)
    stdin.write(Buffer.from([27]))

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onCancel).toHaveBeenCalled()

    unmount()
  })

  it('navigates to next line with Enter', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush } = render(
      <Editor
        filePath="test.txt"
        initialContent="line1\nline2"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()
    let result = getOutput()
    expect(result).toContain('Line 1/2')

    // Press Enter to submit current line and move to next
    stdin.write(Buffer.from([13])) // Carriage return (Enter)

    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('Line 2/2')

    unmount()
  })

  it('navigates up with Arrow Up', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush } = render(
      <Editor
        filePath="test.txt"
        initialContent="line1\nline2\nline3"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()
    let result = getOutput()
    expect(result).toContain('Line 1/3')

    // Press Arrow Up (escape sequence: \x1b[A)
    stdin.write(Buffer.from([27, 91, 65]))

    await waitUntilRenderFlush()
    result = getOutput()
    // Should still be on line 1 (can't go above)
    expect(result).toContain('Line 1/3')

    // Move down first then up
    // Press Arrow Down to go to line 2
    stdin.write(Buffer.from([27, 91, 66]))
    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('Line 2/3')

    // Now press Arrow Up to go back to line 1
    stdin.write(Buffer.from([27, 91, 65]))
    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('Line 1/3')

    unmount()
  })

  it('displays help text', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush } = render(
      <Editor
        filePath="test.txt"
        initialContent="test"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()

    const result = getOutput()
    // Check for help text in footer
    expect(result).toContain('Ctrl+S: Save')
    expect(result).toContain('Esc: Cancel')
    expect(result).toContain('↑↓: Navigate')

    unmount()
  })

  it('toggles help with ? key', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { unmount, waitUntilRenderFlush } = render(
      <Editor
        filePath="test.txt"
        initialContent="test"
        onSave={onSave}
        onCancel={onCancel}
      />,
      { stdin, stdout }
    )

    await waitUntilRenderFlush()
    let result = getOutput()
    expect(result).toContain('Ctrl+S: Save') // Help is visible by default

    // Press ? to toggle help off
    stdin.write('?')
    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).not.toContain('Ctrl+S: Save')

    // Press ? again to toggle help on
    stdin.write('?')
    await waitUntilRenderFlush()
    result = getOutput()
    expect(result).toContain('Ctrl+S: Save')

    unmount()
  })
})
