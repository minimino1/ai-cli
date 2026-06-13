import { Box, Text } from 'ink'
import { Command, CommandContext } from '../types'
import { getSystemInfo, formatSystemInfo } from '../tools/system/info'
import { topProcesses, killProcess, listProcesses } from '../tools/system/process'
import { getDisk, getMemory } from '../tools/system/info'
import { getUptime } from '../tools/system/info'
import { getNetwork } from '../tools/system/info'
import { SystemMonitor, formatMetrics } from '../tools/system/monitor'

/**
 * /sysinfo - Full system information
 */
export const sysinfoCommand: Command = {
  name: 'sysinfo',
  description: 'Display full system information',
  aliases: ['info', 'system'],
  run: async (args, context) => {
    const info = await getSystemInfo()
    return [{ type: 'text', text: formatSystemInfo(info) }]
  },
}

/**
 * /top [n] - Top N processes by CPU
 */
export const topCommand: Command = {
  name: 'top',
  description: 'Show top processes (default: 10)',
  aliases: ['ps'],
  args: ['[n]'],
  run: async (args, context) => {
    const n = parseInt(args) || 10
    const sortBy = args.includes('mem') ? 'memory' : 'cpu'
    const processes = await topProcesses(n, sortBy)

    const lines: string[] = []
    lines.push('\x1b[1mPID     USER       NAME         %CPU   %MEM\x1b[0m')
    lines.push('\x1b[90m' + '─'.repeat(50) + '\x1b[0m')

    for (const proc of processes) {
      lines.push(
        `${String(proc.pid).padStart(7)} ` +
        `${proc.user.padEnd(10)} ` +
        `${proc.name.padEnd(12)} ` +
        `${String(proc.cpu.toFixed(1)).padStart(5)} ` +
        `${String(proc.memory.toFixed(1)).padStart(5)}`
      )
    }

    return [{ type: 'text', text: lines.join('\n') }]
  },
}

/**
 * /kill <pid> [signal] - Kill a process
 */
export const killCommand: Command = {
  name: 'kill',
  description: 'Kill a process by PID',
  aliases: ['killproc'],
  args: ['<pid>', '[signal]'],
  run: async (args, context) => {
    const parts = args.split(/\s+/)
    const pid = parseInt(parts[0])
    const signal = parts[1] || 'SIGTERM'

    if (!pid || isNaN(pid)) {
      return [{ type: 'text', text: '\x1b[31mError: Invalid PID\x1b[0m' }]
    }

    const result = await killProcess(pid, signal)

    if (result.success) {
      return [{ type: 'text', text: `\x1b[32mProcess ${pid} terminated\x1b[0m` }]
    } else {
      return [{ type: 'text', text: `\x1b[31mError: ${result.error}\x1b[0m` }]
    }
  },
}

/**
 * /df - Disk usage
 */
export const dfCommand: Command = {
  name: 'df',
  description: 'Show disk usage',
  aliases: ['disks', 'mounts'],
  run: async (args, context) => {
    const disks = await getDisk()

    const lines: string[] = []
    lines.push('\x1b[1mFilesystem      Size   Used  Avail Use% Mounted on\x1b[0m')
    lines.push('\x1b[90m' + '─'.repeat(60) + '\x1b[0m')

    for (const disk of disks) {
      const sizeGB = (disk.total / (1024 ** 3)).toFixed(1)
      const usedGB = (disk.used / (1024 ** 3)).toFixed(1)
      const availGB = (disk.free / (1024 ** 3)).toFixed(1)

      lines.push(
        `${disk.device.padEnd(15)} ` +
        `${sizeGB.padStart(6)}G ` +
        `${usedGB.padStart(5)}G ` +
        `${availGB.padStart(5)}G ` +
        `${String(disk.usagePercent).padStart(4)}% ` +
        `${disk.mountPoint}`
      )
    }

    return [{ type: 'text', text: lines.join('\n') }]
  },
}

/**
 * /free - Memory usage
 */
export const freeCommand: Command = {
  name: 'free',
  description: 'Show memory usage',
  aliases: ['mem', 'memory'],
  run: async (args, context) => {
    const memory = await getMemory()

    const lines: string[] = []
    lines.push('\x1b[1m              Total        Used        Free      Usage%\x1b[0m')
    lines.push('\x1b[90m' + '─'.repeat(60) + '\x1b[0m')

    const totalGB = (memory.total / (1024 ** 3)).toFixed(2)
    const usedGB = (memory.used / (1024 ** 3)).toFixed(2)
    const freeGB = (memory.free / (1024 ** 3)).toFixed(2)

    lines.push(
      `\x1b[36mMemory:\x1b[0m  ${totalGB.padStart(8)}G   ${usedGB.padStart(8)}G   ${freeGB.padStart(8)}G   ${memory.usagePercent}%`
    )

    if (memory.swapTotal > 0) {
      const swapTotalGB = (memory.swapTotal / (1024 ** 3)).toFixed(2)
      const swapUsedGB = (memory.swapUsed / (1024 ** 3)).toFixed(2)
      const swapFreeGB = (memory.swapFree / (1024 ** 3)).toFixed(2)
      const swapPercent = memory.swapTotal > 0 ? Math.round((memory.swapUsed / memory.swapTotal) * 100) : 0

      lines.push(
        `\x1b[36mSwap:\x1b[0m    ${swapTotalGB.padStart(8)}G   ${swapUsedGB.padStart(8)}G   ${swapFreeGB.padStart(8)}G   ${swapPercent}%`
      )
    }

    return [{ type: 'text', text: lines.join('\n') }]
  },
}

/**
 * /uptime - System uptime
 */
export const uptimeCommand: Command = {
  name: 'uptime',
  description: 'Show system uptime',
  aliases: ['up'],
  run: async (args, context) => {
    const uptimeInfo = await getUptime()

    return [
      {
        type: 'text',
        text: `\x1b[1mSystem Uptime:\x1b[0m ${uptimeInfo.formatted}`,
      },
    ]
  },
}

/**
 * /netstat - Network interfaces
 */
export const netstatCommand: Command = {
  name: 'netstat',
  description: 'Show network interfaces',
  aliases: ['ifconfig', 'interfaces'],
  run: async (args, context) => {
    const interfaces = await getNetwork()

    const lines: string[] = []
    lines.push('\x1b[1mInterface   IP Address        MAC Address       Status\x1b[0m')
    lines.push('\x1b[90m' + '─'.repeat(60) + '\x1b[0m')

    for (const iface of interfaces) {
      const status = iface.isUp ? '\x1b[32mUP\x1b[0m' : '\x1b[31mDOWN\x1b[0m'
      lines.push(
        `${iface.name.padEnd(12)} ` +
        `${iface.ip.padEnd(17)} ` +
        `${iface.mac.padEnd(18)} ` +
        status
      )
    }

    return [{ type: 'text', text: lines.join('\n') }]
  },
}

/**
 * /monitor [interval] - Real-time system monitoring
 */
export const monitorCommand: Command = {
  name: 'monitor',
  description: 'Real-time system monitoring',
  aliases: ['mon', 'stats'],
  args: ['[interval]'],
  run: async (args, context) => {
    const interval = parseInt(args) || 2000

    // Create monitor
    const monitor = new SystemMonitor(30)

    // Start monitoring
    await monitor.start(interval)

    // Return initial metrics
    const latest = monitor.getLatest()
    const formatted = formatMetrics(latest!)

    return [
      {
        type: 'text',
        text: `\x1b[1mReal-time Monitoring (${interval}ms interval)\x1b[0m\n\n${formatted}\n\nPress Ctrl+C to stop.`,
      },
    ]
  },
}

/**
 * /ps - List all processes
 */
export const psCommand: Command = {
  name: 'ps',
  description: 'List all processes',
  aliases: ['processes'],
  args: ['[sort]'],
  run: async (args, context) => {
    const sortBy = args === 'mem' ? 'memory' : 'cpu'
    const processes = await listProcesses(sortBy)

    const lines: string[] = []
    lines.push('\x1b[1mPID    USER       NAME         %CPU   %MEM   STATE\x1b[0m')
    lines.push('\x1b[90m' + '─'.repeat(60) + '\x1b[0m')

    for (const proc of processes.slice(0, 30)) {
      lines.push(
        `${String(proc.pid).padStart(6)} ` +
        `${proc.user.padEnd(10)} ` +
        `${proc.name.padEnd(12)} ` +
        `${String(proc.cpu.toFixed(1)).padStart(5)} ` +
        `${String(proc.memory.toFixed(1)).padStart(5)} ` +
        `${proc.state || '?'}`
      )
    }

    return [{ type: 'text', text: lines.join('\n') }]
  },
}

/**
 * /tree - Process tree
 */
export const pstreeCommand: Command = {
  name: 'pstree',
  description: 'Show process tree',
  aliases: ['ptree'],
  run: async (args, context) => {
    const tree = await (await import('../tools/system/process')).treeProcesses()
    const { formatProcessTree } = await import('../tools/system/process')

   return [{ type: 'text', text: formatProcessTree(tree) }]
   },
 }

// Export all system commands as an array
export const systemCommands: Command[] = [
  sysinfoCommand,
  topCommand,
  killCommand,
  dfCommand,
  freeCommand,
  uptimeCommand,
  netstatCommand,
  monitorCommand,
  psCommand,
  pstreeCommand,
]
