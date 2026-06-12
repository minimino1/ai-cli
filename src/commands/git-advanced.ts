// ─── Git Advanced Commands ─────────────────────────────────────────────
// Advanced git operations: stash, bisect, worktree, blame, log, analyze

import * as gitInteractive from '../tools/git/interactive'
import * as gitLog from '../tools/git/log'
import * as gitBlame from '../tools/git/blame'
import * as gitAnalyze from '../tools/git/analyze'
import type { Command, CommandContext } from '../types'

// ─── Helper: Parse Stash Index ────────────────────────────────────────
function parseStashIndex(arg: string): number {
  // Extract number from stash@{N} or just N
  const match = arg.match(/\d+/)
  return match ? parseInt(match[0]) : 0
}

// ─── Helper: Parse Bisect Args ────────────────────────────────────────
function parseBisectArgs(args: string): { good?: string; bad?: string } {
  const parts = args.trim().split(/\s+/)
  const result: { good?: string; bad?: string } = {}

  if (parts.length >= 2) {
    // Assume: start <good> <bad>
    result.good = parts[0]
    result.bad = parts[1]
  } else if (parts.length === 1) {
    // Could be just "good" or "bad" command without args
    if (parts[0] === 'good' || parts[0] === 'bad') {
      result[parts[0]] = 'HEAD'
    }
  }

  return result
}

// ─── Git Advanced Commands ────────────────────────────────────────────
export const gitAdvancedCommands: Command[] = [
  // ─── Stash Commands ────────────────────────────────────────────────
  {
    name: 'git-stash',
    description: 'Create a stash with optional message',
    aliases: ['stash'],
    args: ['[message]'],
    run: async (args) => {
      const message = args.trim() || undefined
      const result = await gitInteractive.stashCreate(message)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-stash-list',
    description: 'List all stashes',
    aliases: ['stash-list', 'stashes'],
    run: async () => {
      const result = await gitInteractive.stashList()
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-stash-pop',
    description: 'Pop a stash (apply and remove)',
    aliases: ['stash-pop'],
    args: ['[index]'],
    run: async (args) => {
      const index = args.trim() ? parseStashIndex(args.trim()) : 0
      const result = await gitInteractive.stashPop(index)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-stash-drop',
    description: 'Drop a stash',
    aliases: ['stash-drop'],
    args: ['[index]'],
    run: async (args) => {
      const index = args.trim() ? parseStashIndex(args.trim()) : 0
      const result = await gitInteractive.stashDrop(index)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-stash-apply',
    description: 'Apply a stash without removing it',
    aliases: ['stash-apply'],
    args: ['[index]'],
    run: async (args) => {
      const index = args.trim() ? parseStashIndex(args.trim()) : 0
      const result = await gitInteractive.stashApply(index)
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Bisect Commands ────────────────────────────────────────────────
  {
    name: 'git-bisect-start',
    description: 'Start a bisect session',
    aliases: ['bisect-start'],
    args: ['[good] [bad]'],
    run: async (args) => {
      const { good, bad } = parseBisectArgs(args)
      const result = await gitInteractive.bisectStart(good || 'HEAD', bad)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-bisect-good',
    description: 'Mark current commit as good',
    aliases: ['bisect-good'],
    run: async () => {
      const result = await gitInteractive.bisectGood()
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-bisect-bad',
    description: 'Mark current commit as bad',
    aliases: ['bisect-bad'],
    run: async () => {
      const result = await gitInteractive.bisectBad()
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-bisect-reset',
    description: 'Reset bisect session',
    aliases: ['bisect-reset'],
    run: async () => {
      const result = await gitInteractive.bisectReset()
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Worktree Commands ──────────────────────────────────────────────
  {
    name: 'git-worktree-add',
    description: 'Add a new worktree',
    aliases: ['worktree-add'],
    args: ['<path> [branch]'],
    run: async (args) => {
      const parts = args.trim().split(/\s+/)
      if (parts.length === 0) {
        return [{ type: 'text', text: 'Usage: /git-worktree-add <path> [branch]' }]
      }
      const path = parts[0]
      const branch = parts[1]
      const result = await gitInteractive.worktreeAdd(path, branch)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-worktree-list',
    description: 'List all worktrees',
    aliases: ['worktree-list', 'worktrees'],
    run: async () => {
      const result = await gitInteractive.worktreeList()
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-worktree-remove',
    description: 'Remove a worktree',
    aliases: ['worktree-remove'],
    args: ['<path>'],
    run: async (args) => {
      const path = args.trim()
      if (!path) {
        return [{ type: 'text', text: 'Usage: /git-worktree-remove <path>' }]
      }
      const result = await gitInteractive.worktreeRemove(path)
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Interactive Rebase ─────────────────────────────────────────────
  {
    name: 'git-rebase-i',
    description: 'Start interactive rebase',
    aliases: ['rebase-i', 'git-rebase-interactive'],
    args: ['<commit>'],
    run: async (args) => {
      const commit = args.trim() || 'HEAD~10' // Default to last 10 commits
      const result = await gitInteractive.interactiveRebase(commit)
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Blame Commands ─────────────────────────────────────────────────
  {
    name: 'git-blame',
    description: 'Show line-by-line blame for a file',
    aliases: ['blame'],
    args: ['<file>'],
    run: async (args) => {
      const filePath = args.trim()
      if (!filePath) {
        return [{ type: 'text', text: 'Usage: /git-blame <file>' }]
      }
      const result = await gitBlame.blame(filePath)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-blame-summary',
    description: 'Show blame summary by author',
    aliases: ['blame-summary'],
    args: ['<file>'],
    run: async (args) => {
      const filePath = args.trim()
      if (!filePath) {
        return [{ type: 'text', text: 'Usage: /git-blame-summary <file>' }]
      }
      const result = await gitBlame.blameSummary(filePath)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-blame-range',
    description: 'Show blame for a date range',
    aliases: ['blame-range'],
    args: ['<file> <since> [until]'],
    run: async (args) => {
      const parts = args.trim().split(/\s+/)
      if (parts.length < 2) {
        return [{ type: 'text', text: 'Usage: /git-blame-range <file> <since> [until]' }]
      }
      const filePath = parts[0]
      const since = parts[1]
      const until = parts[2]
      const result = await gitBlame.blameDateRange(filePath, since, until)
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Advanced Log Commands ──────────────────────────────────────────
  {
    name: 'git-log-graph',
    description: 'Show git log with ASCII graph',
    aliases: ['git-log-graph', 'log-graph'],
    args: ['[--limit N] [--since date] [--author name] [--grep pattern]'],
    run: async (args) => {
      const options: gitLog.LogOptions = { graph: true }

      // Simple arg parsing
      const parts = args.trim().split(/\s+/)
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '--limit' && i + 1 < parts.length) {
          options.limit = parseInt(parts[i + 1])
          i++
        } else if (parts[i] === '--since' && i + 1 < parts.length) {
          options.since = parts[i + 1]
          i++
        } else if (parts[i] === '--author' && i + 1 < parts.length) {
          options.author = parts[i + 1]
          i++
        } else if (parts[i] === '--grep' && i + 1 < parts.length) {
          options.grep = parts[i + 1]
          i++
        }
      }

      const result = await gitLog.prettyLog(options)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-log-stats',
    description: 'Show git log with statistics (insertions/deletions)',
    aliases: ['log-stats'],
    args: ['[limit]'],
    run: async (args) => {
      const limit = args.trim() ? parseInt(args.trim()) : 20
      const result = await gitLog.gitLogWithStats(limit)
      return [{ type: 'text', text: result }]
    },
  },

  // ─── Repository Analysis Commands ───────────────────────────────────
  {
    name: 'git-stats',
    description: 'Show repository statistics',
    aliases: ['repo-stats', 'git-repo-stats'],
    run: async () => {
      const result = await gitAnalyze.repoStats()
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-contributors',
    description: 'Show contributor statistics',
    aliases: ['contributors', 'git-contribs'],
    run: async () => {
      const result = await gitAnalyze.contributorStats()
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-hotspots',
    description: 'Show most changed files (hotspots)',
    aliases: ['hotspots', 'git-hotspots'],
    args: ['[n]'],
    run: async (args) => {
      const n = args.trim() ? parseInt(args.trim()) : 10
      const result = await gitAnalyze.fileHotspots(n)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-branch-health',
    description: 'Check branch health (ahead/behind)',
    aliases: ['branch-health', 'branch-status'],
    run: async () => {
      const result = await gitAnalyze.branchHealth()
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-activity',
    description: 'Show recent activity summary',
    aliases: ['activity', 'git-activity'],
    args: ['[days]'],
    run: async (args) => {
      const days = args.trim() ? parseInt(args.trim()) : 7
      const result = await gitAnalyze.recentActivity(days)
      return [{ type: 'text', text: result }]
    },
  },

  {
    name: 'git-ownership',
    description: 'Show code ownership by author',
    aliases: ['ownership', 'code-ownership'],
    run: async () => {
      const result = await gitAnalyze.codeOwnership()
      return [{ type: 'text', text: result }]
    },
  },
]
