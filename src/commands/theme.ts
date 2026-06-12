// ─── Theme Management Commands ────────────────────────────────────────

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'
import type { Command, CommandContext } from '../types.js'
import {
  listThemes,
  setTheme,
  getTheme,
  getCurrentThemeName,
  getThemePreview,
  createCustomTheme,
  deleteCustomTheme,
  exportTheme,
  importTheme,
  initializeThemeManager,
} from '../theme/index.js'

// ─── Theme Commands ────────────────────────────────────────────────────
export const themeCommands: Command[] = [
  // /themes - List available themes
  {
    name: 'themes',
    description: 'List available themes',
    aliases: ['theme-list', 'list-themes'],
    run: async () => {
      const themes = listThemes()
      const current = getCurrentThemeName()

      const lines: string[] = ['Available themes:']
      for (const theme of themes) {
        const marker = theme.name === current ? '→' : ' '
        const type = theme.type === 'builtin' ? 'built-in' : 'custom'
        lines.push(`  ${marker} ${theme.name} (${type})`)
      }

      lines.push('')
      lines.push(`Current theme: ${current}`)
      lines.push('')
      lines.push('Commands:')
      lines.push('  /theme <name>              - Switch to theme')
      lines.push('  /theme preview <name>      - Preview theme colors')
      lines.push('  /theme create <name>       - Create custom theme')
      lines.push('  /theme edit <name>         - Edit theme file')
      lines.push('  /theme export <name> <path> - Export theme to file')
      lines.push('  /theme import <path> [name] - Import theme from file')
      lines.push('  /theme delete <name>       - Delete custom theme')

      return [{ type: 'text', text: lines.join('\n') }]
    },
  },

  // /theme - Switch theme or show theme info
  {
    name: 'theme',
    description: 'Theme management',
    aliases: [],
    args: ['<name>', 'preview <name>', 'create <name>', 'edit <name>', 'export <name> <path>', 'import <path> [name]', 'delete <name>'],
    run: async (args, context) => {
      const parts = args.trim().split(/\s+/)
      const subcmd = parts[0]
      const subArgs = parts.slice(1)

      switch (subcmd) {
        case 'preview': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /theme preview <name>' }]
          }

          const themeName = subArgs[0]
          const theme = getTheme(themeName)

          if (!theme) {
            return [{ type: 'text', text: `Theme "${themeName}" not found. Use /themes to list available themes.` }]
          }

          const preview = getThemePreview(theme)
          return [{ type: 'text', text: preview }]
        }

        case 'create': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /theme create <name>\n\nThis will create a custom theme based on the current theme. You can then edit the colors in the theme file.' }]
          }

          const themeName = subArgs[0]

          // Check if already exists
          if (getTheme(themeName)) {
            return [{ type: 'text', text: `Theme "${themeName}" already exists. Use /theme edit ${themeName} to modify it.` }]
          }

          // Create based on current theme
          const currentTheme = getCurrentTheme()
          const result = await createCustomTheme(themeName, {}, true)

          if (result.success) {
            return [{
              type: 'text',
              text: `Custom theme "${themeName}" created.\n\nUse /theme edit ${themeName} to customize colors.\nUse /theme ${themeName} to switch to it.`,
            }]
          } else {
            return [{ type: 'text', text: `Failed to create theme: ${result.error}` }]
          }
        }

        case 'edit': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /theme edit <name>\n\nOpens the theme file in your $EDITOR.' }]
          }

          const themeName = subArgs[0]
          const theme = getTheme(themeName)

          if (!theme) {
            return [{ type: 'text', text: `Theme "${themeName}" not found.` }]
          }

          // Get file path
          const isCustom = !builtinThemes[themeName]
          if (!isCustom) {
            return [{ type: 'text', text: `Cannot edit built-in theme "${themeName}". Create a custom theme with /theme create <name> instead.` }]
          }

          const filePath = join(themesDir, `${themeName}.json`)

          // Open in editor
          const editor = process.env.EDITOR || process.env.VISUAL || 'vim'
          const { exec } = await import('node:child_process')
          exec(`${editor} "${filePath}"`, (error) => {
            if (error) {
              console.error('Failed to open editor:', error)
            }
          })

          return [{ type: 'text', text: `Opening theme "${themeName}" in ${editor}...` }]
        }

        case 'export': {
          if (subArgs.length < 2) {
            return [{ type: 'text', text: 'Usage: /theme export <name> <path>\n\nExample: /theme export mytheme ~/mytheme.json' }]
          }

          const themeName = subArgs[0]
          const outputPath = subArgs[1]

          const success = await exportTheme(themeName, outputPath)

          if (success) {
            return [{ type: 'text', text: `Theme "${themeName}" exported to ${outputPath}` }]
          } else {
            return [{ type: 'text', text: `Failed to export theme "${themeName}". Make sure it exists.` }]
          }
        }

        case 'import': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /theme import <path> [name]\n\nExample: /theme import ~/downloaded-theme.json' }]
          }

          const filePath = subArgs[0]
          const newName = subArgs[1]

          const result = await importTheme(filePath, newName)

          if (result.success) {
            return [{
              type: 'text',
              text: `Theme imported as "${result.name}".\nUse /theme ${result.name} to switch to it.`,
            }]
          } else {
            return [{ type: 'text', text: `Failed to import theme: ${result.error}` }]
          }
        }

        case 'delete': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /theme delete <name>\n\nOnly custom themes can be deleted.' }]
          }

          const themeName = subArgs[0]

          if (builtinThemes[themeName]) {
            return [{ type: 'text', text: `Cannot delete built-in theme "${themeName}".` }]
          }

          const success = await deleteCustomTheme(themeName)

          if (success) {
            return [{ type: 'text', text: `Custom theme "${themeName}" deleted.` }]
          } else {
            return [{ type: 'text', text: `Failed to delete theme "${themeName}". It may not exist or is a built-in theme.` }]
          }
        }

        default: {
          // Switch to theme
          const themeName = subcmd

          if (!themeName) {
            return [{ type: 'text', text: 'Usage: /theme <name>\nUse /themes to list available themes.' }]
          }

          const success = await setTheme(themeName)

          if (success) {
            const theme = getTheme(themeName)!
            return [{
              type: 'text',
              text: `Switched to theme: ${themeName}\n\nPrimary color: ${theme.colors.primary}\nBackground: ${theme.colors.background}`,
            }]
          } else {
            return [{ type: 'text', text: `Theme "${themeName}" not found. Use /themes to list available themes.` }]
          }
        }
      }
    },
  },
]

// ─── Initialize Theme System ───────────────────────────────────────────
export async function initializeThemeCommands(): Promise<void> {
  await initializeThemeManager()
  console.log('[ThemeCommands] Theme commands initialized')
}
