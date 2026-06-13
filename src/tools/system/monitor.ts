import { cpus, totalmem, freemem, networkInterfaces } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface TimeSeriesData {
  timestamps: number[]
  values: number[]
}

export interface MonitorData {
  cpu: TimeSeriesData
  memory: TimeSeriesData
  diskIO: TimeSeriesData
  networkIO: TimeSeriesData
}

export interface CurrentMetrics {
  cpu: number
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  diskIO: {
    read: number
    write: number
  }
  networkIO: {
    rx: number
    tx: number
  }
}

/**
 * Get current CPU usage
 */
export async function cpuUsage(interval: number = 1000): Promise<number> {
  try {
    const cpuList = cpus()

    // Get initial CPU times
    const getTimes = () => {
      return cpuList.reduce(
        (acc, cpu) => {
          const t = cpu.times
          return {
            total: acc.total + t.user + t.nice + t.sys + t.idle + t.irq,
            idle: acc.idle + t.idle,
          }
        },
        { total: 0, idle: 0 }
      )
    }

    const start = getTimes()
    await new Promise(resolve => setTimeout(resolve, interval))
    const end = getTimes()

    const totalDiff = end.total - start.total
    const idleDiff = end.idle - start.idle

    if (totalDiff === 0) return 0

    return Math.round(((totalDiff - idleDiff) / totalDiff) * 100 * 10) / 10
  } catch {
    return 0
  }
}

/**
 * Get current memory usage
 */
export async function memoryUsage(): Promise<{ total: number; used: number; free: number; usagePercent: number }> {
  const total = totalmem()
  const free = freemem()
  const used = total - free

  return {
    total,
    used,
    free,
    usagePercent: Math.round((used / total) * 100 * 10) / 10,
  }
}

/**
 * Get disk I/O statistics
 */
export async function diskIO(): Promise<{ read: number; write: number }> {
  try {
    if (process.platform === 'linux') {
      const { stdout } = await execAsync('cat /proc/diskstats 2>/dev/null | awk \'{read+=$5; write+=$9} END {print read, write}\'')
      const [read, write] = stdout.trim().split(/\s+/).map(Number)
      return { read: read || 0, write: write || 0 }
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('iostat -d -x 1 2 2>/dev/null | tail -n +4 | awk \'{read+=$4; write+=$5} END {print read, write}\'')
      const [read, write] = stdout.trim().split(/\s+/).map(Number)
      return { read: read || 0, write: write || 0 }
    }
  } catch {
    // Fallback to simple check
  }

  return { read: 0, write: 0 }
}

/**
 * Get network I/O statistics
 */
export async function networkIO(): Promise<{ rx: number; tx: number }> {
  try {
    if (process.platform === 'linux') {
      const { stdout } = await execAsync('cat /proc/net/dev 2>/dev/null | tail -n +3 | awk \'{rx+=$2; tx+=$10} END {print rx, tx}\'')
      const [rx, tx] = stdout.trim().split(/\s+/).map(Number)
      return { rx: rx || 0, tx: tx || 0 }
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('netstat -ib 2>/dev/null | tail -n +3 | awk \'{rx+=$7; tx+=$10} END {print rx, tx}\'')
      const [rx, tx] = stdout.trim().split(/\s+/).map(Number)
      return { rx: rx || 0, tx: tx || 0 }
    }
  } catch {
    // Fallback
  }

  return { rx: 0, tx: 0 }
}

/**
 * Collect all metrics at once
 */
export async function collectMetrics(): Promise<CurrentMetrics> {
  const [cpu, memory, disk, network] = await Promise.all([
    cpuUsage(1000),
    memoryUsage(),
    diskIO(),
    networkIO(),
  ])

  return {
    cpu,
    memory,
    diskIO: disk,
    networkIO: network,
  }
}

/**
 * Monitor class for continuous monitoring
 */
export class SystemMonitor {
  private intervalId: NodeJS.Timeout | null = null
  private historySize: number
  private cpuHistory: TimeSeriesData
  private memoryHistory: TimeSeriesData
  private diskIOHistory: TimeSeriesData
  private networkIOHistory: TimeSeriesData
  private callbacks: Array<(metrics: CurrentMetrics) => void> = []
  private running: boolean = false

  constructor(historySize: number = 60) {
    this.historySize = historySize
    this.cpuHistory = { timestamps: [], values: [] }
    this.memoryHistory = { timestamps: [], values: [] }
    this.diskIOHistory = { timestamps: [], values: [] }
    this.networkIOHistory = { timestamps: [], values: [] }
  }

  /**
   * Start monitoring
   */
  async start(intervalMs: number = 2000): Promise<void> {
    if (this.running) return

    this.running = true

    // Collect initial baseline
    const baseline = await collectMetrics()
    this.cpuHistory.values.push(baseline.cpu)
    this.cpuHistory.timestamps.push(Date.now())

    this.memoryHistory.values.push(baseline.memory.usagePercent)
    this.memoryHistory.timestamps.push(Date.now())

    this.diskIOHistory.values.push(baseline.diskIO.read + baseline.diskIO.write)
    this.diskIOHistory.timestamps.push(Date.now())

    this.networkIOHistory.values.push(baseline.networkIO.rx + baseline.networkIO.tx)
    this.networkIOHistory.timestamps.push(Date.now())

    // Start periodic collection
    this.intervalId = setInterval(async () => {
      try {
        const metrics = await collectMetrics()
        const now = Date.now()

        // Update CPU history
        this.cpuHistory.values.push(metrics.cpu)
        this.cpuHistory.timestamps.push(now)
        if (this.cpuHistory.values.length > this.historySize) {
          this.cpuHistory.values.shift()
          this.cpuHistory.timestamps.shift()
        }

        // Update memory history
        this.memoryHistory.values.push(metrics.memory.usagePercent)
        this.memoryHistory.timestamps.push(now)
        if (this.memoryHistory.values.length > this.historySize) {
          this.memoryHistory.values.shift()
          this.memoryHistory.timestamps.shift()
        }

        // Update disk I/O history
        this.diskIOHistory.values.push(metrics.diskIO.read + metrics.diskIO.write)
        this.diskIOHistory.timestamps.push(now)
        if (this.diskIOHistory.values.length > this.historySize) {
          this.diskIOHistory.values.shift()
          this.diskIOHistory.timestamps.shift()
        }

        // Update network I/O history
        this.networkIOHistory.values.push(metrics.networkIO.rx + metrics.networkIO.tx)
        this.networkIOHistory.timestamps.push(now)
        if (this.networkIOHistory.values.length > this.historySize) {
          this.networkIOHistory.values.shift()
          this.networkIOHistory.timestamps.shift()
        }

        // Notify callbacks
        for (const callback of this.callbacks) {
          try {
            callback(metrics)
          } catch {
            // Ignore callback errors
          }
        }
      } catch {
        // Ignore collection errors
      }
    }, intervalMs)
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.running = false
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: (metrics: CurrentMetrics) => void): () => void {
    this.callbacks.push(callback)
    return () => {
      const idx = this.callbacks.indexOf(callback)
      if (idx !== -1) {
        this.callbacks.splice(idx, 1)
      }
    }
  }

  /**
   * Get current history
   */
  getHistory(): MonitorData {
    return {
      cpu: { ...this.cpuHistory },
      memory: { ...this.memoryHistory },
      diskIO: { ...this.diskIOHistory },
      networkIO: { ...this.networkIOHistory },
    }
  }

  /**
   * Get latest metrics
   */
  getLatest(): CurrentMetrics | null {
    if (this.cpuHistory.values.length === 0) return null

    return {
      cpu: this.cpuHistory.values[this.cpuHistory.values.length - 1],
      memory: {
        total: 0, // Would need to store these separately
        used: 0,
        free: 0,
        usagePercent: this.memoryHistory.values[this.memoryHistory.values.length - 1],
      },
      diskIO: {
        read: 0,
        write: this.diskIOHistory.values[this.diskIOHistory.values.length - 1],
      },
      networkIO: {
        rx: 0,
        tx: this.networkIOHistory.values[this.networkIOHistory.values.length - 1],
      },
    }
  }

  /**
   * Check if monitoring is active
   */
  isRunning(): boolean {
    return this.running
  }
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: CurrentMetrics): string {
  const lines: string[] = []
  const now = new Date().toLocaleTimeString()

  lines.push(`\x1b[1m📊 System Metrics [${now}]\x1b[0m`)
  lines.push('')

  // CPU
  const cpuColor = metrics.cpu > 80 ? 'red' : metrics.cpu > 50 ? 'yellow' : 'green'
  lines.push(`CPU:  \x1b[${cpuColor === 'red' ? '31m' : cpuColor === 'yellow' ? '33m' : '32m'}${metrics.cpu.toFixed(1)}%\x1b[0m ${renderBar(metrics.cpu, 100)}`)

  // Memory
  const memColor = metrics.memory.usagePercent > 80 ? 'red' : metrics.memory.usagePercent > 50 ? 'yellow' : 'green'
  lines.push(`Mem:  \x1b[${memColor === 'red' ? '31m' : memColor === 'yellow' ? '33m' : '32m'}${metrics.memory.usagePercent.toFixed(1)}%\x1b[0m ${renderBar(metrics.memory.usagePercent, 100)}`)
  lines.push(`      ${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`)

  // Disk I/O
  const diskTotal = metrics.diskIO.read + metrics.diskIO.write
  lines.push(`Disk: \x1b[36mR: ${formatBytes(metrics.diskIO.read)}/s\x1b[0m \x1b[35mW: ${formatBytes(metrics.diskIO.write)}/s\x1b[0m`)

  // Network I/O
  lines.push(`Net:  \x1b[32mRX: ${formatBytes(metrics.networkIO.rx)}/s\x1b[0m \x1b[31mTX: ${formatBytes(metrics.networkIO.tx)}/s\x1b[0m`)

  return lines.join('\n')
}

/**
 * Render a simple text progress bar
 */
function renderBar(value: number, max: number, width: number = 20): string {
  const filled = Math.round((value / max) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Create a simple monitor that collects data once
 */
export async function quickMonitor(samples: number = 5, interval: number = 1000): Promise<MonitorData> {
  const monitor = new SystemMonitor(samples)

  await monitor.start(interval)

  // Wait for samples
  await new Promise(resolve => setTimeout(resolve, interval * samples))

  monitor.stop()

  return monitor.getHistory()
}
