// ─── Termux Provider ───────────────────────────────────────────────────
// Provides Termux detection and setup utilities

import { spawn } from 'bun'
import { join } from 'node:path'

export interface TermuxStatus {
  isTermux: boolean
  termuxVersion?: string
  termuxPath?: string
  packages: {
    nodejs: boolean
    bun: boolean
    git: boolean
  }
  shellProfile?: string
}

// ─── Detect Termux ─────────────────────────────────────────────────────
export function detectTermux(): TermuxStatus {
  const termuxVersion = process.env.TERMUX_VERSION
  const isTermux = !!termuxVersion

  const status: TermuxStatus = {
    isTermux,
    termuxVersion: termuxVersion || undefined,
    packages: {
      nodejs: false,
      bun: false,
      git: false,
    },
  }

  if (isTermux) {
    // Termux packages are typically in /data/data/com.termux/files/usr/bin
    status.termuxPath = '/data/data/com.termux/files/usr/bin'

    // Check if PATH includes Termux bin
    const path = process.env.PATH || ''
    status.packages.nodejs = path.includes('termux') && (Bun.which?.('node') || false)
    status.packages.bun = !!Bun.which?.('bun')
    status.packages.git = !!Bun.which?.('git')

    // Detect shell profile
    const home = process.env.HOME || '/data/data/com.termux/files/home'
    const shell = process.env.SHELL || ''
    if (shell.includes('bash')) {
      status.shellProfile = join(home, '.bashrc')
    } else if (shell.includes('zsh')) {
      status.shellProfile = join(home, '.zshrc')
    } else if (shell.includes('fish')) {
      status.shellProfile = join(home, '.config/fish/config.fish')
    } else {
      status.shellProfile = join(home, '.profile')
    }
  }

  return status
}

// ─── Run pkg command ───────────────────────────────────────────────────
async function runPkg(args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const subprocess = Bun.spawn({
    program: 'pkg',
    args,
    cwd: Bun.cwd(),
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let stdout = ''
  let stderr = ''

  if (subprocess.stdout) {
    const reader = subprocess.stdout.getReader()
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

  if (subprocess.stderr) {
    const reader = subprocess.stderr.getReader()
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

  const exitCode = await subprocess.exited
  return { success: exitCode === 0, stdout: stdout.trim(), stderr: stderr.trim() }
}

// ─── Install Package ───────────────────────────────────────────────────
export async function installPackage(packageName: string): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Error: Not running in Termux. Package installation only available in Termux.'
  }

  const result = await runPkg(['install', '-y', packageName])

  if (result.success) {
    return `✓ Installed ${packageName}\n${result.stdout}`
  } else {
    return `✗ Failed to install ${packageName}\n${result.stderr}`
  }
}

// ─── Configure Shell Profile ───────────────────────────────────────────
export async function configureShellProfile(): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux || !status.shellProfile) {
    return 'Error: Cannot configure shell profile (not in Termux or profile not detected)'
  }

  try {
    const profilePath = status.shellProfile
    const lines: string[] = []

    // Read existing profile if it exists
    try {
      const existing = await Bun.file(profilePath).text()
      lines.push(...existing.split('\n'))
    } catch {
      // File doesn't exist, will create new
    }

    // Add Termux-specific configurations if not already present
    const configLines = [
      '# Added by ai-cli termSetup',
      'export PATH="$PATH:$HOME/.local/bin"',
      'alias ll="ls -la"',
      'alias la="ls -A"',
      'alias l="ls -CF"',
    ]

    const existingContent = lines.join('\n')
    const newContent = [...lines, ...configLines].join('\n')

    // Only write if there are changes
    if (existingContent !== newContent) {
      await Bun.file(profilePath).write(newContent)
    }

    return `✓ Shell profile configured: ${profilePath}\nAdded aliases and PATH configuration.`
  } catch (error: any) {
    return `✗ Failed to configure shell profile: ${error.message}`
  }
}

// ─── Get Setup Instructions ────────────────────────────────────────────
export function getSetupInstructions(status: TermuxStatus): string {
  if (!status.isTermux) {
    return 'Not running in Termux. No setup required.'
  }

  const missing = Object.entries(status.packages)
    .filter(([_, installed]) => !installed)
    .map(([name]) => name)

  if (missing.length === 0) {
    return 'All required packages (nodejs, bun, git) are installed. Run /termSetup --configure to set up shell profile.'
  }

  return `Missing packages: ${missing.join(', ')}. Run /termSetup --install to install them.`
}
