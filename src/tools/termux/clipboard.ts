// ─── Termux Clipboard ───────────────────────────────────────────────────
// Clipboard integration for Termux using termux-api or fallbacks

import { spawn } from 'bun'
import * as detectModule from './detect'

const { detectTermux, termuxAPIAvailable } = detectModule

export interface ClipboardResult {
  success: boolean
  message: string
  data?: string
}

// ─── Check Available Clipboard Tools ───────────────────────────────────
function getClipboardTool(): 'termux-api' | 'xclip' | 'xsel' | 'wl-copy' | 'pbcopy' | 'none' {
  const status = detectTermux()

  // Termux API (primary for Termux)
  if (status.isTermux && termuxAPIAvailable()) {
    return 'termux-api'
  }

  // Check for other clipboard tools
  if (Bun.which?.('xclip')) return 'xclip'
  if (Bun.which?.('xsel')) return 'xsel'
  if (Bun.which?.('wl-copy')) return 'wl-copy'
  if (Bun.which?.('pbcopy')) return 'pbcopy'

  return 'none'
}

// ─── Copy to Clipboard ────────────────────────────────────────────────
/**
 * Copy text to clipboard
 */
export async function copy(text: string): Promise<ClipboardResult> {
  const tool = getClipboardTool()

  if (tool === 'none') {
    return {
      success: false,
      message: 'No clipboard tool available. Install termux-api (Termux) or xclip/xsel (Linux).',
    }
  }

  try {
    switch (tool) {
      case 'termux-api': {
        const result = await Bun.spawn({
          program: 'termux-clipboard-set',
          args: [],
          cwd: Bun.cwd(),
          stdin: 'pipe',
          stdout: 'ignore',
          stderr: 'pipe',
        })

        if (result.stdin) {
          const writer = result.stdin.getWriter()
          await writer.write(new TextEncoder().encode(text))
          await writer.close()
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Copied to clipboard' }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `termux-clipboard-set failed: ${stderr}` }
        }
      }

      case 'xclip': {
        const result = await Bun.spawn({
          program: 'xclip',
          args: ['-selection', 'clipboard'],
          cwd: Bun.cwd(),
          stdin: 'pipe',
          stdout: 'ignore',
          stderr: 'pipe',
        })

        if (result.stdin) {
          const writer = result.stdin.getWriter()
          await writer.write(new TextEncoder().encode(text))
          await writer.close()
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Copied to clipboard (xclip)' }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `xclip failed: ${stderr}` }
        }
      }

      case 'xsel': {
        const result = await Bun.spawn({
          program: 'xsel',
          args: ['--clipboard', '--input'],
          cwd: Bun.cwd(),
          stdin: 'pipe',
          stdout: 'ignore',
          stderr: 'pipe',
        })

        if (result.stdin) {
          const writer = result.stdin.getWriter()
          await writer.write(new TextEncoder().encode(text))
          await writer.close()
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Copied to clipboard (xsel)' }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `xsel failed: ${stderr}` }
        }
      }

      case 'wl-copy': {
        const result = await Bun.spawn({
          program: 'wl-copy',
          args: [],
          cwd: Bun.cwd(),
          stdin: 'pipe',
          stdout: 'ignore',
          stderr: 'pipe',
        })

        if (result.stdin) {
          const writer = result.stdin.getWriter()
          await writer.write(new TextEncoder().encode(text))
          await writer.close()
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Copied to clipboard (wl-copy)' }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `wl-copy failed: ${stderr}` }
        }
      }

      case 'pbcopy': {
        const result = await Bun.spawn({
          program: 'pbcopy',
          args: [],
          cwd: Bun.cwd(),
          stdin: 'pipe',
          stdout: 'ignore',
          stderr: 'pipe',
        })

        if (result.stdin) {
          const writer = result.stdin.getWriter()
          await writer.write(new TextEncoder().encode(text))
          await writer.close()
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Copied to clipboard (pbcopy)' }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `pbcopy failed: ${stderr}` }
        }
      }
    }
  } catch (error: any) {
    return { success: false, message: `Clipboard error: ${error.message}` }
  }

  return { success: false, message: 'Unknown clipboard tool' }
}

// ─── Paste from Clipboard ─────────────────────────────────────────────
/**
 * Paste text from clipboard
 */
export async function paste(): Promise<ClipboardResult> {
  const tool = getClipboardTool()

  if (tool === 'none') {
    return {
      success: false,
      message: 'No clipboard tool available. Install termux-api (Termux) or xclip/xsel (Linux).',
      data: '',
    }
  }

  try {
    switch (tool) {
      case 'termux-api': {
        const result = await Bun.spawn({
          program: 'termux-clipboard-get',
          args: [],
          cwd: Bun.cwd(),
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
        })

        let stdout = ''
        if (result.stdout) {
          const reader = result.stdout.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) stdout += new TextDecoder().decode(value)
            }
          } catch {}
          finally {
            reader.releaseLock()
          }
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Pasted from clipboard', data: stdout }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `termux-clipboard-get failed: ${stderr}`, data: '' }
        }
      }

      case 'xclip': {
        const result = await Bun.spawn({
          program: 'xclip',
          args: ['-selection', 'clipboard', '-o'],
          cwd: Bun.cwd(),
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
        })

        let stdout = ''
        if (result.stdout) {
          const reader = result.stdout.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) stdout += new TextDecoder().decode(value)
            }
          } catch {}
          finally {
            reader.releaseLock()
          }
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Pasted from clipboard (xclip)', data: stdout }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `xclip failed: ${stderr}`, data: '' }
        }
      }

      case 'xsel': {
        const result = await Bun.spawn({
          program: 'xsel',
          args: ['--clipboard', '--output'],
          cwd: Bun.cwd(),
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
        })

        let stdout = ''
        if (result.stdout) {
          const reader = result.stdout.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) stdout += new TextDecoder().decode(value)
            }
          } catch {}
          finally {
            reader.releaseLock()
          }
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Pasted from clipboard (xsel)', data: stdout }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `xsel failed: ${stderr}`, data: '' }
        }
      }

      case 'wl-copy': {
        const result = await Bun.spawn({
          program: 'wl-paste',
          args: [],
          cwd: Bun.cwd(),
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
        })

        let stdout = ''
        if (result.stdout) {
          const reader = result.stdout.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) stdout += new TextDecoder().decode(value)
            }
          } catch {}
          finally {
            reader.releaseLock()
          }
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Pasted from clipboard (wl-paste)', data: stdout }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `wl-paste failed: ${stderr}`, data: '' }
        }
      }

      case 'pbcopy': {
        const result = await Bun.spawn({
          program: 'pbpaste',
          args: [],
          cwd: Bun.cwd(),
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
        })

        let stdout = ''
        if (result.stdout) {
          const reader = result.stdout.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) stdout += new TextDecoder().decode(value)
            }
          } catch {}
          finally {
            reader.releaseLock()
          }
        }

        const exitCode = await result.exited
        if (exitCode === 0) {
          return { success: true, message: 'Pasted from clipboard (pbpaste)', data: stdout }
        } else {
          let stderr = ''
          if (result.stderr) {
            const reader = result.stderr.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) stderr += new TextDecoder().decode(value)
              }
            } catch {}
            finally {
              reader.releaseLock()
            }
          }
          return { success: false, message: `pbpaste failed: ${stderr}`, data: '' }
        }
      }
    }
  } catch (error: any) {
    return { success: false, message: `Clipboard error: ${error.message}`, data: '' }
  }

  return { success: false, message: 'Unknown clipboard tool', data: '' }
}

// ─── Get Clipboard Tool Info ──────────────────────────────────────────
export function getClipboardInfo(): string {
  const tool = getClipboardTool()
  const status = detectTermux()

  if (!status.isTermux) {
    return `Not in Termux. Detected clipboard tool: ${tool}`
  }

  return `Termux clipboard tool: ${tool}\ntermux-api available: ${termuxAPIAvailable() ? 'yes' : 'no'}`
}
