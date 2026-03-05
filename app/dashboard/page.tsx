'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useChartColors } from '@/hooks/useChartColors'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Badge } from '@/components/ui'
import api from '@/lib/api'
import Link from 'next/link'
import {
  Package, ArrowLeftRight, FileText, Users,
  AlertTriangle, Clock, Bell,
  ArrowRight, Building2, ChevronRight, Star, Copy, Check,
} from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const chart = useChartColors()
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    const code = (user as any)?.account?.company_code
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { data: materialsResponse, isLoading: materialsLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => (await api.get('/materials/materials/')).data,
    retry: 1, staleTime: 30000,
  })
  const { data: loansResponse, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => (await api.get('/loans/loans/')).data,
    retry: 1, staleTime: 30000,
  })
  const { data: requestsResponse, isLoading: requestsLoading } = useQuery({
    queryKey: ['loan-requests'],
    queryFn: async () => (await api.get('/loans/loan-requests/')).data,
    retry: 1, staleTime: 30000,
  })
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/auth/users/')).data,
    retry: 1, staleTime: 30000,
  })
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/materials/categories/')).data,
    retry: 1, staleTime: 30000,
  })
  const { data: locationsResponse } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => (await api.get('/materials/locations/')).data,
    retry: 1, staleTime: 30000,
  })

  const materials = Array.isArray(materialsResponse) ? materialsResponse : materialsResponse?.results ?? []
  const loans = Array.isArray(loansResponse) ? loansResponse : loansResponse?.results ?? []
  const requests = Array.isArray(requestsResponse) ? requestsResponse : requestsResponse?.results ?? []
  const users = Array.isArray(usersResponse) ? usersResponse : usersResponse?.results ?? []
  const categories = Array.isArray(categoriesResponse) ? categoriesResponse : categoriesResponse?.results ?? []
  const locations = Array.isArray(locationsResponse) ? locationsResponse : locationsResponse?.results ?? []

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const stats = useMemo(() => ({
    materials: {
      total: materials.length,
      available: materials.filter((m: any) => m.status === 'available').length,
      inUse: materials.filter((m: any) => m.status === 'in_use').length,
      lowStock: materials.filter((m: any) => m.is_low_stock).length,
    },
    loans: {
      active: loans.filter((l: any) => l.status === 'active').length,
      overdue: loans.filter((l: any) => l.is_overdue || l.status === 'overdue').length,
      returned: loans.filter((l: any) => l.status === 'returned').length,
      thisWeek: loans.filter((l: any) => new Date(l.created_at || l.issued_at) >= weekAgo).length,
    },
    requests: {
      pending: requests.filter((r: any) => r.status === 'pending').length,
      approved: requests.filter((r: any) => r.status === 'approved').length,
      rejected: requests.filter((r: any) => r.status === 'rejected').length,
      thisWeek: requests.filter((r: any) => new Date(r.created_at || r.request_date) >= weekAgo).length,
    },
    users: {
      total: users.length,
      inventaristas: users.filter((u: any) => u.user_type === 'inventarista').length,
      empleados: users.filter((u: any) => u.user_type === 'employee').length,
    },
    categories: categories.length,
    locations: locations.length,
  }), [materials, loans, requests, users, categories, locations])

  const topMaterialsData = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>()
    loans.forEach((loan: any) => {
      const id = loan.material
      const name = loan.material_detail?.name || 'Desconocido'
      map.set(id, { name, count: (map.get(id)?.count || 0) + 1 })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [loans])

  const loanTrendsData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return d.toISOString().split('T')[0]
    })
    return days.map(date => {
      const dayLoans = loans.filter((l: any) => new Date(l.created_at || l.issued_at).toISOString().split('T')[0] === date)
      const dayReqs = requests.filter((r: any) => new Date(r.created_at || r.request_date).toISOString().split('T')[0] === date)
      return {
        date: new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        prestamos: dayLoans.length,
        solicitudes: dayReqs.length,
      }
    })
  }, [loans, requests])

  const materialStatusPie = useMemo(() => [
    { name: 'Disponibles', value: stats.materials.available, color: '#22c55e' },
    { name: 'En Uso', value: stats.materials.inUse, color: '#8b5cf6' },
    { name: 'Stock Bajo', value: stats.materials.lowStock, color: '#f59e0b' },
  ].filter(d => d.value > 0), [stats.materials])

  const recentActivity = useMemo(() => {
    const all: any[] = [
      ...loans.slice(0, 8).map((l: any) => ({
        type: 'loan', title: l.material_detail?.name || 'Material',
        user: l.borrower_detail?.full_name || 'Usuario',
        date: l.created_at || l.issued_at, status: l.status,
      })),
      ...requests.slice(0, 5).map((r: any) => ({
        type: 'request', title: 'Solicitud',
        user: r.requester_detail?.full_name || 'Usuario',
        date: r.created_at || r.request_date, status: r.status,
      })),
    ]
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  }, [loans, requests])

  const alerts = [
    stats.materials.lowStock > 0 && {
      href: '/materials', icon: AlertTriangle,
      color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500',
      title: 'Stock Bajo', desc: `${stats.materials.lowStock} materiales requieren atención`,
    },
    stats.loans.overdue > 0 && {
      href: '/loans', icon: Clock,
      color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500',
      title: 'Préstamos Vencidos', desc: `${stats.loans.overdue} préstamos retrasados`,
    },
    stats.requests.pending > 0 && {
      href: '/requests', icon: Bell,
      color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500',
      title: 'Solicitudes Pendientes', desc: `${stats.requests.pending} por revisar`,
    },
  ].filter(Boolean) as any[]

  const getStatusLabel = (s: string) => ({ active: 'Activo', returned: 'Devuelto', overdue: 'Vencido', pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }[s] || s)
  const getStatusVariant = (s: string): any => ({ approved: 'success', active: 'success', returned: 'default', pending: 'warning', rejected: 'danger', overdue: 'danger' }[s] || 'default')
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const barColors = ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95']

  if (materialsLoading || loansLoading || requestsLoading || usersLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-3 flex flex-col gap-2 h-full">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-background border border-primary/20 px-4 py-2.5">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Panel de control</p>
              <h1 className="text-xl font-bold text-foreground leading-tight">
                Bienvenido, <span className="text-primary">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {user?.account?.company_name && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 text-primary" />{user.account.company_name}
                  </span>
                )}
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  {user?.user_type === 'inventarista' ? 'Administrador' : 'Empleado'}
                </Badge>
                {user?.user_type === 'inventarista' && (user as any)?.account?.company_code && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[10px] text-muted-foreground">Código:</span>
                    <button
                      onClick={copyCode}
                      title="Copiar código"
                      className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      {(user as any).account.company_code}
                      {copied ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary leading-none">{stats.loans.thisWeek}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">Préstamos<br />semana</p>
              </div>
              <div className="w-px h-8 bg-border/40" />
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400 leading-none">{stats.requests.thisWeek}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">Solicitudes<br />semana</p>
              </div>
              <div className="w-px h-8 bg-border/40" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400 leading-none">{stats.loans.returned}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">Devueltos<br />total</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ALERTS ── */}
        {alerts.length > 0 && (
          <div className={`grid gap-2 ${alerts.length === 1 ? 'grid-cols-1' : alerts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {alerts.map((alert, i) => (
              <Link key={i} href={alert.href}>
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card border border-border/50 border-l-4 ${alert.border} hover:opacity-90 transition-opacity cursor-pointer group`}>
                  <div className={`p-1.5 rounded-md ${alert.bg} flex-shrink-0`}>
                    <alert.icon className={`h-4 w-4 ${alert.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${alert.color}`}>{alert.title}</p>
                    <p className="text-[11px] text-muted-foreground">{alert.desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── 4 STAT CARDS ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              icon: Package, label: 'Materiales', value: stats.materials.total, href: '/materials',
              color: 'text-primary', border: 'border-primary/40', iconBg: 'bg-primary/15',
              d1: `${stats.materials.available} disponibles`, d2: `${stats.materials.inUse} en uso`,
              d1Color: 'text-green-400', d2Color: 'text-amber-400',
            },
            {
              icon: ArrowLeftRight, label: 'Préstamos Activos', value: stats.loans.active, href: '/loans',
              color: 'text-green-400', border: 'border-green-500/40', iconBg: 'bg-green-500/15',
              d1: `${stats.loans.returned} devueltos`, d2: `${stats.loans.overdue} vencidos`,
              d1Color: 'text-muted-foreground', d2Color: stats.loans.overdue > 0 ? 'text-red-400' : 'text-muted-foreground',
            },
            {
              icon: FileText, label: 'Solicitudes Pend.', value: stats.requests.pending, href: '/requests',
              color: 'text-amber-400', border: 'border-amber-500/40', iconBg: 'bg-amber-500/15',
              d1: `${stats.requests.approved} aprobadas`, d2: `${stats.requests.rejected} rechazadas`,
              d1Color: 'text-green-400', d2Color: 'text-red-400',
            },
            {
              icon: Users, label: 'Usuarios', value: stats.users.total, href: '/users',
              color: 'text-violet-400', border: 'border-violet-500/40', iconBg: 'bg-violet-500/15',
              d1: `${stats.users.inventaristas} admins`, d2: `${stats.users.empleados} empleados`,
              d1Color: 'text-primary', d2Color: 'text-violet-400',
            },
          ].map(({ icon: Icon, label, value, href, color, border, iconBg, d1, d2, d1Color, d2Color }) => (
            <Link key={label} href={href}>
              <div className={`flex flex-col p-3 rounded-xl border-2 ${border} bg-card hover:bg-accent/20 transition-all cursor-pointer group h-full`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:translate-x-0.5 transition-transform mt-0.5" />
                </div>
                <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-1.5">{label}</p>
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-2">
                  <span className={`text-[11px] font-medium ${d1Color}`}>{d1}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className={`text-[11px] font-medium ${d2Color}`}>{d2}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── CHART ROW: Área (8 cols) + Top Materiales (4 cols) ── */}
        <div className="grid grid-cols-12 gap-2" style={{ height: '200px' }}>
          <div className="col-span-8 bg-card border border-border/50 rounded-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
              <p className="text-sm font-semibold text-foreground">Actividad — Últimos 14 días</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Préstamos</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Solicitudes</span>
              </div>
            </div>
            <div className="flex-1 px-2 pb-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={loanTrendsData}>
                  <defs>
                    <linearGradient id="gradPrestamos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSolicitudes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={chart.tick} tick={{ fill: chart.tick, fontSize: 10 }} tickLine={false} axisLine={false} width={20} />
                  <Tooltip contentStyle={chart.tooltipStyle} />
                  <Area type="monotone" dataKey="prestamos" stroke="#8b5cf6" fill="url(#gradPrestamos)" strokeWidth={2.5} name="Préstamos" dot={false} />
                  <Area type="monotone" dataKey="solicitudes" stroke="#f59e0b" fill="url(#gradSolicitudes)" strokeWidth={2} name="Solicitudes" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-4 bg-card border border-border/50 rounded-xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20">
              <Star className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-semibold text-foreground">Top Materiales</p>
            </div>
            <div className="flex-1 px-4 py-2 space-y-1.5 overflow-hidden">
              {topMaterialsData.length === 0 ? (
                <p className="text-xs text-muted-foreground pt-2 text-center">Sin datos aún</p>
              ) : topMaterialsData.slice(0, 4).map((item, i) => {
                const pct = topMaterialsData[0].count > 0 ? (item.count / topMaterialsData[0].count) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold text-muted-foreground w-4">#{i + 1}</span>
                        <span className="text-xs font-medium text-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: barColors[i] }}>{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColors[i] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW: Actividad Reciente (7) + Estado Materiales Pie (5) ── */}
        <div className="grid grid-cols-12 gap-2 flex-1 min-h-0" style={{ height: '240px' }}>

          <div className="col-span-7 h-full bg-card border border-border/50 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Actividad Reciente</p>
              </div>
              <Link href="/reports" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todo <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border/20 flex-1 overflow-hidden">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">Sin actividad reciente</p>
              ) : recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/10 transition-colors">
                  <div className={`p-1.5 rounded-md flex-shrink-0 ${a.type === 'loan' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                    {a.type === 'loan'
                      ? <ArrowLeftRight className="h-3 w-3 text-green-400" />
                      : <FileText className="h-3 w-3 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{a.type === 'loan' ? a.title : 'Solicitud'}</p>
                    <p className="text-[10px] text-muted-foreground">{a.user}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={getStatusVariant(a.status)} className="text-[10px]">{getStatusLabel(a.status)}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(a.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pie Chart: Estado de Materiales */}
          <div className="col-span-5 h-full bg-card border border-border/50 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20 flex-shrink-0">
              <Package className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Estado de Materiales</p>
            </div>
            {materialStatusPie.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">Sin datos</p>
            ) : (
              <div className="flex flex-1 min-h-0">
                <div className="flex-1 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={materialStatusPie} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                        {materialStatusPie.map((entry, index) => (
                          <Cell key={index} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: any, n: any) => [`${v} materiales`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-36 flex flex-col justify-center pr-4 gap-2">
                  {materialStatusPie.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] text-muted-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-foreground">{item.value}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {stats.materials.total > 0 ? Math.round((item.value / stats.materials.total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-border/20 flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-foreground">{stats.materials.total}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
