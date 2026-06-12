import { exec } from 'child_process'
import { promisify } from 'util'
import { platform } from 'os'
import { cpus, totalmem, freemem, networkInterfaces, uptime, arch, release } from 'os'
import { constants } from 'fs'

const execAsync = promisify(exec)

export interface OSInfo {
  name: string
  version: string
  arch: string
  kernel: string
  platform: string
}

export interface CPUInfo {
  model: string
  cores: number
  speed: number // in MHz
  usage: number // percentage
  manufacturer: string
}

export interface MemoryInfo {
  total: number
  free: number
  used: number
  swapTotal: number
  swapFree: number
  swapUsed: number
  usagePercent: number
}

export interface DiskInfo {
  mountPoint: string
  device: string
  total: number
  free: number
  used: number
  usagePercent: number
  fsType: string
}

export interface NetworkInterface {
  name: string
  ip: string
  mac: string
  isUp: boolean
}

export interface ProcessInfo {
  pid: number
  name: string
  user: string
  cpu: number
  memory: number
  command?: string
}

export interface SystemInfo {
  os: OSInfo
  cpu: CPUInfo
  memory: MemoryInfo
  disks: DiskInfo[]
  network: NetworkInterface[]
  uptime: number
  uptimeFormatted: string
  processes: number
  loadAvg: number[]
}

/**
 * Get OS information
 */
export async function getOS(): Promise<OSInfo> {
  const osPlatform = platform()
  const osArch = arch()
  const osRelease = release()

  let name = osPlatform
  let version = osRelease

  // Try to get more detailed OS info
  try {
    if (osPlatform === 'linux') {
      // Try to get distribution info
      try {
        const { stdout } = await execAsync('cat /etc/os-release 2>/dev/null || cat /etc/issue 2>/dev/null | head -1')
        const prettyNameMatch = stdout.match(/PRETTY_NAME="([^"]+)"/)
        if (prettyNameMatch) {
          name = prettyNameMatch[1]
        } else {
          const distro = stdout.split('\n')[0]?.trim()
          if (distro) name = distro
        }
      } catch {
        // Use default
      }
    } else if (osPlatform === 'darwin') {
      const { stdout } = await execAsync('sw_vers -productName 2>/dev/null')
      name = stdout.trim()
      const { stdout: versionStdout } = await execAsync('sw_vers -productVersion 2>/dev/null')
      version = versionStdout.trim()
    } else if (osPlatform === 'win32') {
      const { stdout } = await execAsync('ver 2>/dev/null')
      version = stdout.trim()
    }
  } catch {
    // Use defaults
  }

  // Get kernel version
  let kernel = osRelease
  if (osPlatform === 'linux') {
    try {
      const { stdout } = await execAsync('uname -r 2>/dev/null')
      kernel = stdout.trim()
    } catch {
      kernel = osRelease
    }
  }

  return {
    name,
    version,
    arch: osArch,
    kernel,
    platform: osPlatform,
  }
}

/**
 * Get CPU information
 */
export async function getCPU(): Promise<CPUInfo> {
  const cpuList = cpus()

  if (cpuList.length === 0) {
    return {
      model: 'Unknown',
      cores: 0,
      speed: 0,
      usage: 0,
      manufacturer: 'Unknown',
    }
  }

  // Get model from first CPU (they're usually identical)
  const firstCpu = cpuList[0]
  const model = firstCpu.model || 'Unknown'

  // Try to get manufacturer
  let manufacturer = 'Unknown'
  if (model.includes('Intel')) {
    manufacturer = 'Intel'
  } else if (model.includes('AMD')) {
    manufacturer = 'AMD'
  } else if (model.includes('Apple')) {
    manufacturer = 'Apple'
  } else if (model.includes('ARM')) {
    manufacturer = 'ARM'
  }

  // Calculate average speed
  const speeds = cpuList.map(c => c.speed || 0)
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length

  // Get CPU usage (requires sampling)
  const usage = await getCPUUsage()

  return {
    model,
    cores: cpuList.length,
    speed: Math.round(avgSpeed),
    usage,
    manufacturer,
  }
}

/**
 * Get CPU usage percentage
 */
async function getCPUUsage(): Promise<number> {
  try {
    const cpuList = cpus()
    const totalTicks = cpuList.reduce((sum, cpu) => {
      const times = cpu.times
      return sum + times.user + times.nice + times.sys + times.idle + times.irq
    }, 0)

    // Simple approximation based on idle time
    const idleTicks = cpuList.reduce((sum, cpu) => sum + cpu.times.idle, 0)
    const total = totalTicks - idleTicks
    const totalAll = totalTicks

    if (totalAll === 0) return 0
    return Math.round((total / totalAll) * 100 * 10) / 10
  } catch {
    return 0
  }
}

/**
 * Get memory information
 */
export async function getMemory(): Promise<MemoryInfo> {
  const total = totalmem()
  const free = freemem()
  const used = total - free

  // Get swap info
  let swapTotal = 0
  let swapFree = 0

  try {
    if (platform() === 'linux') {
      const { stdout } = await execAsync('grep -E "^SwapTotal:|^SwapFree:" /proc/meminfo')
      const lines = stdout.split('\n')
      for (const line of lines) {
        if (line.startsWith('SwapTotal:')) {
          swapTotal = parseInt(line.split(/\s+/)[1]) * 1024
        } else if (line.startsWith('SwapFree:')) {
          swapFree = parseInt(line.split(/\s+/)[1]) * 1024
        }
      }
    } else if (platform() === 'darwin') {
      const { stdout } = await execAsync('sysctl -n vm.swapusage 2>/dev/null')
      const match = stdout.match(/total = (\d+) M.*free = (\d+) M/)
      if (match) {
        swapTotal = parseInt(match[1]) * 1024 * 1024
        swapFree = parseInt(match[2]) * 1024 * 1024
      }
    }
  } catch {
    // Swap not available
  }

  const swapUsed = swapTotal - swapFree

  return {
    total,
    free,
    used,
    swapTotal,
    swapFree,
    swapUsed,
    usagePercent: Math.round((used / total) * 100 * 10) / 10,
  }
}

/**
 * Get disk information
 */
export async function getDisk(): Promise<DiskInfo[]> {
  const disks: DiskInfo[] = []

  try {
    if (platform() === 'linux') {
      // Parse /proc/mounts
      const { stdout } = await execAsync('cat /proc/mounts')
      const lines = stdout.split('\n').filter(l => l && !l.startsWith('#'))

      for (const line of lines) {
        const parts = line.split(' ')
        if (parts.length < 3) continue

        const [device, mountPoint, fsType] = parts

        // Skip special filesystems
        if (fsType === 'tmpfs' || fsType === 'devtmpfs' || fsType === 'squashfs' || fsType === 'ramfs') {
          continue
        }

        try {
          const { stdout: dfOutput } = await execAsync(`df -k "${mountPoint}" 2>/dev/null`)
          const dfLines = dfOutput.split('\n')
          if (dfLines.length >= 2) {
            const stats = dfLines[1].trim().split(/\s+/)
            if (stats.length >= 4) {
              const totalKb = parseInt(stats[1])
              const freeKb = parseInt(stats[3])
              const usedKb = totalKb - freeKb

              disks.push({
                mountPoint,
                device,
                total: totalKb * 1024,
                free: freeKb * 1024,
                used: usedKb * 1024,
                usagePercent: Math.round((usedKb / totalKb) * 100 * 10) / 10,
                fsType,
              })
            }
          }
        } catch {
          // Skip this mount
        }
      }
    } else if (platform() === 'darwin') {
      const { stdout } = await execAsync('df -k / 2>/dev/null')
      const lines = stdout.split('\n')
      if (lines.length >= 2) {
        const stats = lines[1].trim().split(/\s+/)
        if (stats.length >= 4) {
          const totalKb = parseInt(stats[1])
          const freeKb = parseInt(stats[3])
          const usedKb = totalKb - freeKb

          disks.push({
            mountPoint: '/',
            device: stats[0],
            total: totalKb * 1024,
            free: freeKb * 1024,
            used: usedKb * 1024,
            usagePercent: Math.round((usedKb / totalKb) * 100 * 10) / 10,
            fsType: 'apfs',
          })
        }
      }
    }
  } catch {
    // Fallback to basic info
  }

  return disks
}

/**
 * Get network interfaces
 */
export async function getNetwork(): Promise<NetworkInterface[]> {
  const interfaces: NetworkInterface[] = []

  try {
    const nets = networkInterfaces()

    for (const [name, addrs] of Object.entries(nets)) {
      if (!addrs) continue

      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          interfaces.push({
            name,
            ip: addr.address,
            mac: addr.mac || 'Unknown',
            isUp: true,
          })
        }
      }
    }
  } catch {
    // Fallback to command line
    try {
      const { stdout } = await execAsync('ip addr show 2>/dev/null | grep "inet " | head -5')
      const lines = stdout.split('\n').filter(l => l.trim())

      for (const line of lines) {
        const match = line.match(/inet (\d+\.\d+\.\d+\.\d+)\/\d+.*?(\S+)$/)
        if (match) {
          interfaces.push({
            name: match[2],
            ip: match[1],
            mac: 'Unknown',
            isUp: true,
          })
        }
      }
    } catch {
      // No network info available
    }
  }

  return interfaces
}

/**
 * Get system uptime
 */
export async function getUptime(): Promise<{ seconds: number; formatted: string }> {
  const seconds = uptime()

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  let formatted = []
  if (days > 0) formatted.push(`${days}d`)
  if (hours > 0) formatted.push(`${hours}h`)
  if (minutes > 0) formatted.push(`${minutes}m`)
  formatted.push(`${secs}s`)

  return {
    seconds,
    formatted: formatted.join(' '),
  }
}

/**
 * Get top processes by CPU or memory
 */
export async function getProcesses(sortBy: 'cpu' | 'memory' = 'cpu', limit: number = 10): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = []

  try {
    // Use ps to get process info
    const sortField = sortBy === 'cpu' ? '-pcpu' : '-pmem'
    const { stdout } = await execAsync(`ps -eo pid,comm,user,pcpu,pmem ${sortField} | head -${limit + 1}`)

    const lines = stdout.split('\n').filter(l => l.trim())
    // Skip header
    const dataLines = lines.slice(1, limit + 1)

    for (const line of dataLines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 5) {
        processes.push({
          pid: parseInt(parts[0]),
          name: parts[1],
          user: parts[2],
          cpu: parseFloat(parts[3]),
          memory: parseFloat(parts[4]),
        })
      }
    }
  } catch {
    // Try alternative approach
    try {
      const { stdout } = await execAsync('ps -A -o pid,comm,%cpu,%mem | tail -n +2 | sort -nrk3 | head -10')
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

  return processes
}

/**
 * Get full system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const [os, cpu, memory, disks, network, uptimeInfo, processList] = await Promise.all([
    getOS(),
    getCPU(),
    getMemory(),
    getDisk(),
    getNetwork(),
    getUptime(),
    getProcesses('cpu', 10),
  ])

  return {
    os,
    cpu,
    memory,
    disks,
    network,
    uptime: uptimeInfo.seconds,
    uptimeFormatted: uptimeInfo.formatted,
    processes: processList.length,
    loadAvg: platform() === 'win32' ? [0, 0, 0] : (() => {
      try {
        const { stdout } = execSync('cat /proc/loadavg 2>/dev/null || uptime')
        const match = stdout.toString().match(/(\d+\.\d+)/g)
        return match ? match.slice(0, 3).map(Number) : [0, 0, 0]
      } catch {
        return [0, 0, 0]
      }
    })(),
  }
}

/**
 * Format system info for display
 */
export function formatSystemInfo(info: SystemInfo): string {
  const lines: string[] = []
  lines.push('\x1b[1m🖥️  System Information\x1b[0m')
  lines.push('')

  // OS
  lines.push('\x1b[36mOS:\x1b[0m')
  lines.push(`  Name: ${info.os.name}`)
  lines.push(`  Version: ${info.os.version}`)
  lines.push(`  Kernel: ${info.os.kernel}`)
  lines.push(`  Architecture: ${info.os.arch}`)
  lines.push('')

  // CPU
  lines.push('\x1b[36mCPU:\x1b[0m')
  lines.push(`  Model: ${info.cpu.model}`)
  lines.push(`  Cores: ${info.cpu.cores}`)
  lines.push(`  Speed: ${info.cpu.speed} MHz`)
  lines.push(`  Usage: ${info.cpu.usage}%`)
  lines.push(`  Manufacturer: ${info.cpu.manufacturer}`)
  lines.push('')

  // Memory
  lines.push('\x1b[36mMemory:\x1b[0m')
  lines.push(`  Total: ${formatBytes(info.memory.total)}`)
  lines.push(`  Used: ${formatBytes(info.memory.used)} (${info.memory.usagePercent}%)`)
  lines.push(`  Free: ${formatBytes(info.memory.free)}`)
  if (info.memory.swapTotal > 0) {
    lines.push(`  Swap: ${formatBytes(info.memory.swapUsed)} / ${formatBytes(info.memory.swapTotal)}`)
  }
  lines.push('')

  // Disks
  if (info.disks.length > 0) {
    lines.push('\x1b[36mDisk:\x1b[0m')
    for (const disk of info.disks) {
      lines.push(`  ${disk.mountPoint} (${disk.device}): ${formatBytes(disk.used)} / ${formatBytes(disk.total)} (${disk.usagePercent}%) [${disk.fsType}]`)
    }
    lines.push('')
  }

  // Network
  if (info.network.length > 0) {
    lines.push('\x1b[36mNetwork:\x1b[0m')
    for (const net of info.network) {
      lines.push(`  ${net.name}: ${net.ip} (MAC: ${net.mac})`)
    }
    lines.push('')
  }

  // Uptime & Load
  lines.push('\x1b[36mUptime & Load:\x1b[0m')
  lines.push(`  Uptime: ${info.uptimeFormatted}`)
  if (info.loadAvg[0] > 0) {
    lines.push(`  Load Average: ${info.loadAvg.map(l => l.toFixed(2)).join(', ')}`)
  }
  lines.push(`  Processes: ${info.processes}`)
  lines.push('')

  // Top processes
  if (processList.length > 0) {
    lines.push('\x1b[36mTop Processes:\x1b[0m')
    for (const proc of processList) {
      lines.push(`  ${proc.pid} ${proc.name.padEnd(20)} CPU:${proc.cpu.toFixed(1)}% MEM:${proc.memory.toFixed(1)}% (${proc.user})`)
    }
  }

  return lines.join('\n')
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Import for sync version
import { execSync } from 'child_process'

/**
 * Sync version of getOS
 */
export function getOSSync(): OSInfo {
  const osPlatform = platform()
  const osArch = arch()
  const osRelease = release()

  let name = osPlatform
  let version = osRelease

  try {
    if (osPlatform === 'linux') {
      try {
        const stdout = execSync('cat /etc/os-release 2>/dev/null || cat /etc/issue 2>/dev/null | head -1').toString()
        const prettyNameMatch = stdout.match(/PRETTY_NAME="([^"]+)"/)
        if (prettyNameMatch) {
          name = prettyNameMatch[1]
        } else {
          const distro = stdout.split('\n')[0]?.trim()
          if (distro) name = distro
        }
      } catch {
        // Use default
      }
    }
  } catch {
    // Use defaults
  }

  return {
    name,
    version,
    arch: osArch,
    kernel: osRelease,
    platform: osPlatform,
  }
}

/**
 * Sync version of getMemory
 */
export function getMemorySync(): MemoryInfo {
  const total = totalmem()
  const free = freemem()
  const used = total - free

  return {
    total,
    free,
    used,
    swapTotal: 0,
    swapFree: 0,
    swapUsed: 0,
    usagePercent: Math.round((used / total) * 100 * 10) / 10,
  }
}

/**
 * Sync version of getUptime
 */
export function getUptimeSync(): { seconds: number; formatted: string } {
  const seconds = uptime()

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  let formatted = []
  if (days > 0) formatted.push(`${days}d`)
  if (hours > 0) formatted.push(`${hours}h`)
  if (minutes > 0) formatted.push(`${minutes}m`)
  formatted.push(`${secs}s`)

  return {
    seconds,
    formatted: formatted.join(' '),
  }
}
