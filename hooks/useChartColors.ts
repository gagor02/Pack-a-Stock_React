import { useUIStore } from '@/store/uiStore'

export function useChartColors() {
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  return {
    grid:           isDark ? '#1e293b' : '#e5e7eb',
    tick:           isDark ? '#64748b' : '#9ca3af',
    tooltipBg:      isDark ? '#0f172a' : '#ffffff',
    tooltipBorder:  isDark ? '#334155' : '#e5e7eb',
    tooltipText:    isDark ? '#f1f5f9' : '#111827',
    tooltipStyle: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      border:          `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
      borderRadius:    '12px',
      color:           isDark ? '#f1f5f9' : '#111827',
    } as React.CSSProperties,
  }
}
