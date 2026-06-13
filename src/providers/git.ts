// ─── Git Provider ───────────────────────────────────────────────────
// Provides git operations with colored output

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

// ─── Run Git Command ───────────────────────────────────────────────
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

  // Read stdout
  if (subprocess.stdout) {
    const reader = subprocess.stdout.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          stdout += new TextDecoder().decode(value)
        }
      }
    } catch {
      // ignore read errors
    } finally {
      reader.releaseLock()
    }
  }

  // Read stderr
  if (subprocess.stderr) {
    const reader = subprocess.stderr.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          stderr += new TextDecoder().decode(value)
        }
      }
    } catch {
      // ignore read errors
    } finally {
      reader.releaseLock()
    }
  }

  const exitCode = await subprocess.exited

  return {
    success: exitCode === 0,
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  }
}

// ─── Git Status ────────────────────────────────────────────────────
export async function gitStatus(): Promise<string> {
  const result = await runGit(['status', '--porcelain', '--branch'])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.green}✓ Working tree clean${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  const output: string[] = []

  for (const line of lines) {
    if (line.startsWith('##')) {
      // Branch info
      output.push(`${colors.cyan}${line}${colors.reset}`)
    } else {
      // File status
      const status = line.slice(0, 2)
      const file = line.slice(3)
      let color = colors.reset

      if (status.includes('M')) color = colors.yellow
      else if (status.includes('A')) color = colors.green
      else if (status.includes('D')) color = colors.red
      else if (status.includes('R')) color = colors.blue
      else if (status.includes('?')) color = colors.bold

      output.push(`  ${color}${status}${colors.reset} ${file}`)
    }
  }

  return output.join('\n')
}

// ─── Git Diff ──────────────────────────────────────────────────────
export async function gitDiff(staged: boolean = false): Promise<string> {
  const args = staged ? ['diff', '--cached'] : ['diff']
  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return staged
      ? `${colors.yellow}No staged changes${colors.reset}`
      : `${colors.yellow}No unstaged changes${colors.reset}`
  }

  // Simple colorization for diff
  const lines = result.stdout.split('\n')
  const colored: string[] = []

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      colored.push(`${colors.green}${line}${colors.reset}`)
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      colored.push(`${colors.red}${line}${colors.reset}`)
    } else if (line.startsWith('@@')) {
      colored.push(`${colors.cyan}${line}${colors.reset}`)
    } else {
      colored.push(line)
    }
  }

  return colored.join('\n')
}

// ─── Git Log ───────────────────────────────────────────────────────
export async function gitLog(limit: number = 20): Promise<string> {
  const result = await runGit(['log', `--oneline`, `-${limit}`])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No commits found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    const parts = line.split(' ', 2)
    if (parts.length === 2) {
      return `${colors.green}${parts[0]}${colors.reset} ${parts[1]}`
    }
    return line
  }).join('\n')
}

// ─── Git Add ───────────────────────────────────────────────────────
export async function gitAdd(files: string[]): Promise<string> {
  if (files.length === 0) {
    return `${colors.yellow}Usage: git add <file>...${colors.reset}`
  }

  const result = await runGit(['add', ...files])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Staged ${files.length} file(s)${colors.reset}`
}

// ─── Git Commit ─────────────────────────────────────────────────────
export async function gitCommit(message: string): Promise<string> {
  if (!message.trim()) {
    return `${colors.yellow}Usage: git commit -m "message"${colors.reset}`
  }

  const result = await runGit(['commit', '-m', message])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Committed changes${colors.reset}\n${result.stdout}`
}

/**
 * Liefert die Liste aller lokalen und entfernten Git-Branches und markiert den aktuellen Branch farbig.
 *
 * Führt `git branch -a --list --color=always` aus. Bei einem fehlgeschlagenen Aufruf enthält die Rückgabe
 * eine Fehlerzeile mit `Error:` gefolgt von der farbcodierten Fehlermeldung; ist die Ausgabe leer, wird
 * eine farbige Meldung angezeigt, dass keine Branches gefunden wurden.
 *
 * @returns Eine formatierte, ggf. mehrzeilige Zeichenkette mit farbcodierten Branch-Zeilen. Im Fehlerfall enthält
 *          die Zeichenkette `Error:` gefolgt von der farbcodierten stderr-Ausgabe; bei leerer Ausgabe enthält sie
 *          eine farbige Hinweiszeile, dass keine Branches gefunden wurden.
 */
export async function gitBranch(): Promise<string> {
  const result = await runGit(['branch', '-a', '--list', '--color=always'])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No branches found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    if (line.startsWith('*')) {
      return `${colors.green}${line}${colors.reset}`
    }
    return line
  }).join('\n')
}

/**
 * Erstellt lokal einen neuen Git-Branch mit dem angegebenen Namen.
 *
 * @param name - Der Name des zu erstellenden Branches
 * @returns Eine formatierte Statusmeldung:
 * - eine Usage-Hinweiszeile (`git branch <name>`) wenn `name` leer ist,
 * - `"Error: <stderr>"` (farbig formatiert) wenn der Git-Befehl fehlschlägt,
 * - eine Erfolgsmeldung `✓ Created branch '<name>'` (farbig formatiert) bei erfolgreicher Erstellung
 */
export async function gitCreateBranch(name: string): Promise<string> {
  if (!name.trim()) {
    return `${colors.yellow}Usage: git branch <name>${colors.reset}`
  }

  const result = await runGit(['branch', name])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Created branch '${name}'${colors.reset}`
}

/**
 * Wechselt zum angegebenen Git-Branch und liefert eine farblich formatierte Ergebnisnachricht.
 *
 * @param branch - Name des Branches, zu dem gewechselt werden soll
 * @returns Eine formatierte Statusmeldung: bei Erfolg eine grüne Bestätigung mit optionaler Git-Ausgabe; bei Fehlern eine rote `Error:`-Zeile mit der Git-Fehlermeldung; wenn `branch` leer ist, eine gelbe Usage-Hinweiszeile
 */
export async function gitCheckout(branch: string): Promise<string> {
  if (!branch.trim()) {
    return `${colors.yellow}Usage: git checkout <branch>${colors.reset}`
  }

  const result = await runGit(['checkout', branch])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Switched to branch '${branch}'${colors.reset}\n${result.stdout}`
}

/**
 * Führt einen Git-Merge des angegebenen Branches durch und liefert eine formatierte Statusnachricht.
 *
 * @param branch - Name des Ziel-Branches, der in den aktuellen Branch gemerged werden soll
 * @returns Eine formatierte Ergebniszeichenfolge:
 * - Bei leerem `branch` eine Usage-Hinweiszeile ("git merge <branch>").
 * - Bei Fehlschlag eine Zeile mit `Error:` gefolgt von der Git-Fehlermeldung.
 * - Bei Erfolg eine Bestätigung "✓ Merged branch '<branch>'" gefolgt von der Ausgabe des Merge-Befehls.
 */
export async function gitMerge(branch: string): Promise<string> {
  if (!branch.trim()) {
    return `${colors.yellow}Usage: git merge <branch>${colors.reset}`
  }

  const result = await runGit(['merge', branch])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Merged branch '${branch}'${colors.reset}\n${result.stdout}`
}

/**
 * Führt ein Git-Rebase auf den angegebenen Ziel-Branch durch.
 *
 * @param branch - Ziel-Branch, auf den das aktuelle Arbeitsverzeichnis rebased werden soll
 * @returns Eine farbige Statusmeldung: bei Erfolg eine Bestätigung `✓ Rebased onto branch '<branch>'` gefolgt von der Git-Ausgabe; bei Fehlern eine Meldung beginnend mit `Error:` und der Fehlerausgabe; wenn `branch` leer ist, eine Nutzungsanweisung
 */
export async function gitRebase(branch: string): Promise<string> {
  if (!branch.trim()) {
    return `${colors.yellow}Usage: git rebase <branch>${colors.reset}`
  }

  const result = await runGit(['rebase', branch])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Rebased onto branch '${branch}'${colors.reset}\n${result.stdout}`
}

/**
 * Löscht einen lokalen Git-Branch.
 *
 * Führt `git branch -d` (oder `-D` wenn erzwungen) aus und gibt eine farbformatierte Ergebnisnachricht zurück.
 *
 * @param name - Der Name des zu löschenden Branches
 * @param force - Falls `true`, erzwingt die Löschung (`-D`) auch bei Änderungen, die nicht zusammengeführt wurden
 * @returns Eine farbcodierte Nachricht: ein Nutzungs-Hinweis wenn `name` leer ist, eine Fehlerzeile mit `stderr` bei fehlgeschlagenem Git-Aufruf oder eine Erfolgsmeldung bei erfolgreicher Löschung
 */
export async function gitDeleteBranch(name: string, force: boolean = false): Promise<string> {
  if (!name.trim()) {
    return `${colors.yellow}Usage: git branch -d <branch>${colors.reset}`
  }

  const args = ['branch', force ? '-D' : '-d', name]
  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Deleted branch '${name}'${colors.reset}`
}

/**
 * Benennt einen vorhandenen Git-Branch um.
 *
 * @param oldName - Der aktuelle Name des Branches
 * @param newName - Der gewünschte neue Name des Branches
 * @returns Eine formatierte Statusnachricht:
 * - Bei leerem `oldName` oder `newName`: eine Nutzungshilfe (`git branch -m <old> <new>`)
 * - Bei einem Fehler des Git-Befehls: `Error:` gefolgt von der farbigen `stderr`-Ausgabe
 * - Bei Erfolg: `✓ Renamed branch 'oldName' to 'newName'`
 */
export async function gitRenameBranch(oldName: string, newName: string): Promise<string> {
  if (!oldName.trim() || !newName.trim()) {
    return `${colors.yellow}Usage: git branch -m <old> <new>${colors.reset}`
  }

  const result = await runGit(['branch', '-m', oldName, newName])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Renamed branch '${oldName}' to '${newName}'${colors.reset}`
}

