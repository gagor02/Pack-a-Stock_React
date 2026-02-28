'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import api from '@/lib/api'
import {
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: number
  action: string
  action_label: string
  table_name: string | null
  table_label: string | null
  record_id: number | null
  changes: Record<string, { old: any; new: any } | any> | null
  description: string | null
  user_name: string
  ip_address: string | null
  created_at: string
}

// ── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  login:              { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   dot: 'bg-blue-400' },
  logout:             { color: 'text-gray-400',    bg: 'bg-gray-500/10 border-gray-500/20',   dot: 'bg-gray-400' },
  create:             { color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20', dot: 'bg-green-400' },
  update:             { color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
  delete:             { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     dot: 'bg-red-400' },
  approve:            { color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20', dot: 'bg-green-400' },
  reject:             { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     dot: 'bg-red-400' },
  loan_issue:         { color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400' },
  loan_return:        { color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/20',   dot: 'bg-teal-400' },
  extension_request:  { color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400' },
  extension_approved: { color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20', dot: 'bg-green-400' },
  extension_rejected: { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     dot: 'bg-red-400' },
  material_consume:   { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  stock_update:       { color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20',   dot: 'bg-cyan-400' },
}

const ALL_ACTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'login', label: 'Inicio de sesión' },
  { value: 'logout', label: 'Cierre de sesión' },
  { value: 'create', label: 'Crear' },
  { value: 'update', label: 'Actualizar' },
  { value: 'delete', label: 'Eliminar' },
  { value: 'approve', label: 'Aprobar' },
  { value: 'reject', label: 'Rechazar' },
  { value: 'loan_issue', label: 'Préstamo emitido' },
  { value: 'loan_return', label: 'Préstamo devuelto' },
  { value: 'extension_request', label: 'Solicitud de extensión' },
  { value: 'extension_approved', label: 'Extensión aprobada' },
  { value: 'extension_rejected', label: 'Extensión rechazada' },
  { value: 'material_consume', label: 'Material consumido' },
  { value: 'stock_update', label: 'Actualización de stock' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getActionCfg(action: string) {
  return ACTION_CONFIG[action] ?? {
    color: 'text-muted-foreground',
    bg: 'bg-secondary/20 border-border',
    dot: 'bg-muted-foreground',
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function useAuditLogs(action: string, since: string) {
  return useQuery<AuditLog[]>({
    queryKey: ['audit-logs', action, since],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (action) params.set('action', action)
      if (since) params.set('since', since)
      const res = await api.get(`/audit/logs/?${params.toString()}`)
      const data = res.data
      return Array.isArray(data) ? data : data?.results ?? []
    },
    staleTime: 30_000,
  })
}

// ── Log row component ─────────────────────────────────────────────────────────

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getActionCfg(log.action)
  const hasChanges = log.changes && Object.keys(log.changes).length > 0
  const hasDetails = hasChanges || log.description

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all duration-200 ${expanded ? 'border-primary/30' : 'border-border/50 hover:border-border'}`}>
      <div
        className={`flex items-center gap-4 p-4 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Action badge */}
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {log.action_label}
          </span>
        </div>

        {/* User + table */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-sm font-medium text-foreground">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {log.user_name}
            </span>
            {log.table_label && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-md">
                  {log.table_label}
                  {log.record_id ? ` #${log.record_id}` : ''}
                </span>
              </>
            )}
          </div>
          {log.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.description}</p>
          )}
        </div>

        {/* Timestamp + expand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDateTime(log.created_at)}
            </span>
            {log.ip_address && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">{log.ip_address}</p>
            )}
          </div>
          {hasDetails && (
            expanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded changes */}
      {expanded && (
        <div className="border-t border-border/50 bg-secondary/10 p-4 space-y-3">
          {log.description && (
            <div className="p-3 bg-secondary/20 rounded-xl">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Descripción</p>
              <p className="text-sm text-foreground">{log.description}</p>
            </div>
          )}
          {hasChanges && (() => {
            const entries = Object.entries(log.changes!)
            const snapshotEntry = entries.find(([k]) => k === 'snapshot')
            const fieldEntries = entries.filter(([k]) => k !== 'snapshot')
            return (
              <div className="space-y-3">
                {/* Field-level changes (update actions) */}
                {fieldEntries.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Cambios registrados</p>
                    <div className="space-y-2">
                      {fieldEntries.map(([field, diff]) => (
                        <div key={field} className="grid grid-cols-3 gap-2 text-xs">
                          <span className="text-muted-foreground font-medium col-span-1 truncate">{field}</span>
                          <div className="col-span-2 flex items-center gap-2 flex-wrap">
                            {diff?.old !== undefined && (
                              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded line-through truncate max-w-[160px]">
                                {String(diff.old ?? '—')}
                              </span>
                            )}
                            {diff?.old !== undefined && diff?.new !== undefined && (
                              <span className="text-muted-foreground">→</span>
                            )}
                            {diff?.new !== undefined && (
                              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded truncate max-w-[160px]">
                                {String(diff.new ?? '—')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Snapshot (delete actions — full object before deletion) */}
                {snapshotEntry && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                      Estado del registro antes de eliminarse
                    </p>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-1.5">
                      {typeof snapshotEntry[1] === 'object' && snapshotEntry[1] !== null
                        ? Object.entries(snapshotEntry[1] as Record<string, any>).map(([k, v]) => (
                            <div key={k} className="grid grid-cols-3 gap-2 text-xs">
                              <span className="text-muted-foreground font-medium truncate">{k}</span>
                              <span className="col-span-2 text-foreground/80 truncate">
                                {v === null || v === undefined ? <span className="text-muted-foreground/50 italic">null</span>
                                  : typeof v === 'object' ? JSON.stringify(v)
                                  : String(v)}
                              </span>
                            </div>
                          ))
                        : <span className="text-xs text-foreground/70">{String(snapshotEntry[1])}</span>
                      }
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
          <div className="sm:hidden text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(log.created_at)}
            {log.ip_address && ` · ${log.ip_address}`}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [sinceFilter, setSinceFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: logs = [], isLoading } = useAuditLogs(actionFilter, sinceFilter)

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(
      (l) =>
        l.user_name.toLowerCase().includes(q) ||
        l.action_label.toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q) ||
        (l.table_label ?? '').toLowerCase().includes(q),
    )
  }, [logs, search])

  // Stats
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of logs) {
      counts[l.action] = (counts[l.action] ?? 0) + 1
    }
    return counts
  }, [logs])

  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  function exportCSV() {
    const header = ['ID', 'Fecha', 'Usuario', 'Acción', 'Tabla', 'Registro', 'Descripción', 'IP']
    const rows = filtered.map((l) => [
      l.id,
      formatDateTime(l.created_at),
      l.user_name,
      l.action_label,
      l.table_label ?? '',
      l.record_id ?? '',
      (l.description ?? '').replace(/,/g, ';'),
      l.ip_address ?? '',
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Auditoría</h1>
              <p className="text-base text-muted-foreground mt-0.5">
                Registro de todas las acciones del sistema
              </p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 hover:bg-secondary/60 disabled:opacity-40 disabled:cursor-not-allowed text-foreground rounded-xl border-2 border-border transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>

        {/* Stats */}
        {topActions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {topActions.map(([action, count]) => {
              const cfg = getActionCfg(action)
              const label = ALL_ACTIONS.find((a) => a.value === action)?.label ?? action
              return (
                <Card key={action} className="p-5 rounded-xl border-2 border-border/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div>
                      <p className="text-3xl font-bold text-foreground">{count}</p>
                      <p className={`text-xs font-medium uppercase tracking-wider mt-0.5 ${cfg.color}`}>{label}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por usuario, acción, descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                showFilters || actionFilter || sinceFilter
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {(actionFilter || sinceFilter) && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-secondary/10 rounded-xl border-2 border-border/50">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                  Tipo de acción
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  {ALL_ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                  Desde fecha
                </label>
                <input
                  type="date"
                  value={sinceFilter}
                  onChange={(e) => setSinceFilter(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
              {(actionFilter || sinceFilter) && (
                <button
                  onClick={() => { setActionFilter(''); setSinceFilter('') }}
                  className="text-xs text-primary hover:underline text-left col-span-full"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? 'Cargando...' : `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`}
            {search && ` · "${search}"`}
          </span>
          {logs.length > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {logs.length} total
            </span>
          )}
        </div>

        {/* Log list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-secondary/20 rounded-xl animate-pulse border-2 border-border/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-dashed border-2 border-border rounded-xl text-center">
            <ShieldCheck className="h-14 w-14 text-muted-foreground/30 mb-4" />
            <p className="text-xl font-medium text-muted-foreground">Sin registros</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {search || actionFilter || sinceFilter
                ? 'No hay actividad para estos filtros'
                : 'Aún no hay actividad registrada en el sistema'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
