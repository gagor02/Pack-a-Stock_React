'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useChartColors } from '@/hooks/useChartColors'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import api from '@/lib/api'
import Link from 'next/link'
import {
  Package, ArrowLeftRight, FileText, Users, Tag, MapPin,
  AlertTriangle, Clock, Bell, LayoutGrid, BarChart3, QrCode,
  ArrowRight, Building2, ChevronRight,
  Activity, Star, Zap,
} from 'lucide-react'
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const chart = useChartColors()

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

  // Top 5 materiales más prestados
  const topMaterialsData = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>()
    loans.forEach((loan: any) => {
      const id = loan.material
      const name = loan.material_detail?.name || 'Desconocido'
      map.set(id, { name, count: (map.get(id)?.count || 0) + 1 })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [loans])

  // Tendencia últimos 14 días
  const loanTrendsData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return d.toISOString().split('T')[0]
    })
    return days.map(date => {
      const dayLoans = loans.filter((l: any) => {
        const d = new Date(l.created_at || l.issued_at).toISOString().split('T')[0]
        return d === date
      })
      const dayReqs = requests.filter((r: any) => {
        const d = new Date(r.created_at || r.request_date).toISOString().split('T')[0]
        return d === date
      })
      return {
        date: new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        prestamos: dayLoans.length,
        solicitudes: dayReqs.length,
      }
    })
  }, [loans, requests])

  // Material status pie
  const materialStatusData = useMemo(() => [
    { name: 'Disponibles', value: stats.materials.available, color: '#22c55e' },
    { name: 'En Uso', value: stats.materials.inUse, color: '#8b5cf6' },
    { name: 'Stock Bajo', value: stats.materials.lowStock, color: '#f59e0b' },
  ].filter(i => i.value > 0), [stats.materials])

  // Recent activity combined
  const recentActivity = useMemo(() => {
    const all: any[] = [
      ...loans.slice(0, 8).map((l: any) => ({
        type: 'loan',
        title: l.material_detail?.name || 'Material',
        user: l.borrower_detail?.full_name || 'Usuario',
        date: l.created_at || l.issued_at,
        status: l.status,
      })),
      ...requests.slice(0, 5).map((r: any) => ({
        type: 'request',
        title: `Solicitud`,
        user: r.requester_detail?.full_name || 'Usuario',
        date: r.created_at || r.request_date,
        status: r.status,
      })),
    ]
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)
  }, [loans, requests])

  const alerts = [
    stats.materials.lowStock > 0 && {
      href: '/materials', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
      title: 'Stock Bajo', desc: `${stats.materials.lowStock} materiales requieren atención`,
    },
    stats.loans.overdue > 0 && {
      href: '/loans', icon: Clock, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30',
      title: 'Préstamos Vencidos', desc: `${stats.loans.overdue} préstamos retrasados`,
    },
    stats.requests.pending > 0 && {
      href: '/requests', icon: Bell, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
      title: 'Solicitudes Pendientes', desc: `${stats.requests.pending} por revisar`,
    },
  ].filter(Boolean) as any[]

  const quickLinks = [
    { href: '/materials', icon: Package, label: 'Materiales', value: stats.materials.total, color: 'text-primary', gradient: 'from-primary/20 to-primary/5', border: 'border-primary/30' },
    { href: '/categories', icon: Tag, label: 'Categorías', value: stats.categories, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/30' },
    { href: '/locations', icon: MapPin, label: 'Ubicaciones', value: stats.locations, color: 'text-green-400', gradient: 'from-green-500/20 to-green-500/5', border: 'border-green-500/30' },
    { href: '/loans', icon: ArrowLeftRight, label: 'Préstamos', value: stats.loans.active, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30' },
    { href: '/users', icon: Users, label: 'Usuarios', value: stats.users.total, color: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-500/5', border: 'border-violet-500/30' },
    { href: '/requests', icon: FileText, label: 'Solicitudes', value: stats.requests.pending, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30' },
    { href: '/labels', icon: QrCode, label: 'Etiquetas QR', color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/30' },
    { href: '/reports', icon: BarChart3, label: 'Reportes', color: 'text-rose-400', gradient: 'from-rose-500/20 to-rose-500/5', border: 'border-rose-500/30' },
  ]

  const getStatusLabel = (s: string) => ({ active: 'Activo', returned: 'Devuelto', overdue: 'Vencido', pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }[s] || s)
  const getStatusVariant = (s: string): any => ({ approved: 'success', active: 'success', returned: 'default', pending: 'warning', rejected: 'danger', overdue: 'danger' }[s] || 'default')
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const TOOLTIP_STYLE = chart.tooltipStyle

  if (materialsLoading || loansLoading || requestsLoading || usersLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary"></div>
          <p className="text-base text-muted-foreground">Cargando dashboard...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">

        {/* === HERO HEADER === */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/25 p-8"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.18) 0%, hsl(var(--primary)/0.08) 50%, transparent 100%)' }}>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1 font-medium tracking-widest uppercase">Bienvenido de vuelta</p>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                {user?.full_name || user?.email || 'Administrador'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {user?.account?.company_name && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/40 rounded-lg text-sm font-medium">
                    <Building2 className="h-4 w-4 text-primary" />{user.account.company_name}
                  </span>
                )}
                <Badge variant="default" className="text-sm px-3 py-1.5 capitalize">
                  {user?.user_type === 'inventarista' ? 'Administrador' : 'Empleado'}
                </Badge>
              </div>
            </div>
            {/* Esta semana quick stats */}
            <div className="flex gap-4">
              <div className="text-center px-5 py-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-3xl font-bold text-primary">{stats.loans.thisWeek}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Préstamos<br />esta semana</p>
              </div>
              <div className="text-center px-5 py-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-3xl font-bold text-amber-400">{stats.requests.thisWeek}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Solicitudes<br />esta semana</p>
              </div>
              <div className="text-center px-5 py-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-3xl font-bold text-green-400">{stats.loans.returned}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Devueltos<br />total</p>
              </div>
            </div>
          </div>
          {/* decorative circles */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 right-32 w-40 h-40 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)', transform: 'translateY(50%)' }} />
        </div>

        {/* === ALERTS === */}
        {alerts.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4">
            {alerts.map((alert, i) => (
              <Link key={i} href={alert.href}>
                <div className={`p-4 rounded-xl border-2 ${alert.border} ${alert.bg} hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer group`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${alert.bg}`}><alert.icon className={`h-5 w-5 ${alert.color}`} /></div>
                    <div className="flex-1">
                      <p className={`font-semibold ${alert.color}`}>{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* === 4 STAT CARDS === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Materiales */}
          <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 p-5 bg-gradient-to-br from-primary/15 to-primary/5">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-primary/10 -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-primary/20"><Package className="h-5 w-5 text-primary" /></div>
              <span className="text-5xl font-black text-primary">{stats.materials.total}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Materiales</p>
            <div className="flex gap-3 text-sm">
              <span className="text-green-400 font-semibold">{stats.materials.available} disp.</span>
              <span className="text-violet-400 font-semibold">{stats.materials.inUse} uso</span>
            </div>
          </div>

          {/* Préstamos Activos */}
          <div className="relative overflow-hidden rounded-xl border-2 border-green-500/30 p-5 bg-gradient-to-br from-green-500/15 to-green-500/5">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-green-500/10 -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-green-500/20"><ArrowLeftRight className="h-5 w-5 text-green-400" /></div>
              <span className="text-5xl font-black text-green-400">{stats.loans.active}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Préstamos Activos</p>
            <div className="flex gap-3 text-sm">
              <span className="text-muted-foreground font-semibold">{stats.loans.returned} devueltos</span>
              {stats.loans.overdue > 0 && <span className="text-red-400 font-semibold">{stats.loans.overdue} vencidos</span>}
            </div>
          </div>

          {/* Solicitudes */}
          <div className="relative overflow-hidden rounded-xl border-2 border-amber-500/30 p-5 bg-gradient-to-br from-amber-500/15 to-amber-500/5">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-amber-500/10 -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-amber-500/20"><FileText className="h-5 w-5 text-amber-400" /></div>
              <span className="text-5xl font-black text-amber-400">{stats.requests.pending}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Solicitudes Pendientes</p>
            <div className="flex gap-3 text-sm">
              <span className="text-green-400 font-semibold">{stats.requests.approved} aprob.</span>
              <span className="text-red-400 font-semibold">{stats.requests.rejected} rech.</span>
            </div>
          </div>

          {/* Usuarios */}
          <div className="relative overflow-hidden rounded-xl border-2 border-violet-500/30 p-5 bg-gradient-to-br from-violet-500/15 to-violet-500/5">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-violet-500/10 -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-violet-500/20"><Users className="h-5 w-5 text-violet-400" /></div>
              <span className="text-5xl font-black text-violet-400">{stats.users.total}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Usuarios</p>
            <div className="flex gap-3 text-sm">
              <span className="text-blue-400 font-semibold">{stats.users.inventaristas} admin</span>
              <span className="text-muted-foreground font-semibold">{stats.users.empleados} emp.</span>
            </div>
          </div>
        </div>

        {/* === CHARTS ROW 1: Tendencia 14 días + Top Materiales === */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Tendencia 14 días - area chart */}
          <Card className="border-2 lg:col-span-3">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Activity className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle className="text-lg">Actividad — Últimos 14 días</CardTitle>
                  <p className="text-sm text-muted-foreground">Préstamos y solicitudes por día</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={loanTrendsData}>
                  <defs>
                    <linearGradient id="gradPrestamos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSolicitudes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="date" stroke={chart.tick} style={{ fontSize: '11px' }} tick={{ fill: chart.tick }} />
                  <YAxis stroke={chart.tick} style={{ fontSize: '11px' }} tick={{ fill: chart.tick }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="prestamos" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradPrestamos)" name="Préstamos" dot={false} activeDot={{ r: 5, fill: '#8b5cf6' }} />
                  <Area type="monotone" dataKey="solicitudes" stroke="#f59e0b" strokeWidth={2} fill="url(#gradSolicitudes)" name="Solicitudes" dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top 5 Materiales más prestados */}
          <Card className="border-2 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg"><Star className="h-5 w-5 text-amber-400" /></div>
                <div>
                  <CardTitle className="text-lg">Top Materiales</CardTitle>
                  <p className="text-sm text-muted-foreground">Más prestados</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topMaterialsData.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Sin datos de préstamos</div>
              ) : (
                <div className="space-y-3 mt-1">
                  {topMaterialsData.map((item, i) => {
                    const pct = topMaterialsData[0].count > 0 ? (item.count / topMaterialsData[0].count) * 100 : 0
                    const colors = ['bg-primary', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500']
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                            <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{item.name}</span>
                          </div>
                          <span className="text-sm font-bold text-foreground ml-2">{item.count}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full ${colors[i]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* === CHARTS ROW 2: Estado Materiales + Resumen === */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pie material status */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Package className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle className="text-lg">Estado de Materiales</CardTitle>
                  <p className="text-sm text-muted-foreground">Distribución actual</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={materialStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" stroke="none">
                    {materialStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {materialStatusData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <span className="text-base font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actividad Reciente */}
          <Card className="border-2 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><Clock className="h-5 w-5 text-primary" /></div>
                  <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                </div>
                <Link href="/reports" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver todo <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No hay actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-secondary/15 rounded-xl hover:bg-secondary/25 transition-colors">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${a.type === 'loan' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                        {a.type === 'loan'
                          ? <ArrowLeftRight className="h-4 w-4 text-green-400" />
                          : <FileText className="h-4 w-4 text-amber-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {a.type === 'loan' ? `Préstamo: ${a.title}` : `Solicitud de ${a.user}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.type === 'loan' ? `por ${a.user}` : ''} · {formatDate(a.date)}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(a.status)} className="text-xs px-2 py-0.5 flex-shrink-0">
                        {getStatusLabel(a.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* === RESUMEN RÁPIDO (mini cards) === */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Categorías', value: stats.categories, icon: Tag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Ubicaciones', value: stats.locations, icon: MapPin, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Stock Bajo', value: stats.materials.lowStock, icon: AlertTriangle, color: stats.materials.lowStock > 0 ? 'text-amber-400' : 'text-muted-foreground', bg: 'bg-amber-500/10' },
            { label: 'Vencidos', value: stats.loans.overdue, icon: Zap, color: stats.loans.overdue > 0 ? 'text-red-400' : 'text-muted-foreground', bg: 'bg-red-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 p-4 bg-card rounded-xl border-2 border-border/50 hover:border-border transition-colors">
              <div className={`p-2 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* === ACCESO RÁPIDO === */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-primary/10 rounded-lg"><LayoutGrid className="h-5 w-5 text-primary" /></div>
            <h2 className="text-xl font-bold text-foreground">Acceso Rápido</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map(({ href, icon: Icon, label, value, color, gradient, border }) => (
              <Link key={label} href={href}>
                <div className={`p-5 rounded-xl border-2 ${border} bg-gradient-to-br ${gradient} hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer group`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-white/5"><Icon className={`h-6 w-6 ${color}`} /></div>
                    {value !== undefined && <span className={`text-2xl font-bold ${color}`}>{value}</span>}
                  </div>
                  <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">Ver más</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
