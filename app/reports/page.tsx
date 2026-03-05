'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useChartColors } from '@/hooks/useChartColors'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  BarChart3, Download, FileText, Package, ArrowLeftRight, Users,
  Calendar, Search, AlertCircle, CheckCircle,
  Activity, Star, Shield, Trash2, MapPin, Tag,
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'

// ─── CSV Export Helper ────────────────────────────────────────────────────────
function exportToCSV(rows: (string | number | null | undefined)[][], filename: string) {
  const BOM = '\uFEFF'
  const csv = rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

type Tab = 'overview' | 'loans' | 'materials' | 'audit' | 'deleted'
type DateFilter = 'week' | 'month' | 'all'

function formatDate(d: string | null | undefined) {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatDateTime(d: string | null | undefined) {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', returned: 'Devuelto', overdue: 'Vencido',
  pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada',
  available: 'Disponible', on_loan: 'En préstamo', maintenance: 'Mantenimiento', lost: 'Perdido',
}
const getStatusVariant = (s: string): any =>
  ({ active: 'success', approved: 'success', returned: 'default', pending: 'warning', rejected: 'danger', overdue: 'danger' }[s] || 'default')

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [search, setSearch] = useState('')
  const chart = useChartColors()
  const TOOLTIP_STYLE = chart.tooltipStyle

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: matRes, isLoading: matLoading } = useQuery({
    queryKey: ['materials'], queryFn: async () => (await api.get('/materials/materials/')).data, staleTime: 30000,
  })
  const { data: loansRes, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'], queryFn: async () => (await api.get('/loans/loans/')).data, staleTime: 30000,
  })
  const { data: reqRes, isLoading: reqLoading } = useQuery({
    queryKey: ['loan-requests'], queryFn: async () => (await api.get('/loans/loan-requests/')).data, staleTime: 30000,
  })
  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ['users'], queryFn: async () => (await api.get('/auth/users/')).data, staleTime: 30000,
  })
  const { data: catRes } = useQuery({
    queryKey: ['categories'], queryFn: async () => (await api.get('/materials/categories/')).data, staleTime: 30000,
  })
  const { data: auditRes } = useQuery({
    queryKey: ['audit-logs'], queryFn: async () => (await api.get('/audit/logs/?action=delete&ordering=-created_at')).data, staleTime: 30000,
  })

  const materials = Array.isArray(matRes) ? matRes : matRes?.results ?? []
  const loans = Array.isArray(loansRes) ? loansRes : loansRes?.results ?? []
  const requests = Array.isArray(reqRes) ? reqRes : reqRes?.results ?? []
  const users = Array.isArray(usersRes) ? usersRes : usersRes?.results ?? []
  const categories = Array.isArray(catRes) ? catRes : catRes?.results ?? []
  const deletionLogs: any[] = Array.isArray(auditRes) ? auditRes : auditRes?.results ?? []

  const isLoading = matLoading || loansLoading || reqLoading || usersLoading

  // ─── Date filter cutoff ───────────────────────────────────────────────────────
  const cutoff = useMemo(() => {
    if (dateFilter === 'week') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (dateFilter === 'month') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return null
  }, [dateFilter])

  const inRange = (dateStr: string | null | undefined) => {
    if (!dateStr || !cutoff) return true
    return new Date(dateStr) >= cutoff
  }

  // ─── Filtered data ────────────────────────────────────────────────────────────
  const filteredLoans = useMemo(() =>
    loans.filter((l: any) => {
      const d = l.issued_at || l.created_at
      if (!inRange(d)) return false
      if (!search) return true
      const s = search.toLowerCase()
      return (
        l.material_detail?.name?.toLowerCase().includes(s) ||
        l.borrower_detail?.full_name?.toLowerCase().includes(s) ||
        String(l.id).includes(s)
      )
    }), [loans, cutoff, search])

  const filteredMaterials = useMemo(() =>
    materials.filter((m: any) => {
      if (!search) return true
      const s = search.toLowerCase()
      const catName = m.category?.name || ''
      return m.name?.toLowerCase().includes(s) || m.sku?.toLowerCase().includes(s) || catName.toLowerCase().includes(s)
    }), [materials, search])

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    materials: {
      total: materials.length,
      available: materials.filter((m: any) => m.status === 'available').length,
      inUse: materials.filter((m: any) => m.status === 'in_use').length,
      lowStock: materials.filter((m: any) => m.is_low_stock).length,
    },
    loans: {
      total: filteredLoans.length,
      active: filteredLoans.filter((l: any) => l.status === 'active').length,
      overdue: filteredLoans.filter((l: any) => l.status === 'overdue' || l.is_overdue).length,
      returned: filteredLoans.filter((l: any) => l.status === 'returned').length,
    },
    requests: {
      total: requests.filter((r: any) => inRange(r.created_at || r.request_date)).length,
      pending: requests.filter((r: any) => inRange(r.created_at || r.request_date) && r.status === 'pending').length,
      approved: requests.filter((r: any) => inRange(r.created_at || r.request_date) && r.status === 'approved').length,
      rejected: requests.filter((r: any) => inRange(r.created_at || r.request_date) && r.status === 'rejected').length,
    },
    users: { total: users.length },
  }), [materials, filteredLoans, requests, users, cutoff])

  // ─── Charts data ──────────────────────────────────────────────────────────────
  const topMaterials = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>()
    filteredLoans.forEach((l: any) => {
      const id = l.material; const name = l.material_detail?.name || 'Desconocido'
      map.set(id, { name, count: (map.get(id)?.count || 0) + 1 })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [filteredLoans])

  const topBorrowers = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>()
    filteredLoans.forEach((l: any) => {
      const id = l.borrower; const name = l.borrower_detail?.full_name || 'Desconocido'
      map.set(id, { name, count: (map.get(id)?.count || 0) + 1 })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [filteredLoans])

  const loanTrendsData = useMemo(() => {
    const days = dateFilter === 'week' ? 7 : 30
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
      const key = d.toISOString().split('T')[0]
      const dayLoans = loans.filter((l: any) => (l.issued_at || l.created_at)?.startsWith(key)).length
      const dayReqs = requests.filter((r: any) => (r.created_at || r.request_date)?.startsWith(key)).length
      return {
        date: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        prestamos: dayLoans,
        solicitudes: dayReqs,
      }
    })
  }, [loans, requests, dateFilter])

  const requestStatusData = useMemo(() => [
    { name: 'Aprobadas', value: stats.requests.approved, color: '#22c55e' },
    { name: 'Rechazadas', value: stats.requests.rejected, color: '#ef4444' },
    { name: 'Pendientes', value: stats.requests.pending, color: '#f59e0b' },
  ].filter(i => i.value > 0), [stats.requests])

  const materialsCategoryData = useMemo(() => {
    return categories
      .map((cat: any) => ({
        name: cat.name,
        count: materials.filter((m: any) => (m.category?.id ?? m.category) === cat.id).length,
      }))
      .filter((item: any) => item.count > 0)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 8)
  }, [materials, categories])

  // ─── Audit log ────────────────────────────────────────────────────────────────
  const auditLog = useMemo(() => {
    const events: any[] = []

    loans.forEach((l: any) => {
      const d = l.issued_at || l.created_at
      if (!inRange(d)) return
      events.push({
        id: `loan-${l.id}`,
        type: 'loan',
        action: 'Préstamo emitido',
        user: l.borrower_detail?.full_name || 'N/A',
        detail: `${l.material_detail?.name || 'Material'} · ${l.quantity_loaned || 1} unidad(es)`,
        status: l.status,
        date: d,
        approvedBy: l.approved_by_detail?.full_name,
      })
      if (l.status === 'returned' && l.returned_at) {
        events.push({
          id: `return-${l.id}`,
          type: 'return',
          action: 'Devolución registrada',
          user: l.borrower_detail?.full_name || 'N/A',
          detail: `${l.material_detail?.name || 'Material'} · condición: ${l.return_condition || 'N/A'}`,
          status: 'returned',
          date: l.returned_at,
        })
      }
    })

    requests.forEach((r: any) => {
      const d = r.created_at || r.request_date
      if (!inRange(d)) return
      events.push({
        id: `req-${r.id}`,
        type: 'request',
        action: `Solicitud ${r.status === 'pending' ? 'creada' : r.status === 'approved' ? 'aprobada' : 'rechazada'}`,
        user: r.requester_detail?.full_name || 'N/A',
        detail: r.notes || `${r.items?.length || 0} item(s) solicitado(s)`,
        status: r.status,
        date: d,
        approvedBy: r.reviewed_by_detail?.full_name,
      })
    })

    return events
      .filter(e => {
        if (!search) return true
        const s = search.toLowerCase()
        return e.user.toLowerCase().includes(s) || e.action.toLowerCase().includes(s) || e.detail.toLowerCase().includes(s)
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [loans, requests, cutoff, search])

  // ─── Exports ──────────────────────────────────────────────────────────────────
  const exportLoans = () => {
    const headers = ['ID', 'Material', 'Usuario', 'Cantidad', 'Fecha Préstamo', 'Vencimiento', 'Estado', 'Aprobado por']
    const rows = filteredLoans.map((l: any) => [
      l.id, l.material_detail?.name || 'N/A', l.borrower_detail?.full_name || 'N/A',
      l.quantity_loaned, formatDate(l.issued_at || l.created_at),
      formatDate(l.expected_return_date), STATUS_LABELS[l.status] || l.status,
      l.approved_by_detail?.full_name || 'N/A',
    ])
    exportToCSV([headers, ...rows], `prestamos-${dateFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  const exportMaterials = () => {
    const headers = ['ID', 'Nombre', 'SKU', 'Categoría', 'Stock Total', 'Disponible', 'Estado', 'Stock Bajo']
    const rows = filteredMaterials.map((m: any) => [
      m.id, m.name, m.sku || 'N/A', m.category?.name || 'Sin categoría',
      m.quantity, m.available_quantity,
      STATUS_LABELS[m.status] || m.status, m.is_low_stock ? 'Sí' : 'No',
    ])
    exportToCSV([headers, ...rows], `materiales-${new Date().toISOString().split('T')[0]}`)
  }

  const exportAudit = () => {
    const headers = ['Fecha/Hora', 'Acción', 'Usuario', 'Detalle', 'Estado', 'Aprobado por']
    const rows = auditLog.map((e: any) => [
      formatDateTime(e.date), e.action, e.user, e.detail,
      STATUS_LABELS[e.status] || e.status, e.approvedBy || 'N/A',
    ])
    exportToCSV([headers, ...rows], `auditoria-${dateFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Vista General', icon: BarChart3 },
    { id: 'loans', label: 'Préstamos', icon: ArrowLeftRight, count: stats.loans.total },
    { id: 'materials', label: 'Materiales', icon: Package, count: filteredMaterials.length },
    { id: 'audit', label: 'Auditoría', icon: Shield, count: auditLog.length },
    { id: 'deleted', label: 'Eliminados', icon: Trash2, count: deletionLogs.length },
  ]

  const DATE_FILTERS: { id: DateFilter; label: string }[] = [
    { id: 'week', label: 'Última semana' },
    { id: 'month', label: 'Último mes' },
    { id: 'all', label: 'Todo el tiempo' },
  ]

  const TYPE_ICONS: Record<string, any> = {
    loan: { icon: ArrowLeftRight, color: 'text-green-400', bg: 'bg-green-500/10' },
    return: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    request: { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary" />
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reportes y Auditoría</h1>
              <p className="text-sm text-muted-foreground">Análisis completo · rastreo de personas y pedidos</p>
            </div>
          </div>
          {/* Date filter pills */}
          <div className="flex items-center gap-2 p-1 bg-secondary/40 rounded-xl border border-border/50">
            <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
            {DATE_FILTERS.map(f => (
              <button key={f.id} onClick={() => setDateFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter === f.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-xl border border-border/50 w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: VISTA GENERAL                                                  */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Materiales totales', value: stats.materials.total, sub: `${stats.materials.available} disponibles`, icon: Package, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
                { label: 'Préstamos', value: stats.loans.total, sub: `${stats.loans.overdue} vencidos`, icon: ArrowLeftRight, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
                { label: 'Solicitudes', value: stats.requests.total, sub: `${stats.requests.approved} aprobadas`, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
                { label: 'Usuarios', value: stats.users.total, sub: 'registrados', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
              ].map(({ label, value, sub, icon: Icon, color, bg, border }) => (
                <div key={label} className={`p-5 rounded-xl border-2 ${border} bg-card`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                    <span className={`text-4xl font-black ${color}`}>{value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Tendencia */}
              <Card className="border-2 lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg"><Activity className="h-5 w-5 text-primary" /></div>
                    <div>
                      <CardTitle className="text-lg">Tendencia de actividad</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {dateFilter === 'week' ? 'Últimos 7 días' : dateFilter === 'month' ? 'Últimos 30 días' : 'Historial completo'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={loanTrendsData}>
                      <defs>
                        <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 11 }} />
                      <YAxis stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 11 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="prestamos" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gP)" name="Préstamos" dot={false} />
                      <Area type="monotone" dataKey="solicitudes" stroke="#f59e0b" strokeWidth={2} fill="url(#gS)" name="Solicitudes" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Solicitudes pie */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg"><FileText className="h-5 w-5 text-amber-400" /></div>
                    <CardTitle className="text-lg">Solicitudes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={requestStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                        {requestStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {requestStatusData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top listas */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top materiales */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg"><Star className="h-5 w-5 text-amber-400" /></div>
                    <CardTitle className="text-lg">Materiales más prestados</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {topMaterials.length === 0
                    ? <p className="text-center text-muted-foreground py-8 text-sm">Sin datos en el período</p>
                    : <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={topMaterials} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis type="number" stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 11 }} width={120} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Préstamos" />
                      </BarChart>
                    </ResponsiveContainer>
                  }
                </CardContent>
              </Card>

              {/* Top usuarios */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg"><Users className="h-5 w-5 text-green-400" /></div>
                    <CardTitle className="text-lg">Usuarios más activos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {topBorrowers.length === 0
                    ? <p className="text-center text-muted-foreground py-8 text-sm">Sin datos en el período</p>
                    : <div className="space-y-3">
                      {topBorrowers.slice(0, 6).map((item, i) => {
                        const pct = topBorrowers[0].count > 0 ? (item.count / topBorrowers[0].count) * 100 : 0
                        const colors = ['bg-primary', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500']
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-5 font-bold">#{i + 1}</span>
                                <span className="text-sm font-medium truncate max-w-[180px]">{item.name}</span>
                              </div>
                              <span className="text-sm font-bold">{item.count} préstamos</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  }
                </CardContent>
              </Card>
            </div>

            {/* Materiales por categoría */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Package className="h-5 w-5 text-blue-400" /></div>
                  <CardTitle className="text-lg">Materiales por categoría</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={materialsCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="name" stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 11 }} />
                    <YAxis stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Materiales" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: PRÉSTAMOS                                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'loans' && (
          <div className="space-y-5">
            {/* search + export */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por material, usuario o ID..."
                  className="w-full rounded-xl border-2 border-border bg-card px-5 py-3 pl-11 text-base outline-none focus:border-primary transition-colors"
                />
              </div>
              <Button onClick={exportLoans} className="gap-2 rounded-xl border-2 border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 px-5 py-3 h-auto">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>

            {/* summary strips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total en período', value: stats.loans.total, color: 'text-foreground' },
                { label: 'Activos', value: stats.loans.active, color: 'text-green-400' },
                { label: 'Vencidos', value: stats.loans.overdue, color: 'text-red-400' },
                { label: 'Devueltos', value: stats.loans.returned, color: 'text-muted-foreground' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 rounded-xl border-2 border-border/50 bg-card text-center">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* table */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Historial de Préstamos — {filteredLoans.length} registro(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['ID', 'Material', 'Usuario', 'Cant.', 'Fecha', 'Vencimiento', 'Estado', 'Aprobado por'].map(h => (
                          <th key={h} className="pb-3 pr-4 text-left text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoans.length === 0 && (
                        <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Sin préstamos en el período seleccionado</td></tr>
                      )}
                      {filteredLoans.map((l: any) => (
                        <tr key={l.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                          <td className="py-3 pr-4 font-medium text-primary">#{l.id}</td>
                          <td className="py-3 pr-4 font-medium">{l.material_detail?.name || 'N/A'}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{l.borrower_detail?.full_name || 'N/A'}</td>
                          <td className="py-3 pr-4">{l.quantity_loaned || 1}</td>
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">{formatDate(l.issued_at || l.created_at)}</td>
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">{formatDate(l.expected_return_date)}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={getStatusVariant(l.status)}>{STATUS_LABELS[l.status] || l.status}</Badge>
                          </td>
                          <td className="py-3 text-muted-foreground">{l.approved_by_detail?.full_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: MATERIALES                                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'materials' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, SKU o categoría..."
                  className="w-full rounded-xl border-2 border-border bg-card px-5 py-3 pl-11 text-base outline-none focus:border-primary transition-colors"
                />
              </div>
              <Button onClick={exportMaterials} className="gap-2 rounded-xl border-2 border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 px-5 py-3 h-auto">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: stats.materials.total, color: 'text-foreground' },
                { label: 'Disponibles', value: stats.materials.available, color: 'text-green-400' },
                { label: 'En uso', value: stats.materials.inUse, color: 'text-violet-400' },
                { label: 'Stock bajo', value: stats.materials.lowStock, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 rounded-xl border-2 border-border/50 bg-card text-center">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
                </div>
              ))}
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base">Inventario — {filteredMaterials.length} material(es)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Nombre', 'SKU', 'Categoría', 'Stock', 'Disponible', 'Estado', 'Stock Bajo'].map(h => (
                          <th key={h} className="pb-3 pr-4 text-left text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.length === 0 && (
                        <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Sin materiales encontrados</td></tr>
                      )}
                      {filteredMaterials.map((m: any) => (
                        <tr key={m.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                          <td className="py-3 pr-4 font-medium">{m.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{m.sku || 'N/A'}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{m.category?.name || 'Sin categoría'}</td>
                          <td className="py-3 pr-4 font-medium">{m.quantity}</td>
                          <td className="py-3 pr-4 text-green-400 font-medium">{m.available_quantity}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={m.status === 'available' ? 'success' : 'default'}>
                              {STATUS_LABELS[m.status] || m.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {m.is_low_stock
                              ? <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium"><AlertCircle className="h-3.5 w-3.5" /> Sí</span>
                              : <span className="text-muted-foreground text-xs">No</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: AUDITORÍA                                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'audit' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por usuario, acción o detalle..."
                  className="w-full rounded-xl border-2 border-border bg-card px-5 py-3 pl-11 text-base outline-none focus:border-primary transition-colors"
                />
              </div>
              <Button onClick={exportAudit} className="gap-2 rounded-xl border-2 border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 px-5 py-3 h-auto">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-violet-500/30 bg-violet-500/5">
              <Shield className="h-5 w-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-300">Registro completo de auditoría</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Muestra todos los eventos: préstamos emitidos, devoluciones y solicitudes.
                  {auditLog.length} evento(s) en el período seleccionado.
                </p>
              </div>
            </div>

            {auditLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-dashed border-2 border-border rounded-xl">
                <Shield className="h-14 w-14 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-muted-foreground">Sin eventos en este período</p>
                <p className="text-sm text-muted-foreground mt-1">Cambia el filtro de fechas para ver más historial</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.map((event: any) => {
                  const cfg = TYPE_ICONS[event.type] || TYPE_ICONS.request
                  const Icon = cfg.icon
                  return (
                    <div key={event.id} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/10 transition-colors">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{event.action}</span>
                          <Badge variant={getStatusVariant(event.status)} className="text-xs">
                            {STATUS_LABELS[event.status] || event.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{event.user}</span>
                          {' · '}{event.detail}
                        </p>
                        {event.approvedBy && (
                          <p className="text-xs text-muted-foreground mt-0.5">Revisado por: {event.approvedBy}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(event.date)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: ELIMINADOS                                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'deleted' && (
          <div className="space-y-5">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-red-500/30 bg-red-500/5">
              <Trash2 className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Historial permanente de eliminaciones</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Materiales, categorías y ubicaciones eliminadas con su snapshot completo.
                  Los préstamos del material quedan registrados aquí antes de borrarse.
                </p>
              </div>
            </div>

            {deletionLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-dashed border-2 border-border rounded-xl">
                <Trash2 className="h-14 w-14 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-muted-foreground">Sin eliminaciones registradas</p>
                <p className="text-sm text-muted-foreground mt-1">Los elementos eliminados aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deletionLogs.map((log: any) => {
                  const snap = log.changes?.snapshot || {}
                  const loanHistory: any[] = snap.loan_history || []
                  const tableIcon = log.table_name === 'material'
                    ? { icon: Package, color: 'text-violet-400', bg: 'bg-violet-500/10' }
                    : log.table_name === 'category'
                      ? { icon: Tag, color: 'text-amber-400', bg: 'bg-amber-500/10' }
                      : { icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10' }
                  const Icon = tableIcon.icon
                  return (
                    <div key={log.id} className="rounded-xl border-2 border-red-500/20 bg-card overflow-hidden">
                      {/* Header */}
                      <div className="flex items-start gap-4 p-4 bg-red-500/5">
                        <div className={`p-2.5 rounded-lg flex-shrink-0 ${tableIcon.bg}`}>
                          <Icon className={`h-4 w-4 ${tableIcon.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-foreground">{snap.name || '—'}</span>
                            <Badge variant="danger" className="text-xs">Eliminado</Badge>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{log.table_label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.description}</p>
                          {/* Chips */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {snap.sku && <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-lg font-mono text-muted-foreground">SKU: {snap.sku}</span>}
                            {snap.category && <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-lg text-muted-foreground">Cat: {snap.category}</span>}
                            {snap.quantity !== undefined && <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-lg text-muted-foreground">Stock: {snap.quantity}</span>}
                            {snap.location && <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-lg text-muted-foreground">Ubicación: {snap.location}</span>}
                            {snap.materials_count !== undefined && <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-lg text-muted-foreground">{snap.materials_count} material(es) afectado(s)</span>}
                            {snap.full_address && <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-lg text-muted-foreground">{snap.full_address}</span>}
                            {snap.total_loans !== undefined && (
                              <span className="text-xs bg-violet-500/20 px-2 py-0.5 rounded-lg text-violet-400 font-medium">{snap.total_loans} préstamo(s) histórico(s)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.created_at)}</p>
                          <p className="text-xs text-red-400 mt-1 font-medium">{log.user_name}</p>
                        </div>
                      </div>

                      {/* Loan history for deleted materials */}
                      {loanHistory.length > 0 && (
                        <div className="border-t border-border/50 px-4 py-3">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ArrowLeftRight className="h-3.5 w-3.5" /> Historial de préstamos ({loanHistory.length})
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/40">
                                  {['ID', 'Usuario', 'Cant.', 'Fecha préstamo', 'Devuelto', 'Estado'].map(h => (
                                    <th key={h} className="pb-2 pr-4 text-left text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {loanHistory.map((l: any) => (
                                  <tr key={l.id} className="border-b border-border/30">
                                    <td className="py-1.5 pr-4 text-primary font-medium">#{l.id}</td>
                                    <td className="py-1.5 pr-4 text-foreground">{l.borrower}</td>
                                    <td className="py-1.5 pr-4 text-muted-foreground">{l.quantity}</td>
                                    <td className="py-1.5 pr-4 text-muted-foreground whitespace-nowrap">{l.issued_at || '—'}</td>
                                    <td className="py-1.5 pr-4 text-muted-foreground whitespace-nowrap">{l.returned_at || '—'}</td>
                                    <td className="py-1.5">
                                      <Badge variant={l.status === 'returned' ? 'default' : l.status === 'active' ? 'success' : 'warning'} className="text-xs">
                                        {STATUS_LABELS[l.status] || l.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
