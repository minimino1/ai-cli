// ─── Git Interactive Operations ────────────────────────────────────────
// Advanced interactive git operations: stash, bisect, worktree

import { spawn } from 'bun'

export interface GitResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
}

// ─── Color Codes ───────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

/**
 * Führt den `git`-Befehl mit den angegebenen Argumenten aus und sammelt dessen Ausgabe.
 *
 * @param args - Array der an `git` weiterzureichenden Argumente (ohne das Programm selbst)
 * @returns Ein `GitResult`-Objekt mit:
 *  - `success`: `true` wenn der Prozess-Exit-Code `0` ist, `false` sonst,
 *  - `exitCode`: der numerische Exit-Code des Prozesses,
 *  - `stdout`: die getrimmte Standardausgabe als Zeichenkette,
 *  - `stderr`: die getrimmte Standardfehlerausgabe als Zeichenkette
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

// ─── Stash Operations ───────────────────────────────────────────────

/**
 * Erstellt einen Git-Stash mit einer optionalen Beschreibung.
 *
 * @param message - Optionale Nachricht, die dem Stash zugewiesen wird
 * @returns Ein formatierter String: bei Erfolg eine grüne Bestätigung gefolgt von Git-`stdout`, bei Fehler eine rote Fehlermeldung mit Git-`stderr`
 */
export async function stashCreate(message?: string): Promise<string> {
  const args = ['stash', 'push']
  if (message) {
    args.push('-m', message)
  }

  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error creating stash:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Stash created${colors.reset}\n${result.stdout}`
}

/**
 * Gibt die vorhandenen Git-Stashes als formatierten Text zurück.
 *
 * @returns Ein formatierter, ggf. farbiger String:
 * - Bei Erfolg: die Liste der Stashes, ein Eintrag pro Zeile (Stash-Referenz und Nachricht).
 * - Wenn keine Stashes vorhanden sind: ein Hinweistext.
 * - Bei Fehlern: eine Fehlermeldung, die den von `git` gelieferten Fehlertext enthält.
 */
export async function stashList(): Promise<string> {
  const result = await runGit(['stash', 'list'])

  if (!result.success) {
    return `${colors.red}Error listing stashes:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No stashes found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    // Stash entries look like: stash@{0}: WIP on branch: message
    if (line.startsWith('stash@')) {
      const match = line.match(/(stash@\{?\d+\}?):\s+(.+)/)
      if (match) {
        return `${colors.cyan}${match[1]}${colors.reset}: ${match[2]}`
      }
    }
    return line
  }).join('\n')
}

/**
 * Wendet einen Stash anhand seines Indexes an.
 *
 * @param index - Index des Stash-Eintrags; `0` entspricht dem zuletzt erstellten Stash
 * @returns Einen formatierten Text: bei Erfolg eine Bestätigung inklusive der Git-Ausgabe, bei Fehler eine Fehlermeldung inklusive der Git-Fehlerausgabe
 */
export async function stashApply(index: number = 0): Promise<string> {
  const stashRef = `stash@{${index}}`
  const result = await runGit(['stash', 'apply', stashRef])

  if (!result.success) {
    return `${colors.red}Error applying stash ${stashRef}:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Applied ${stashRef}${colors.reset}\n${result.stdout}`
}

/**
 * Poppt einen Stash — wendet den angegebenen Stash an und entfernt ihn aus der Stash-Liste.
 *
 * @param index - Index des Stash-Eintrags (z. B. `0` → `stash@{0}`); Standard ist `0`
 * @returns Eine formatierte Meldung: bei Erfolg eine grüne Bestätigung mit der Stash-Referenz und dem `git`-Ausgabe-Text; bei Fehler eine rote Fehlermeldung mit dem `git`-Fehlertext.
 */
export async function stashPop(index: number = 0): Promise<string> {
  const stashRef = `stash@{${index}}`
  const result = await runGit(['stash', 'pop', stashRef])

  if (!result.success) {
    return `${colors.red}Error popping stash ${stashRef}:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Popped ${stashRef}${colors.reset}\n${result.stdout}`
}

/**
 * Entfernt einen Stash-Eintrag anhand seines Index.
 *
 * @param index - Der numerische Index des Stash-Eintrags (erzeugt `stash@{<index>}`), Standard ist `0`
 * @returns Eine formatierte Statusmeldung: bei Erfolg eine Bestätigung, bei Fehler eine Fehlermeldung, die `stderr` enthält
 */
export async function stashDrop(index: number = 0): Promise<string> {
  const stashRef = `stash@{${index}}`
  const result = await runGit(['stash', 'drop', stashRef])

  if (!result.success) {
    return `${colors.red}Error dropping stash ${stashRef}:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Dropped ${stashRef}${colors.reset}`
}

// ─── Bisect Operations ───────────────────────────────────────────────

/**
 * Startet eine Bisect-Sitzung mit einem bekannten guten und einem bekannten schlechten Commit.
 *
 * @param good - Commit-Referenz, die als bekannt guter Commit gilt
 * @param bad - Commit-Referenz, die als bekannt schlechter Commit gilt; standardmäßig `HEAD`
 * @returns Bei Erfolg eine grün formatierte Bestätigung gefolgt von der Git-Ausgabe; bei Fehlern eine rot formatierte Fehlermeldung mit dem von Git gelieferten Fehlertext
 */
export async function bisectStart(good: string, bad: string = 'HEAD'): Promise<string> {
  const result = await runGit(['bisect', 'start', bad, good])

  if (!result.success) {
    return `${colors.red}Error starting bisect:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Bisect started${colors.reset}\n${result.stdout}`
}

/**
 * Markiert den aktuellen Commit im laufenden Bisect-Vorgang als "good".
 *
 * @returns Eine formatierte Zeichenkette: bei Erfolg eine grüne Bestätigungzeile gefolgt von der Git-Ausgabe, bei Fehler eine rote Fehlermeldung, die `stderr` enthält.
 */
export async function bisectGood(): Promise<string> {
  const result = await runGit(['bisect', 'good'])

  if (!result.success) {
    return `${colors.red}Error marking as good:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Marked as good${colors.reset}\n${result.stdout}`
}

/**
 * Markiert den aktuellen Commit als fehlerhaft im laufenden Git-Bisect-Vorgang.
 *
 * @returns Eine formatierte Meldung: bei Erfolg eine grüne Bestätigung mit der Git-Ausgabe, bei Fehler eine rote Fehlermeldung mit dem Git-Fehlertext
 */
export async function bisectBad(): Promise<string> {
  const result = await runGit(['bisect', 'bad'])

  if (!result.success) {
    return `${colors.red}Error marking as bad:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Marked as bad${colors.reset}\n${result.stdout}`
}

/**
 * Setzt die aktuelle Git-Bisect-Sitzung zurück.
 *
 * @returns Eine formatierte Bestätigungsnachricht bei Erfolg; im Fehlerfall eine formatierte Fehlermeldung, die die `stderr`-Ausgabe von Git enthält.
 */
export async function bisectReset(): Promise<string> {
  const result = await runGit(['bisect', 'reset'])

  if (!result.success) {
    return `${colors.red}Error resetting bisect:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Bisect reset${colors.reset}\n${result.stdout}`
}

// ─── Worktree Operations ─────────────────────────────────────────────

/**
 * Fügt ein neues Git-Worktree-Verzeichnis am angegebenen Pfad hinzu.
 *
 * @param path - Zielpfad für das neue Worktree
 * @param branch - Optionaler Zweigname, der im neuen Worktree ausgecheckt oder erstellt werden soll
 * @returns Eine formatierte Meldung als String: bei Erfolg eine grüne Bestätigung mit Pfad und Git-Ausgabe, bei Fehler eine rote Fehlermeldung mit Git `stderr`
 */
export async function worktreeAdd(path: string, branch?: string): Promise<string> {
  const args = ['worktree', 'add', path]
  if (branch) {
    args.push(branch)
  }

  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error adding worktree:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Worktree added: ${path}${colors.reset}\n${result.stdout}`
}

/**
 * Gibt die vorhandenen Git-Arbeitsbäume in einer formatierten, farbcodierten Liste zurück.
 *
 * Bei Erfolg enthält die Rückgabe pro Worktree eine Zeile mit Pfad und Branch (farbig formatiert).
 * Wenn keine Worktrees gefunden werden, enthält die Rückgabe eine Hinweisnachricht.
 * Bei einem Fehler enthält die Rückgabe eine Fehlermeldung, die die Git-Fehlerausgabe einschließt.
 *
 * @returns Eine formatierte Zeichenkette mit den aufgelisteten Worktrees; bei keinem Worktree eine Hinweisnachricht; bei Fehlern eine Fehlermeldung mit der Git-Fehlerausgabe
 */
export async function worktreeList(): Promise<string> {
  const result = await runGit(['worktree', 'list'])

  if (!result.success) {
    return `${colors.red}Error listing worktrees:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No worktrees found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    // Worktree lines: <path> <branch> [detached]
    const parts = line.split(/\s+/)
    if (parts.length >= 2) {
      const path = parts[0]
      const branch = parts[1]
      const rest = parts.slice(2).join(' ')
      return `${colors.cyan}${path}${colors.reset} ${colors.green}${branch}${colors.reset}${rest ? ` ${rest}` : ''}`
    }
    return line
  }).join('\n')
}

/**
 * Entfernt einen Git-Worktree an dem angegebenen Pfad.
 *
 * @param path - Pfad des zu entfernenden Worktrees
 * @returns Eine formatierte Statusnachricht: bei Erfolg eine grüne Bestätigung mit dem Pfad und der Ausgabe des Befehls, bei Fehler eine rote Fehlermeldung mit der `stderr`-Ausgabe
 */
export async function worktreeRemove(path: string): Promise<string> {
  const result = await runGit(['worktree', 'remove', path])

  if (!result.success) {
    return `${colors.red}Error removing worktree:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Worktree removed: ${path}${colors.reset}\n${result.stdout}`
}

// ─── Interactive Rebase ──────────────────────────────────────────────

/**
 * Startet einen interaktiven Rebase ab einem angegebenen Commit.
 *
 * @param commit - Commit-Hash oder Ref, ab dem der interaktive Rebase gestartet wird (z. B. `HEAD~3`)
 * @returns Eine farbcodierte Nachricht: bei Erfolg eine grüne Bestätigung gefolgt von der Git-Ausgabe, bei Fehler eine rote Fehlermeldung mit der `stderr`-Ausgabe
 */
export async function interactiveRebase(commit: string): Promise<string> {
  const result = await runGit(['rebase', '-i', commit])

  if (!result.success) {
    return `${colors.red}Error starting interactive rebase:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Interactive rebase started${colors.reset}\n${result.stdout}`
}
