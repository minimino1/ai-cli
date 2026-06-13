// ─── Repository Analysis ───────────────────────────────────────────────
// Repository statistics, contributor analysis, file hotspots, branch health

import { spawn } from 'bun'
import { join } from 'node:path'

export interface GitResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
}

export interface RepoStats {
  totalCommits: number
  totalBranches: number
  totalContributors: number
  totalFiles: number
  firstCommit: string
  lastCommit: string
  repositoryAge: string
}

export interface ContributorStats {
  author: string
  commits: number
  percentage: number
  lastCommit: string
}

export interface FileHotspot {
  file: string
  commits: number
  lastModified: string
  authors: number
}

export interface BranchHealth {
  branch: string
  ahead: number
  behind: number
  status: 'healthy' | 'behind' | 'ahead' | 'diverged'
}

// ─── Color Codes ───────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

/**
 * Führt das `git`-Kommando mit den gegebenen Argumenten im aktuellen Arbeitsverzeichnis aus und sammelt dessen Ausgabe.
 *
 * @param args - Array von Argumenten, die an `git` übergeben werden (z. B. `['status', '--porcelain']`)
 * @returns Ein `GitResult`-Objekt mit `success` (true wenn der Prozess-Exit-Code 0 war), `exitCode` sowie den getrimmten `stdout`- und `stderr`-Inhalten
 */
async function runGit(args: string[]): Promise<GitResult> {
  const subprocess = Bun.spawn({
    program: 'git',
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
  return { success: exitCode === 0, exitCode, stdout: stdout.trim(), stderr: stderr.trim() }
}

/**
 * Ermittelt die Anzahl der Zeilen in einer Textdatei.
 *
 * @param filePath - Pfad zur Datei, deren Zeilen gezählt werden sollen
 * @returns Die Anzahl der Zeilen in der Datei; `0` bei Lesefehlern oder wenn die Datei nicht existiert
 */
async function countLines(filePath: string): Promise<number> {
  try {
    const content = await Bun.file(filePath).text()
    return content.split('\n').length
  } catch {
    return 0
  }
}

// ─── Repository Statistics ──────────────────────────────────────────
/**
 * Erstellt einen formatierten Bericht mit zentralen Kennzahlen des Git-Repositorys.
 *
 * Fügt Gesamtanzahl der Commits, Anzahl der Branches und Anzahl der Mitwirkenden hinzu.
 * Falls verfügbar, werden außerdem Datum und Autor des ersten und letzten Commits sowie das Alter des Repositories in Tagen angefügt; diese Abschnitte erscheinen nur, wenn die jeweiligen Git-Abfragen erfolgreich sind.
 *
 * @returns Ein mehrzeiliges, formatiertes String-Report mit den aggregierten Repository-Statistiken
 */
export async function repoStats(): Promise<string> {
  const results: string[] = []

  // Total commits
  const commitCountResult = await runGit(['rev-list', '--count', 'HEAD'])
  const totalCommits = commitCountResult.success ? parseInt(commitCountResult.stdout) : 0

  // Branch count
  const branchResult = await runGit(['branch', '-a'])
  const branches = branchResult.success ? branchResult.stdout.split('\n').filter(b => b.trim()).length : 0

  // Contributors
  const contributorsResult = await runGit(['shortlog', '-sne', '--all'])
  const contributors = contributorsResult.success ? contributorsResult.stdout.split('\n').filter(l => l.trim()).length : 0

  // First and last commit
  const firstCommitResult = await runGit(['log', '--reverse', '--format=%ad|%an', '-1'])
  const lastCommitResult = await runGit(['log', '-1', '--format=%ad|%an'])

  // Repository age
  const ageResult = await runGit(['log', '--reverse', '--format=%ai', '-1'])

  results.push(`${colors.bold}Repository Statistics${colors.reset}`)
  results.push('─'.repeat(50))
  results.push(`Total Commits:  ${colors.green}${totalCommits}${colors.reset}`)
  results.push(`Branches:        ${colors.cyan}${branches}${colors.reset}`)
  results.push(`Contributors:    ${colors.magenta}${contributors}${colors.reset}`)

  if (firstCommitResult.success && firstCommitResult.stdout) {
    const [date, author] = firstCommitResult.stdout.split('|')
    results.push(`First Commit:    ${colors.dim}${date.trim()}${colors.reset} by ${author.trim()}`)
  }

  if (lastCommitResult.success && lastCommitResult.stdout) {
    const [date, author] = lastCommitResult.stdout.split('|')
    results.push(`Last Commit:     ${colors.dim}${date.trim()}${colors.reset} by ${author.trim()}`)
  }

  if (ageResult.success && ageResult.stdout) {
    const firstDate = new Date(ageResult.stdout)
    const now = new Date()
    const days = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    results.push(`Repository Age:  ${colors.yellow}${days} days${colors.reset}`)
  }

  return results.join('\n')
}

// ─── Contributor Statistics ─────────────────────────────────────────
/**
 * Erzeugt eine formatierte Übersicht der Commit-Statistiken pro Contributor.
 *
 * Berechnet Commit-Anzahlen und Prozentanteile pro Autor, ermittelt das Datum des letzten Commits pro Autor und gibt eine farbcodierte, tabellarische Textausgabe zurück.
 *
 * @returns Eine farbcodierte, tabellarische Übersicht der Autoren, deren Commit‑Anzahlen, Prozentanteile und des Datums des letzten Commits; im Fehlerfall enthält der String eine Fehlermeldung. 
 */
export async function contributorStats(): Promise<string> {
  const result = await runGit(['shortlog', '-sne', '--all'])

  if (!result.success || !result.stdout) {
    return `${colors.red}Error:${colors.reset} ${result.stderr || 'No contributors found'}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  const totalCommits = lines.reduce((sum, line) => {
    const match = line.match(/^(\s*\d+)\s+/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0)

  const contributors: ContributorStats[] = lines.map(line => {
    const match = line.match(/^(\s*\d+)\s+(.+?)\s+<(.+)>$/)
    if (!match) return { author: line, commits: 0, percentage: 0, lastCommit: '' }

    const [, commitsStr, author, email] = match
    const commits = parseInt(commitsStr.trim())
    const percentage = totalCommits > 0 ? (commits / totalCommits) * 100 : 0

    return {
      author: `${author} <${email}>`,
      commits,
      percentage,
      lastCommit: '',
    }
  }).sort((a, b) => b.commits - a.commits)

  // Get last commit date for each contributor
  for (let i = 0; i < contributors.length; i++) {
    const emailMatch = contributors[i].author.match(/<([^>]+)>/)
    if (emailMatch) {
      const email = emailMatch[1]
      const lastCommitResult = await runGit(['log', '--format=%ad', '-1', `--author=${email}`])
      if (lastCommitResult.success && lastCommitResult.stdout) {
        contributors[i].lastCommit = lastCommitResult.stdout
      }
    }
  }

  const output: string[] = []
  output.push(`${colors.bold}Contributor Statistics${colors.reset}`)
  output.push(`Total Commits: ${totalCommits}`)
  output.push('─'.repeat(80))
  output.push(`${colors.bold}Author                          Commits    %        Last Commit${colors.reset}`)

  for (const c of contributors) {
    const author = (c.author.length > 30 ? c.author.slice(0, 27) + '...' : c.author).padEnd(30)
    const commits = String(c.commits).padStart(7)
    const percentage = c.percentage.toFixed(1).padStart(6)
    const lastCommit = c.lastCommit || colors.dim + 'never' + colors.reset

    output.push(`${colors.yellow}${author}${colors.reset} ${colors.green}${commits}${colors.reset} ${colors.cyan}${percentage}%${colors.reset} ${colors.dim}${lastCommit}${colors.reset}`)
  }

  return output.join('\n')
}

// ─── File Hotspots ──────────────────────────────────────────────────
/**
 * Ermittelt die Top n Dateien mit den meisten Einträgen in der Git-Historie (Hotspots).
 *
 * Liefert für jede Datei die Anzahl der Commits, die Anzahl eindeutiger Autoren und das Datum der letzten Änderung.
 *
 * @param n - Maximale Anzahl der angezeigten Dateien (Standard: 10)
 * @returns Den formatierten, farbcodierten Berichtstext mit Spalten für Datei, Commits, Autoren und letztes Änderungsdatum. Bei Git-Fehlern enthält der Text eine entsprechende Fehlermeldung.
 */
export async function fileHotspots(n: number = 10): Promise<string> {
  // Get commit count per file
  const result = await runGit(['log', '--pretty=format:', '--name-only'])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  const files = result.stdout.split('\n').filter(f => f.trim())
  const fileCounts = new Map<string, number>()

  for (const file of files) {
    fileCounts.set(file, (fileCounts.get(file) || 0) + 1)
  }

  // Sort by commit count descending
  const sorted = Array.from(fileCounts.entries())
    .map(([file, commits]) => ({ file, commits }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, n)

  if (sorted.length === 0) {
    return `${colors.yellow}No file history found${colors.reset}`
  }

  // Get additional info for each file
  const hotspots: FileHotspot[] = []
  for (const { file, commits } of sorted) {
    // Get last modified date
    const lastModResult = await runGit(['log', '-1', '--format=%ad', '--', file])
    const lastModified = lastModResult.success && lastModResult.stdout ? lastModResult.stdout : 'unknown'

    // Count unique authors
    const authorsResult = await runGit(['log', '--format=%ae', '--', file])
    const authors = new Set(
      (authorsResult.success ? authorsResult.stdout.split('\n') : [])
        .filter(e => e.trim())
    ).size

    hotspots.push({ file, commits, lastModified, authors })
  }

  const output: string[] = []
  output.push(`${colors.bold}Top ${n} File Hotspots${colors.reset}`)
  output.push('─'.repeat(80))
  output.push(`${colors.bold}File                              Commits  Authors  Last Modified${colors.reset}`)

  for (const h of hotspots) {
    const file = (h.file.length > 30 ? h.file.slice(0, 27) + '...' : h.file).padEnd(30)
    const commits = String(h.commits).padStart(8)
    const authors = String(h.authors).padStart(8)
    const lastMod = h.lastModified || colors.dim + 'unknown' + colors.reset

    output.push(`${colors.cyan}${file}${colors.reset} ${colors.green}${commits}${colors.reset} ${colors.magenta}${authors}${colors.reset} ${colors.dim}${lastMod}${colors.reset}`)
  }

  return output.join('\n')
}

// ─── Branch Health ──────────────────────────────────────────────────
/**
 * Ermittelt den Ahead-/Behind-Status aller lokalen Branches und erzeugt einen formatierten Bericht.
 *
 * Gibt einen farbcodierten, zeilenweisen Bericht zurück, der den aktuellen Branch, für jeden Branch den
 * Status (`healthy`, `ahead`, `behind`, `diverged`) sowie die Anzahl der Commits `ahead` und `behind` anzeigt.
 *
 * @returns Der formatierte Bericht als `string`. Bei Fehlern von Git oder wenn HEAD detached ist, enthält der
 *          zurückgegebene String eine entsprechende Fehler- oder Hinweismeldung.
export async function branchHealth(): Promise<string> {
  // Get current branch
  const currentBranchResult = await runGit(['branch', '--show-current'])
  if (!currentBranchResult.success) {
    return `${colors.red}Error:${colors.reset} ${currentBranchResult.stderr}`
  }

  const currentBranch = currentBranchResult.stdout.trim()
  if (!currentBranch) {
    return `${colors.yellow}Not on any branch (detached HEAD)${colors.reset}`
  }

  // Get all branches with upstream info
  const branchesResult = await runGit(['branch', '-vv'])
  if (!branchesResult.success) {
    return `${colors.red}Error:${colors.reset} ${branchesResult.stderr}`
  }

  const lines = branchesResult.stdout.split('\n').filter(l => l.trim())
  const branches: BranchHealth[] = []

  for (const line of lines) {
    const isCurrent = line.startsWith('*')
    const branchMatch = line.match(/^\s*\*\s+(\S+)/) || line.match(/^\s+(\S+)/)
    if (!branchMatch) continue

    const branch = branchMatch[1]
    const aheadMatch = line.match(/\[ahead (\d+)\]/)
    const behindMatch = line.match(/\[behind (\d+)\]/)

    const ahead = aheadMatch ? parseInt(aheadMatch[1]) : 0
    const behind = behindMatch ? parseInt(behindMatch[1]) : 0

    let status: BranchHealth['status'] = 'healthy'
    if (ahead > 0 && behind > 0) status = 'diverged'
    else if (ahead > 0) status = 'ahead'
    else if (behind > 0) status = 'behind'

    branches.push({ branch, ahead, behind, status })
  }

  const output: string[] = []
  output.push(`${colors.bold}Branch Health${colors.reset}`)
  output.push(`Current branch: ${colors.green}${currentBranch}${colors.reset}`)
  output.push('─'.repeat(70))

  for (const b of branches) {
    const marker = b.branch === currentBranch ? '*' : ' '
    const statusColor = b.status === 'healthy' ? colors.green : b.status === 'ahead' ? colors.yellow : b.status === 'behind' ? colors.red : colors.magenta
    const statusText = b.status.padEnd(8)

    output.push(`${marker} ${colors.cyan}${b.branch.padEnd(20)}${colors.reset} ${statusColor}${statusText}${colors.reset} ahead:${b.ahead} behind:${b.behind}`)
  }

  return output.join('\n')
}

// ─── Recent Activity ────────────────────────────────────────────────
/**
 * Liefert eine kurze, formatierte Zusammenfassung der Repository-Aktivität der letzten Tage.
 *
 * @param days - Anzahl der zurückliegenden Tage, die in die Zusammenfassung einbezogen werden
 * @returns Eine farbcodierte Textzusammenfassung mit Anzahl der Commits, eindeutigen Mitwirkenden, geänderten Dateien und neu erstellten Branches
 */
export async function recentActivity(days: number = 7): Promise<string> {
  const since = `${days} days ago`

  // Commits in period
  const commitsResult = await runGit(['log', `--since="${since}"`, '--oneline'])
  const commits = commitsResult.success ? commitsResult.stdout.split('\n').filter(l => l.trim()).length : 0

  // Authors in period
  const authorsResult = await runGit(['log', `--since="${since}"`, '--format=%ae', '--no-merges'])
  const authors = new Set(
    authorsResult.success ? authorsResult.stdout.split('\n').filter(e => e.trim()) : []
  ).size

  // Files changed
  const filesResult = await runGit(['log', `--since="${since}"`, '--name-only', '--pretty=format:'])
  const files = new Set(
    filesResult.success ? filesResult.stdout.split('\n').filter(f => f.trim()) : []
  ).size

  // Branches created
  const branchesResult = await runGit(['log', `--since="${since}"`, '--diff-filter=A', '--pretty=format:', '--name-only'])
  const branches = branchesResult.success ? branchesResult.stdout.split('\n').filter(l => l.trim() && l.includes('refs/heads/')).length : 0

  const output: string[] = []
  output.push(`${colors.bold}Recent Activity (Last ${days} days)${colors.reset}`)
  output.push('─'.repeat(50))
  output.push(`Commits:       ${colors.green}${commits}${colors.reset}`)
  output.push(`Contributors:  ${colors.magenta}${authors}${colors.reset}`)
  output.push(`Files Changed: ${colors.cyan}${files}${colors.reset}`)
  output.push(`Branches:      ${colors.yellow}${branches}${colors.reset}`)

  return output.join('\n')
}

// ─── Code Ownership (Lines per Author) ──────────────────────────────
/**
 * Schätzt die Code-Besitzanteile pro Autor anhand von `git blame`.
 *
 * Führt ein stichprobenartiges Blame über bis zu 50 Quelltextdateien aus und erstellt einen formatierten Bericht,
 * der für jeden Autor die Anzahl der ermittelten Codezeilen und den prozentualen Anteil am gezählten Gesamtumfang zeigt.
 *
 * @returns Ein formatierter Bericht als String mit Gesamtzeilen, Auflistung der Autoren, deren Zeilenanzahl und Prozentanteil;
 *          bei fehlenden Quelldateien oder wenn keine Zeilen gezählt werden konnten, wird eine erklärende Meldung zurückgegeben.
 */
export async function codeOwnership(): Promise<string> {
  // Get all source files (common extensions)
  const allFilesResult = await runGit(['ls-files', '*.ts', '*.tsx', '*.js', '*.jsx', '*.py', '*.go', '*.rs', '*.rb', '*.java', '*.c', '*.cpp', '*.h'])
  const files = allFilesResult.success ? allFilesResult.stdout.split('\n').filter(f => f.trim()) : []

  if (files.length === 0) {
    return `${colors.yellow}No source files found${colors.reset}`
  }

  const authorLines = new Map<string, number>()
  let totalLines = 0

  // Sample first 50 files to avoid timeout
  const sampleFiles = files.slice(0, 50)

  for (const file of sampleFiles) {
    try {
      const blameResult = await runGit(['blame', '--line-porcelain', file])
      if (!blameResult.success) continue

      const lines = blameResult.stdout.split('\n')
      let currentAuthor = ''

      for (const line of lines) {
        if (line.startsWith('author ')) {
          currentAuthor = line.replace('author ', '')
        } else if (line.startsWith('\t') && currentAuthor) {
          authorLines.set(currentAuthor, (authorLines.get(currentAuthor) || 0) + 1)
          totalLines++
        }
      }
    } catch {
      // Skip files with errors
    }
  }

  if (totalLines === 0) {
    return `${colors.yellow}Could not calculate ownership${colors.reset}`
  }

  // Calculate percentages and sort
  const ownership = Array.from(authorLines.entries())
    .map(([author, lines]) => ({
      author,
      lines,
      percentage: (lines / totalLines) * 100,
    }))
    .sort((a, b) => b.lines - a.lines)

  const output: string[] = []
  output.push(`${colors.bold}Code Ownership (Sample of ${sampleFiles.length} files)${colors.reset}`)
  output.push(`Total Lines: ${totalLines}`)
  output.push('─'.repeat(80))
  output.push(`${colors.bold}Author                          Lines     %${colors.reset}`)

  for (const o of ownership) {
    const author = (o.author.length > 30 ? o.author.slice(0, 27) + '...' : o.author).padEnd(30)
    const lines = String(o.lines).padStart(8)
    const percentage = o.percentage.toFixed(1).padStart(6)

    output.push(`${colors.yellow}${author}${colors.reset} ${colors.green}${lines}${colors.reset} ${colors.cyan}${percentage}%${colors.reset}`)
  }

  return output.join('\n')
}
