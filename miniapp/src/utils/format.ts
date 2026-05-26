export function formatBytes(bytes: number) {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const factor = 1024
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(factor)), units.length - 1)
  return `${(bytes / Math.pow(factor, index)).toFixed(index === 1 ? 2 : 0)} ${units[index]}`
}

export function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}
