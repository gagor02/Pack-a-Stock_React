'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import api from '@/lib/api'
import Link from 'next/link'
import {
  Package,
  ArrowLeftRight,
  FileText,
  Users,
  Tag,
  MapPin,
  AlertTriangle,
  Clock,
  Bell,
  LayoutGrid,
  BarChart3,
  QrCode,
  Settings,
  TrendingUp,
  ArrowRight,
  Shield,
  Building2,
  ChevronRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: materialsResponse, isLoading: materialsLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const response = await api.get('/materials/materials/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const { data: loansResponse, isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const response = await api.get('/loans/loans/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const { data: requestsResponse, isLoading: requestsLoading } = useQuery({
    queryKey: ['loan-requests'],
    queryFn: async () => {
      const response = await api.get('/loans/loan-requests/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/auth/users/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/materials/categories/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const { data: locationsResponse } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.get('/materials/locations/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const materials = Array.isArray(materialsResponse) ? materialsResponse : materialsResponse?.results ?? []
  const loans = Array.isArray(loansResponse) ? loansResponse : loansResponse?.results ?? []
  const requests = Array.isArray(requestsResponse) ? requestsResponse : requestsResponse?.results ?? []
  const users = Array.isArray(usersResponse) ? usersResponse : usersResponse?.results ?? []
  const categories = Array.isArray(categoriesResponse) ? categoriesResponse : categoriesResponse?.results ?? []
  const locations = Array.isArray(locationsResponse) ? locationsResponse : locationsResponse?.results ?? []

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
    },
    requests: {
      pending: requests.filter((r: any) => r.status === 'pending').length,
      approved: requests.filter((r: any) => r.status === 'approved').length,
      rejected: requests.filter((r: any) => r.status === 'rejected').length,
    },
    users: {
      total: users.length,
      inventaristas: users.filter((u: any) => u.user_type === 'inventarista').length,
      empleados: users.filter((u: any) => u.user_type === 'empleado').length,
    },
    categories: categories.length,
    locations: locations.length,
  }), [materials, loans, requests, users, categories, locations])

  const recentActivity = useMemo(() => {
    const activities: any[] = []
    loans.slice(0, 3).forEach((loan: any) => {
      activities.push({
        type: 'loan',
        message: `Prestamo de ${loan.material_detail?.name || 'Material'} a ${loan.borrower_detail?.full_name || 'Usuario'}`,
        date: loan.created_at || loan.loan_date,
        status: loan.status,
      })
    })
    requests.slice(0, 3).forEach((req: any) => {
      activities.push({
        type: 'request',
        message: `Solicitud de ${req.requester_detail?.full_name || 'Usuario'}`,
        date: req.created_at || req.request_date,
        status: req.status,
      })
    })
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  }, [loans, requests])

  const materialStatusData = useMemo(() => {
    return [
      { name: 'Disponibles', value: stats.materials.available, color: '#22c55e' },
      { name: 'En Uso', value: stats.materials.inUse, color: '#8b5cf6' },
      { name: 'Stock Bajo', value: stats.materials.lowStock, color: '#f59e0b' },
    ].filter(item => item.value > 0)
  }, [stats.materials])

  const loansStatusData = useMemo(() => [
    { name: 'Activos', count: stats.loans.active, color: '#22c55e' },
    { name: 'Vencidos', count: stats.loans.overdue, color: '#ef4444' },
    { name: 'Devueltos', count: stats.loans.returned, color: '#6b7280' },
  ], [stats.loans])

  const materialsByCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    materials.forEach((material: any) => {
      const categoryName = material.category_detail?.name || 'Sin categoria'
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
    })
    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [materials])

  const loanTrendsData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })
    return last7Days.map(date => {
      const dayLoans = loans.filter((loan: any) => {
        const loanDate = new Date(loan.created_at || loan.issued_at).toISOString().split('T')[0]
        return loanDate === date
      })
      return {
        date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        prestamos: dayLoans.length,
        activos: dayLoans.filter((l: any) => l.status === 'active').length,
        devueltos: dayLoans.filter((l: any) => l.status === 'returned').length,
      }
    })
  }, [loans])

  const CHART_COLORS = {
    primary: '#8b5cf6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    muted: '#6b7280',
  }

  const isLoading = materialsLoading || loansLoading || requestsLoading || usersLoading

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: 'Activo', returned: 'Devuelto', overdue: 'Vencido',
      pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada',
    }
    return map[status] || status
  }

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'approved': case 'active': case 'returned': return 'success'
      case 'pending': return 'warning'
      case 'rejected': case 'overdue': return 'danger'
      default: return 'default'
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  // Alert items
  const alerts = [
    stats.materials.lowStock > 0 && {
      href: '/materials', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30',
      title: 'Stock Bajo', desc: `${stats.materials.lowStock} materiales requieren atencion`,
    },
    stats.loans.overdue > 0 && {
      href: '/loans', icon: Clock, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30',
      title: 'Prestamos Vencidos', desc: `${stats.loans.overdue} prestamos retrasados`,
    },
    stats.requests.pending > 0 && {
      href: '/requests', icon: Bell, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
      title: 'Solicitudes Pendientes', desc: `${stats.requests.pending} por revisar`,
    },
  ].filter(Boolean) as any[]

  // Quick action links
  const quickLinks = [
    { href: '/materials', icon: Package, label: 'Materiales', value: stats.materials.total, color: 'text-primary', bg: 'from-primary/15 to-primary/5', border: 'border-primary/20' },
    { href: '/categories', icon: Tag, label: 'Categorias', value: stats.categories, color: 'text-blue-400', bg: 'from-blue-500/15 to-blue-500/5', border: 'border-blue-500/20' },
    { href: '/locations', icon: MapPin, label: 'Ubicaciones', value: stats.locations, color: 'text-green-400', bg: 'from-green-500/15 to-green-500/5', border: 'border-green-500/20' },
    { href: '/loans', icon: ArrowLeftRight, label: 'Prestamos', value: stats.loans.active, color: 'text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/20' },
    { href: '/users', icon: Users, label: 'Usuarios', value: stats.users.total, color: 'text-violet-400', bg: 'from-violet-500/15 to-violet-500/5', border: 'border-violet-500/20' },
    { href: '/requests', icon: FileText, label: 'Solicitudes', value: stats.requests.pending, color: 'text-amber-400', bg: 'from-amber-500/15 to-amber-500/5', border: 'border-amber-500/20' },
    { href: '/labels', icon: QrCode, label: 'Etiquetas QR', color: 'text-cyan-400', bg: 'from-cyan-500/15 to-cyan-500/5', border: 'border-cyan-500/20' },
    { href: '/settings', icon: Settings, label: 'Configuracion', color: 'text-gray-400', bg: 'from-gray-500/15 to-gray-500/5', border: 'border-gray-500/20' },
  ]

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
          <p className="text-base text-muted-foreground">Cargando dashboard...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/20 p-8">
          <div className="relative z-10">
            <p className="text-base text-muted-foreground mb-1">Bienvenido de vuelta,</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {user?.full_name || user?.email || 'Administrador'}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {user?.account?.company_name && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-lg">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{user.account.company_name}</span>
                </div>
              )}
              {user?.account?.subscription_plan && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-lg">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground capitalize">Plan {user.account.subscription_plan}</span>
                </div>
              )}
              <Badge variant="default" className="text-sm px-3 py-1 capitalize">
                {user?.user_type === 'inventarista' ? 'Administrador' : 'Empleado'}
              </Badge>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 right-20 w-32 h-32 bg-primary/5 rounded-full translate-y-1/2"></div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4">
            {alerts.map((alert, i) => (
              <Link key={i} href={alert.href}>
                <div className={`p-4 rounded-xl border-2 ${alert.border} ${alert.bg} hover:shadow-lg transition-all duration-200 cursor-pointer group`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${alert.bg}`}>
                      <alert.icon className={`h-5 w-5 ${alert.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-base font-semibold ${alert.color}`}>{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.desc}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Materials */}
          <div className="p-5 rounded-xl border-2 border-border/50 bg-card hover:border-primary/30 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-primary/20">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <span className="text-4xl font-bold text-primary">{stats.materials.total}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Materiales</p>
            <div className="flex gap-3 text-sm">
              <span className="text-green-400 font-semibold">{stats.materials.available} disp.</span>
              <span className="text-violet-400 font-semibold">{stats.materials.inUse} en uso</span>
            </div>
          </div>

          {/* Loans */}
          <div className="p-5 rounded-xl border-2 border-border/50 bg-card hover:border-green-500/30 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-green-500/20">
                <ArrowLeftRight className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-4xl font-bold text-green-400">{stats.loans.active}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Prestamos Activos</p>
            <div className="flex gap-3 text-sm">
              <span className="text-muted-foreground font-semibold">{stats.loans.returned} devueltos</span>
              {stats.loans.overdue > 0 && <span className="text-red-400 font-semibold">{stats.loans.overdue} vencidos</span>}
            </div>
          </div>

          {/* Requests */}
          <div className="p-5 rounded-xl border-2 border-border/50 bg-card hover:border-amber-500/30 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-amber-500/20">
                <FileText className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-4xl font-bold text-amber-400">{stats.requests.pending}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Solicitudes Pendientes</p>
            <div className="flex gap-3 text-sm">
              <span className="text-green-400 font-semibold">{stats.requests.approved} aprobadas</span>
              <span className="text-red-400 font-semibold">{stats.requests.rejected} rechazadas</span>
            </div>
          </div>

          {/* Users */}
          <div className="p-5 rounded-xl border-2 border-border/50 bg-card hover:border-violet-500/30 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-violet-500/20">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <span className="text-4xl font-bold text-violet-400">{stats.users.total}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Usuarios</p>
            <div className="flex gap-3 text-sm">
              <span className="text-blue-400 font-semibold">{stats.users.inventaristas} admin</span>
              <span className="text-muted-foreground font-semibold">{stats.users.empleados} empleados</span>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Loan Trends */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tendencia de Prestamos</CardTitle>
                    <p className="text-sm text-muted-foreground">Ultimos 7 dias</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={loanTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px' }} labelStyle={{ color: '#f3f4f6' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="prestamos" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ fill: CHART_COLORS.primary, r: 5 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="activos" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ fill: CHART_COLORS.success, r: 4 }} />
                  <Line type="monotone" dataKey="devueltos" stroke={CHART_COLORS.muted} strokeWidth={2} dot={{ fill: CHART_COLORS.muted, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Loans by Status */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Prestamos por Estado</CardTitle>
                  <p className="text-sm text-muted-foreground">Distribucion actual</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loansStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px' }} labelStyle={{ color: '#f3f4f6' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {loansStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Materials by Category */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Materiales por Categoria</CardTitle>
                  <p className="text-sm text-muted-foreground">Top 6 categorias</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={materialsByCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" style={{ fontSize: '12px' }} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px' }} labelStyle={{ color: '#f3f4f6' }} />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Material Status Distribution */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Estado de Materiales</CardTitle>
                  <p className="text-sm text-muted-foreground">Distribucion por estado</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={materialStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#1f2937"
                  >
                    {materialStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2.5">
                {materialStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-secondary/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-base text-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity + Summary */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-4">
                      <Clock className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-base text-muted-foreground">No hay actividad reciente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-secondary/20 rounded-xl hover:bg-secondary/30 transition-colors"
                      >
                        <div className={`p-2.5 rounded-lg ${activity.type === 'loan' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                          {activity.type === 'loan' ? (
                            <ArrowLeftRight className={`h-5 w-5 ${activity.type === 'loan' ? 'text-green-400' : 'text-amber-400'}`} />
                          ) : (
                            <FileText className="h-5 w-5 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-foreground truncate">
                            {activity.message}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(activity.status)} className="text-sm px-3 py-1">
                          {getStatusLabel(activity.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Resumen</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-blue-400" />
                  <span className="text-base text-foreground">Categorias</span>
                </div>
                <span className="text-xl font-bold text-blue-400">{stats.categories}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-green-400" />
                  <span className="text-base text-foreground">Ubicaciones</span>
                </div>
                <span className="text-xl font-bold text-green-400">{stats.locations}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-base text-foreground">Stock Bajo</span>
                </div>
                <span className={`text-xl font-bold ${stats.materials.lowStock > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {stats.materials.lowStock}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-red-400" />
                  <span className="text-base text-foreground">Vencidos</span>
                </div>
                <span className={`text-xl font-bold ${stats.loans.overdue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {stats.loans.overdue}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Acceso Rapido</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map(({ href, icon: Icon, label, value, color, bg, border }) => (
              <Link key={href} href={href}>
                <div className={`p-5 rounded-xl border-2 ${border} bg-gradient-to-br ${bg} hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer group`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg bg-white/5`}>
                      <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    {value !== undefined && (
                      <span className={`text-2xl font-bold ${color}`}>{value}</span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {label}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-muted-foreground">Ver mas</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
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
