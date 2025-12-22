export function useFormatters() {
  const formatNumber = (n: number): string => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  const timeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `hace ${days}d`
    if (hrs > 0) return `hace ${hrs}h`
    if (mins > 0) return `hace ${mins}m`
    return 'ahora'
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatKDA = (kills: number, deaths: number, assists: number): string => {
    if (deaths === 0) return 'Perfect'
    return ((kills + assists) / deaths).toFixed(2)
  }

  const formatWinRate = (wins: number, losses: number): string => {
    const total = wins + losses
    if (total === 0) return '0%'
    return ((wins / total) * 100).toFixed(0) + '%'
  }

  const formatCS = (cs: number, duration: number): string => {
    const minutes = duration / 60
    const csPerMin = cs / minutes
    return `${cs} (${csPerMin.toFixed(1)}/m)`
  }

  return {
    formatNumber,
    timeAgo,
    formatDuration,
    formatKDA,
    formatWinRate,
    formatCS
  }
}
