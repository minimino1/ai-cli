// ─── Termux Detection ───────────────────────────────────────────────────
// Detect Termux environment and system information

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
    python: boolean
    clang: boolean
    make: boolean
    curl: boolean
    wget: boolean
    termuxApi: boolean
  }
  shellProfile?: string
  storageAvailable: boolean
  homeDir: string
  dataDir: string
}

// ─── Detect Termux ─────────────────────────────────────────────────────
export function detectTermux(): TermuxStatus {
  const termuxVersion = process.env.TERMUX_VERSION
  const isTermux = !!termuxVersion

  const homeDir = process.env.HOME || (isTermux ? '/data/data/com.termux/files/home' : process.env.HOME || '/')
  const dataDir = isTermux ? '/data/data/com.termux/files/home' : homeDir

  const status: TermuxStatus = {
    isTermux,
    termuxVersion: termuxVersion || undefined,
    packages: {
      nodejs: false,
      bun: false,
      git: false,
      python: false,
      clang: false,
      make: false,
      curl: false,
      wget: false,
      termuxApi: false,
    },
    storageAvailable: false,
    homeDir,
    dataDir,
  }

  if (isTermux) {
    status.termuxPath = '/data/data/com.termux/files/usr/bin'

    // Check packages using which
    const checkPkg = (name: string): boolean => {
      const binName = name === 'termux-api' ? 'termux-setup-storage' : name
      return !!Bun.which?.(binName) || !!process.env.PATH?.includes('termux') && Bun.which?.(name)
    }

    status.packages.nodejs = checkPkg('node') || checkPkg('nodejs')
    status.packages.bun = checkPkg('bun')
    status.packages.git = checkPkg('git')
    status.packages.python = checkPkg('python') || checkPkg('python3')
    status.packages.clang = checkPkg('clang') || checkPkg('clang++')
    status.packages.make = checkPkg('make')
    status.packages.curl = checkPkg('curl')
    status.packages.wget = checkPkg('wget')
    status.packages.termuxApi = checkPkg('termux-setup-storage')

    // Detect shell profile
    const shell = process.env.SHELL || ''
    if (shell.includes('bash')) {
      status.shellProfile = join(homeDir, '.bashrc')
    } else if (shell.includes('zsh')) {
      status.shellProfile = join(homeDir, '.zshrc')
    } else if (shell.includes('fish')) {
      status.shellProfile = join(homeDir, '.config/fish/config.fish')
    } else {
      status.shellProfile = join(homeDir, '.profile')
    }

    // Check storage access
    status.storageAvailable = Bun.file('/sdcard').existsSync() || Bun.file('/storage/emulated/0').existsSync()
  }

  return status
}

// ─── Termux Version ───────────────────────────────────────────────────
export function termuxVersion(): string {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux'
  }
  return status.termuxVersion || 'Unknown'
}

// ─── Check Termux API ─────────────────────────────────────────────────
export function termuxAPIAvailable(): boolean {
  const status = detectTermux()
  return status.isTermux && status.packages.termuxApi
}

// ─── Get Termux Directory ─────────────────────────────────────────────
export function getTermuxDir(): string {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux'
  }
  return status.termuxPath || status.dataDir
}

// ─── List Installed Packages ──────────────────────────────────────────
export async function termuxPackages(): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux'
  }

  // Try to list installed packages using pkg
  try {
    const result = await Bun.spawn({
      program: 'pkg',
      args: ['list-installed'],
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

    if (stdout) {
      const lines = stdout.split('\n').filter(l => l.trim())
      return lines.join('\n')
    }
  } catch {
    // pkg might not be available
  }

  // Fallback: show our detection
  const pkgStatus = Object.entries(status.packages)
    .map(([pkg, installed]) => `  ${installed ? '✓' : '✗'} ${pkg}`)
    .join('\n')

  return `Detected packages:\n${pkgStatus}\n\nNote: Full package list requires 'pkg' package manager.`
}

// ─── Read Termux Properties ───────────────────────────────────────────
export async function termuxProperties(): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux'
  }

  const props: Record<string, string> = {
    'TERMUX_VERSION': status.termuxVersion || 'unknown',
    'HOME': status.homeDir,
    'PREFIX': '/data/data/com.termux/files/usr',
    'TMPDIR': '/data/data/com.termux/files/usr/tmp',
    'SHELL': process.env.SHELL || 'unknown',
    'PATH': process.env.PATH || 'unknown',
  }

  // Try to read termux.properties if it exists
  try {
    const propFile = '/data/data/com.termux/files/usr/etc/termux.properties'
    if (Bun.file(propFile).existsSync()) {
      const content = await Bun.file(propFile).text()
      props['termux.properties'] = content
    }
  } catch {
    // File doesn't exist or can't read
  }

  const output: string[] = []
  output.push(`${'─'.repeat(60)}`)
  output.push(`${'Termux Properties'.padEnd(30)}`)
  output.push(`${'─'.repeat(60)}`)

  for (const [key, value] of Object.entries(props)) {
    if (value.includes('\n')) {
      output.push(`${key.padEnd(20)}:\n${value}`)
    } else {
      output.push(`${key.padEnd(20)}: ${value}`)
    }
  }

  return output.join('\n')
}

// ─── Check Dependencies ───────────────────────────────────────────────
export function checkDependencies(): { missing: string[]; installed: string[] } {
  const status = detectTermux()
  const missing: string[] = []
  const installed: string[] = []

  if (!status.isTermux) {
    return { missing: ['Not in Termux'], installed: [] }
  }

  const required = ['git', 'bun']
  const recommended = ['nodejs', 'python', 'curl', 'wget']

  for (const pkg of required) {
    if (status.packages[pkg as keyof typeof status.packages]) {
      installed.push(pkg)
    } else {
      missing.push(pkg)
    }
  }

  for (const pkg of recommended) {
    if (status.packages[pkg as keyof typeof status.packages]) {
      installed.push(pkg)
    }
  }

  return { missing, installed }
}
