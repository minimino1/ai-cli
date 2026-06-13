// ─── Termux Setup ───────────────────────────────────────────────────────
// Auto-setup for Termux: dependencies, PATH, shell integration, storage

import { spawn } from 'bun'
import { join } from 'node:path'
import * as detectModule from './detect'

const { detectTermux, checkDependencies } = detectModule

export interface SetupResult {
  success: boolean
  message: string
  details?: string
}

// ─── Run pkg Command ───────────────────────────────────────────────────
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

// ─── Check Dependencies ───────────────────────────────────────────────
export function checkDependenciesStatus(): { missing: string[]; installed: string[] } {
  return checkDependencies()
}

// ─── Install Missing Dependencies ─────────────────────────────────────
export async function installDeps(): Promise<string> {
  const { missing, installed } = checkDependenciesStatus()

  if (missing.length === 0) {
    return `✓ All required dependencies are installed:\n  ${installed.join(', ')}`
  }

  const output: string[] = []
  output.push(`Installing missing dependencies: ${missing.join(', ')}`)
  output.push('')

  for (const pkg of missing) {
    output.push(`Installing ${pkg}...`)
    const result = await runPkg(['install', '-y', pkg])

    if (result.success) {
      output.push(`  ✓ ${pkg} installed`)
    } else {
      output.push(`  ✗ Failed to install ${pkg}: ${result.stderr}`)
    }
  }

  output.push('')
  output.push('Installation complete!')
  return output.join('\n')
}

// ─── Setup PATH ───────────────────────────────────────────────────────
export async function setupPath(): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux. PATH setup only applies to Termux.'
  }

  const home = status.homeDir
  const localBin = join(home, '.local', 'bin')
  const shellProfile = status.shellProfile

  if (!shellProfile) {
    return 'Error: Could not detect shell profile'
  }

  try {
    let profileContent = ''
    try {
      profileContent = await Bun.file(shellProfile).text()
    } catch {
      // File doesn't exist, will create
    }

    const pathExport = `export PATH="$PATH:${localBin}"`
    const localBinExport = `export PATH="$HOME/.local/bin:$PATH"`

    // Check if already present
    if (profileContent.includes(localBin) || profileContent.includes('$HOME/.local/bin')) {
      return `PATH already configured in ${shellProfile}`
    }

    // Add to profile
    const newContent = profileContent + '\n# Added by ai-cli setup\nexport PATH="$HOME/.local/bin:$PATH"\n'
    await Bun.file(shellProfile).write(newContent)

    return `✓ Added PATH configuration to ${shellProfile}\n\nAdded: ${pathExport}\n\nRestart your shell or run: source ${shellProfile}`
  } catch (error: any) {
    return `✗ Failed to configure PATH: ${error.message}`
  }
}

// ─── Setup Shell Integration ──────────────────────────────────────────
export async function setupShellIntegration(): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux. Shell integration only applies to Termux.'
  }

  const shellProfile = status.shellProfile
  if (!shellProfile) {
    return 'Error: Could not detect shell profile'
  }

  try {
    let profileContent = ''
    try {
      profileContent = await Bun.file(shellProfile).text()
    } catch {
      // File doesn't exist, will create
    }

    const integrationLines = [
      '',
      '# ─── ai-cli Shell Integration ─────────────────────────────────────',
      '# Auto-completion for / commands',
      'eval "$(ai-cli --completion)" 2>/dev/null || true',
      '',
      '# Useful aliases',
      'alias ai="ai-cli"',
      'alias ll="ls -la"',
      'alias la="ls -A"',
      'alias l="ls -CF"',
      '',
      '# Export PATH for local binaries',
      'export PATH="$HOME/.local/bin:$PATH"',
      '',
    ]

    const newContent = profileContent + integrationLines.join('\n')
    await Bun.file(shellProfile).write(newContent)

    return `✓ Shell integration added to ${shellProfile}\n\nIncluded:\n  - ai-cli auto-completion\n  - Useful aliases (ai, ll, la, l)\n  - PATH configuration\n\nRestart your shell or run: source ${shellProfile}`
  } catch (error: any) {
    return `✗ Failed to setup shell integration: ${error.message}`
  }
}

// ─── Setup Aliases ────────────────────────────────────────────────────
export async function setupAliases(): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux. Aliases only apply to Termux.'
  }

  const shellProfile = status.shellProfile
  if (!shellProfile) {
    return 'Error: Could not detect shell profile'
  }

  try {
    let profileContent = ''
    try {
      profileContent = await Bun.file(shellProfile).text()
    } catch {
      // File doesn't exist, will create
    }

    const aliasLines = [
      '',
      '# ─── ai-cli Aliases ───────────────────────────────────────────────',
      'alias gs="git status"',
      'alias gc="git commit"',
      'alias gp="git push"',
      'alias gl="git log --oneline"',
      'alias gd="git diff"',
      'alias gdc="git diff --cached"',
      'alias gb="git branch"',
      'alias gco="git checkout"',
      'alias gcm="git checkout main"',
      'alias gcb="git checkout -b"',
      'alias gpl="git pull"',
      'alias gma="git merge --abort"',
      'alias grh="git reset --hard"',
      'alias gcl="git clean -fd"',
      '',
      '# Termux shortcuts',
      'alias termux-setup="termSetup"',
      'alias pkg-install="pkg install"',
      'alias pkg-search="pkg search"',
      'alias pkg-update="pkg update && pkg upgrade"',
      '',
    ]

    // Check if aliases already exist
    const hasAliases = aliasLines.some(line => profileContent.includes(line.trim()))
    if (hasAliases) {
      return `Aliases already exist in ${shellProfile}`
    }

    const newContent = profileContent + aliasLines.join('\n')
    await Bun.file(shellProfile).write(newContent)

    return `✓ Aliases added to ${shellProfile}\n\nGit aliases: gs, gc, gp, gl, gd, gdc, gb, gco, gcm, gcb, gpl, gma, grh, gcl\nTermux aliases: termux-setup, pkg-install, pkg-search, pkg-update\n\nRestart your shell or run: source ${shellProfile}`
  } catch (error: any) {
    return `✗ Failed to setup aliases: ${error.message}`
  }
}

// ─── Setup Storage Access ─────────────────────────────────────────────
export async function setupStorage(): Promise<string> {
  const status = detectTermux()
  if (!status.isTermux) {
    return 'Not running in Termux. Storage setup only applies to Termux.'
  }

  // Check if termux-api is installed
  if (!status.packages.termuxApi) {
    return 'Error: termux-api not installed. Run: pkg install termux-api'
  }

  try {
    const result = await Bun.spawn({
      program: 'termux-setup-storage',
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

    // Wait for user to grant permission (this will show a dialog)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if storage is now accessible
    const sdcardExists = Bun.file('/sdcard').existsSync() || Bun.file('/storage/emulated/0').existsSync()

    if (sdcardExists) {
      return `✓ Storage access granted!\n\nStorage is now available at:\n  /sdcard\n  /storage/emulated/0\n\nYou can access your files from these directories.`
    } else {
      return `⚠ Storage setup initiated but not confirmed.\n\nPlease ensure you granted the storage permission in the dialog.\n\nIf denied, run 'termux-setup-storage' again and allow access.`
    }
  } catch (error: any) {
    return `✗ Failed to setup storage: ${error.message}\n\nTry running manually: termux-setup-storage`
  }
}

// ─── Full Setup Wizard ────────────────────────────────────────────────
export async function setupWizard(): Promise<string> {
  const status = detectTermux()
  const output: string[] = []

  output.push('╔════════════════════════════════════════════════════════════╗')
  output.push('║         ai-cli Termux Setup Wizard                         ║')
  output.push('╚════════════════════════════════════════════════════════════╝')
  output.push('')

  if (!status.isTermux) {
    output.push('❌ This command is only available in Termux environment.')
    return output.join('\n')
  }

  output.push(`Termux Version: ${status.termuxVersion || 'unknown'}`)
  output.push(`Home Directory: ${status.homeDir}`)
  output.push(`Shell Profile:  ${status.shellProfile || 'not detected'}`)
  output.push('')

  // Step 1: Check dependencies
  output.push('─'.repeat(60))
  output.push('Step 1: Checking dependencies...')
  const { missing, installed } = checkDependenciesStatus()
  output.push(`  Installed: ${installed.join(', ') || 'none'}`)
  output.push(`  Missing:   ${missing.join(', ') || 'none'}`)

  if (missing.length > 0) {
    output.push('')
    output.push('Installing missing packages...')
    for (const pkg of missing) {
      output.push(`  Installing ${pkg}...`)
      const result = await runPkg(['install', '-y', pkg])
      if (result.success) {
        output.push(`    ✓ ${pkg} installed`)
      } else {
        output.push(`    ✗ Failed: ${result.stderr}`)
      }
    }
  } else {
    output.push('  ✓ All required packages installed')
  }

  // Step 2: Configure shell
  output.push('')
  output.push('─'.repeat(60))
  output.push('Step 2: Configuring shell profile...')
  const pathResult = await setupPath()
  output.push(`  ${pathResult}`)

  // Step 3: Shell integration
  output.push('')
  output.push('Step 3: Adding shell integration...')
  const integrationResult = await setupShellIntegration()
  output.push(`  ${integrationResult}`)

  // Step 4: Storage (optional)
  output.push('')
  output.push('─'.repeat(60))
  output.push('Step 4: Storage access (optional)')
  output.push('  To grant storage access, run: /termux storage')
  output.push('  Or manually: termux-setup-storage')

  output.push('')
  output.push('═'.repeat(60))
  output.push('Setup complete!')
  output.push('')
  output.push('Next steps:')
  output.push('  1. Restart your shell or run: source ~/.bashrc')
  output.push('  2. Try ai-cli commands: /help')
  output.push('  3. Grant storage access if needed: /termux storage')
  output.push('')

  return output.join('\n')
}
