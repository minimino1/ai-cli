import { exec } from 'child_process'
import { promisify } from 'util'
import { kill } from 'process'

const execAsync = promisify(exec)

export interface ProcessInfo {
  pid: number
  name: string
  user: string
  cpu: number
  memory: number
  command?: string
  state?: string
  startTime?: Date
  ppid?: number
  children?: ProcessInfo[]
}

export interface ProcessTree {
  root: ProcessInfo
  children: ProcessTree[]
}

/**
 * List all processes
 */
export async function listProcesses(sortBy: 'cpu' | 'memory' | 'pid' | 'name' = 'cpu'): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = []

  try {
    // Get full process list with detailed info
    const { stdout } = await execAsync('ps -eo pid,ppid,user,comm,%cpu,%mem,stat,start,args --sort=-pcpu 2>/dev/null')

    const lines = stdout.split('\n').filter(l => l.trim())
    // Skip header
    const dataLines = lines.slice(1)

    for (const line of dataLines) {
      // Parse ps output (handles variable whitespace)
      const parts: string[] = []
      let current = ''
      let inCommand = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === ' ' && !inCommand) {
          if (current) {
            parts.push(current)
            current = ''
          }
        } else {
          current += char
          if (current.includes('/') && !inCommand) {
            inCommand = true
          }
        }
      }
      if (current) parts.push(current)

      if (parts.length >= 8) {
        const pid = parseInt(parts[0])
        const ppid = parseInt(parts[1])
        const user = parts[2]
        const name = parts[3]
        const cpu = parseFloat(parts[4])
        const memory = parseFloat(parts[5])
        const state = parts[6]
        const start = parts[7]

        // Get command (rest of the line)
        const command = parts.slice(8).join(' ')

        processes.push({
          pid,
          name,
          user,
          cpu,
          memory,
          command,
          state,
          ppid,
          startTime: parseStartTime(start),
        })
      }
    }
  } catch {
    // Try simpler approach
    try {
      const { stdout } = await execAsync('ps -A -o pid,comm,%cpu,%mem | tail -n +2')
      const lines = stdout.split('\n').filter(l => l.trim())

      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 4) {
          processes.push({
            pid: parseInt(parts[0]),
            name: parts[1],
            user: 'unknown',
            cpu: parseFloat(parts[2]),
            memory: parseFloat(parts[3]),
          })
        }
      }
    } catch {
      // No process info available
    }
  }

  // Sort
  switch (sortBy) {
    case 'cpu':
      processes.sort((a, b) => b.cpu - a.cpu)
      break
    case 'memory':
      processes.sort((a, b) => b.memory - a.memory)
      break
    case 'pid':
      processes.sort((a, b) => a.pid - b.pid)
      break
    case 'name':
      processes.sort((a, b) => a.name.localeCompare(b.name))
      break
  }

  return processes
}

/**
 * Parse ps start time format
 */
function parseStartTime(startStr: string): Date | undefined {
  try {
    // Handle various formats: "Jun12", "10:20:30", "2024-06-12"
    const now = new Date()

    if (startStr.includes('-')) {
      // YYYY-MM-DD format
      return new Date(startStr)
    } else if (startStr.includes(':')) {
      // HH:MM:SS format (today)
      const [hours, minutes, seconds] = startStr.split(':').map(Number)
      const date = new Date(now)
      date.setHours(hours, minutes, seconds, 0)
      return date
    } else {
      // MonDD format (e.g., "Jun12")
      const match = startStr.match(/([A-Za-z]+)(\d+)/)
      if (match) {
        const monthStr = match[1]
        const day = parseInt(match[2])
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = months.indexOf(monthStr)
        if (month !== -1) {
          const date = new Date(now.getFullYear(), month, day)
          // If date is in future, it's from last year
          if (date > now) {
            date.setFullYear(date.getFullYear() - 1)
          }
          return date
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return undefined
}

/**
 * Kill a process
 */
export async function killProcess(pid: number, signal: string = 'SIGTERM'): Promise<{ success: boolean; error?: string }> {
  try {
    // Try graceful kill first
    process.kill(pid, signal)

    // Check if process still exists
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      process.kill(pid, 0)
      // Still exists, try force kill
      process.kill(pid, 'SIGKILL')
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        process.kill(pid, 0)
        return { success: false, error: 'Process still running after SIGKILL' }
      } catch {
        return { success: true }
      }
    } catch {
      // Process doesn't exist
      return { success: true }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get top N processes by CPU or memory
 */
export async function topProcesses(n: number = 10, sortBy: 'cpu' | 'memory' = 'cpu'): Promise<ProcessInfo[]> {
  const all = await listProcesses(sortBy)
  return all.slice(0, n)
}

/**
 * Get detailed information about a specific process
 */
export async function processInfo(pid: number): Promise<ProcessInfo | null> {
  try {
    const { stdout } = await execAsync(`ps -o pid,ppid,user,comm,%cpu,%mem,stat,start,args -p ${pid} 2>/dev/null`)
    const lines = stdout.split('\n').filter(l => l.trim())

    if (lines.length < 2) {
      return null
    }

    const line = lines[1]
    const parts: string[] = []
    let current = ''
    let inCommand = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === ' ' && !inCommand) {
        if (current) {
          parts.push(current)
          current = ''
        }
      } else {
        current += char
        if (current.includes('/') && !inCommand) {
          inCommand = true
        }
      }
    }
    if (current) parts.push(current)

    if (parts.length >= 8) {
      return {
        pid,
        name: parts[3],
        user: parts[2],
        cpu: parseFloat(parts[4]),
        memory: parseFloat(parts[5]),
        command: parts.slice(8).join(' '),
        state: parts[6],
        ppid: parseInt(parts[1]),
        startTime: parseStartTime(parts[7]),
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Build process tree
 */
export async function treeProcesses(): Promise<ProcessTree[]> {
  const processes = await listProcesses('pid')
  const pidMap = new Map<number, ProcessInfo & { children: ProcessInfo[] }>()

  // Initialize all processes
  for (const proc of processes) {
    pidMap.set(proc.pid, { ...proc, children: [] })
  }

  const roots: ProcessTree[] = []

  // Build tree structure
  for (const proc of pidMap.values()) {
    if (proc.ppid && pidMap.has(proc.ppid)) {
      const parent = pidMap.get(proc.ppid)!
      parent.children.push(proc)
    } else {
      roots.push({
        root: proc,
        children: [],
      })
    }
  }

  // Recursively build full tree
  const buildTree = (node: ProcessInfo & { children: ProcessInfo[] }): ProcessTree => ({
    root: { ...node, children: undefined },
    children: node.children.map(buildTree),
  })

  return roots.map(buildTree)
}

/**
 * Format process tree for display
 */
export function formatProcessTree(tree: ProcessTree[], indent: number = 0): string {
  const lines: string[] = []

  const printNode = (node: ProcessTree, depth: number) => {
    const indentStr = '  '.repeat(depth)
    const proc = node.root
    const icon = depth === 0 ? '🔰' : '└─'

    lines.push(`${indentStr}${icon} ${proc.pid} ${proc.name} (CPU: ${proc.cpu.toFixed(1)}%, MEM: ${proc.memory.toFixed(1)}%)`)

    for (const child of node.children) {
      printNode(child, depth + 1)
    }
  }

  for (const node of tree) {
    printNode(node, 0)
  }

  return lines.join('\n')
}

/**
 * Find process by name
 */
export async function findProcessesByName(name: string, exact: boolean = false): Promise<ProcessInfo[]> {
  const all = await listProcesses('name')
  const lowerName = name.toLowerCase()

  return all.filter(proc => {
    if (exact) {
      return proc.name.toLowerCase() === lowerName
    }
    return proc.name.toLowerCase().includes(lowerName)
  })
}

/**
 * Check if process exists
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Wait for process to exit
 */
export async function waitForProcess(pid: number, timeout?: number): Promise<boolean> {
  return new Promise((resolve) => {
    const check = () => {
      try {
        process.kill(pid, 0)
        // Still running
        if (timeout && Date.now() > timeout) {
          resolve(false)
        } else {
          setTimeout(check, 100)
        }
      } catch {
        // Process exited
        resolve(true)
      }
    }

    check()
  })
}
