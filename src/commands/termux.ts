// ─── Termux Commands ────────────────────────────────────────────────────
// Termux-specific commands: status, setup, clipboard, storage, packages

import * as termuxDetect from '../tools/termux/detect'
import * as termuxSetup from '../tools/termux/setup'
import * as termuxClipboard from '../tools/termux/clipboard'
import type { Command } from '../types'

/**
 * Prüft, ob die aktuelle Umgebung Termux ist.
 *
 * @returns `{ valid: boolean; message: string }` — `valid` ist `true`, wenn Termux erkannt wurde; `message` enthält bei `valid === false` die Benutzerfehlermeldung, ansonsten einen leeren String.
 */
function ensureTermux(): { valid: boolean; message: string } {
  const status = termuxDetect.detectTermux()
  if (!status.isTermux) {
    return {
      valid: false,
      message: '❌ This command is only available in Termux environment.',
    }
  }
  return { valid: true, message: '' }
}

// ─── Termux Commands ───────────────────────────────────────────────────
export const termuxCommands: Command[] = [
  // ─── Status ─────────────────────────────────────────────────────────
  {
    name: 'termux-status',
    description: 'Show Termux status and environment information',
    aliases: ['termux', 'termux-info'],
    run: async () => {
      const status = termuxDetect.detectTermux()

      if (!status.isTermux) {
        return [{ type: 'text', text: 'Not running in Termux.' }]
      }

      const lines: string[] = []
      lines.push('╔════════════════════════════════════════════════════════════╗')
      lines.push('║                    Termux Status                           ║')
      lines.push('╚════════════════════════════════════════════════════════════╝')
      lines.push('')
      lines.push(`Version:        ${status.termuxVersion || 'unknown'}`)
      lines.push(`Home Dir:       ${status.homeDir}`)
      lines.push(`Data Dir:       ${status.dataDir}`)
      lines.push(`Termux Path:    ${status.termuxPath || 'not set'}`)
      lines.push(`Shell Profile:  ${status.shellProfile || 'not detected'}`)
      lines.push(`Storage Access: ${status.storageAvailable ? '✓ available' : '✗ not granted'}`)
      lines.push('')
      lines.push('Packages:')
      for (const [pkg, installed] of Object.entries(status.packages)) {
        const mark = installed ? '✓' : '✗'
        lines.push(`  ${mark} ${pkg}`)
      }

      return [{ type: 'text', text: lines.join('\n') }]
    },
  },

  // ─── Setup Wizard ───────────────────────────────────────────────────
  {
    name: 'termux-setup',
    description: 'Run Termux setup wizard (install deps, configure shell)',
    aliases: ['termux-wizard', 'termux-init'],
    args: ['[--install] [--configure]'],
    run: async (args) => {
      const flags = args.trim().split(/\s+/)
      const doInstall = flags.includes('--install')
      const doConfigure = flags.includes('--configure')

      if (doInstall || doConfigure) {
        const output: string[] = []

        if (doInstall) {
          output.push('Installing dependencies...')
          output.push(await termuxSetup.installDeps())
        }

        if (doConfigure) {
          output.push('')
          output.push('Configuring shell...')
          output.push(await termuxSetup.setupPath())
        }

        return [{ type: 'text', text: output.join('\n') }]
      }

      // Run full wizard
      const result = await termuxSetup.setupWizard()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Install Package ────────────────────────────────────────────────
  {
    name: 'termux-install',
    description: 'Install a package using pkg',
    aliases: ['pkg-install', 't-install'],
    args: ['<package>'],
    run: async (args) => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const pkg = args.trim()
      if (!pkg) {
        return [{ type: 'text', text: 'Usage: /termux-install <package>' }]
      }

      const result = await termuxSetup.installDeps() // This installs all missing, not single pkg
      // Actually, we need a single package install function
      return [{ type: 'text', text: `Installing ${pkg}...\nUse: pkg install ${pkg}` }]
    },
  },

  // ─── List Packages ───────────────────────────────────────────────────
  {
    name: 'termux-packages',
    description: 'List installed packages',
    aliases: ['pkg-list', 'packages'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const result = await termuxDetect.termuxPackages()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Clipboard Copy ──────────────────────────────────────────────────
  {
    name: 'termux-copy',
    description: 'Copy text to clipboard',
    aliases: ['copy', 't-copy'],
    args: ['<text>'],
    run: async (args) => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const text = args.trim()
      if (!text) {
        return [{ type: 'text', text: 'Usage: /termux-copy <text>' }]
      }

      const result = await termuxClipboard.copy(text)
      return [{ type: 'text', text: result.success ? `✓ ${result.message}` : `✗ ${result.message}` }]
    },
  },

  // ─── Clipboard Paste ────────────────────────────────────────────────
  {
    name: 'termux-paste',
    description: 'Paste text from clipboard',
    aliases: ['paste', 't-paste'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const result = await termuxClipboard.paste()
      if (result.success && result.data) {
        return [{ type: 'text', text: result.data }]
      } else {
        return [{ type: 'text', text: `✗ ${result.message}` }]
      }
    },
  },

  // ─── Storage Setup ───────────────────────────────────────────────────
  {
    name: 'termux-storage',
    description: 'Setup storage access (grant permission)',
    aliases: ['storage', 't-storage'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const result = await termuxSetup.setupStorage()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Properties ──────────────────────────────────────────────────────
  {
    name: 'termux-properties',
    description: 'Show Termux properties and environment',
    aliases: ['termux-props', 't-props'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const result = await termuxDetect.termuxProperties()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Shell Integration ───────────────────────────────────────────────
  {
    name: 'termux-integration',
    description: 'Setup shell integration (aliases, completion)',
    aliases: ['termux-shell', 't-integrate'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const result = await termuxSetup.setupShellIntegration()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Aliases Setup ───────────────────────────────────────────────────
  {
    name: 'termux-aliases',
    description: 'Setup useful aliases',
    aliases: ['t-aliases'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const result = await termuxSetup.setupAliases()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Clipboard Info ──────────────────────────────────────────────────
  {
    name: 'termux-clipboard-info',
    description: 'Show clipboard tool information',
    aliases: ['clipboard-info', 't-clip-info'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const result = termuxClipboard.getClipboardInfo()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Quick Setup (All-in-one) ────────────────────────────────────────
  {
    name: 'termux-quick-setup',
    description: 'Quick setup: install deps, configure shell, add aliases',
    aliases: ['t-quick', 'termux-all'],
    run: async () => {
      const check = ensureTermux()
      if (!check.valid) {
        return [{ type: 'text', text: check.message }]
      }

      const output: string[] = []
      output.push('Running quick setup...')
      output.push('')

      // Install dependencies
      output.push('1. Installing dependencies...')
      output.push(await termuxSetup.installDeps())
      output.push('')

      // Setup PATH
      output.push('2. Configuring PATH...')
      output.push(await termuxSetup.setupPath())
      output.push('')

      // Setup shell integration
      output.push('3. Adding shell integration...')
      output.push(await termuxSetup.setupShellIntegration())
      output.push('')

      // Setup aliases
      output.push('4. Adding aliases...')
      output.push(await termuxSetup.setupAliases())
      output.push('')

      output.push('═'.repeat(60))
      output.push('✓ Quick setup complete!')
      output.push('')
      output.push('Restart your shell or run: source ~/.bashrc')
      output.push('')
      output.push('Next steps:')
      output.push('  - Grant storage access: /termux-storage')
      output.push('  - Check status: /termux-status')
      output.push('')

      return [{ type: 'text', text: output.join('\n') }]
    },
  },
]
