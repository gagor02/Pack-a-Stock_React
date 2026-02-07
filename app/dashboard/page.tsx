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
  TrendingDown,
} from 'lucide-react'
import {
  AreaChart,
  Area,
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

  // Fetch all data
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

  // Normalize data
  const materials = Array.isArray(materialsResponse)
    ? materialsResponse
    : materialsResponse?.results ?? []

  const loans = Array.isArray(loansResponse)
    ? loansResponse
    : loansResponse?.results ?? []

  const requests = Array.isArray(requestsResponse)
    ? requestsResponse
    : requestsResponse?.results ?? []

  const users = Array.isArray(usersResponse)
    ? usersResponse
    : usersResponse?.results ?? []

  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse?.results ?? []

  const locations = Array.isArray(locationsResponse)
    ? locationsResponse
    : locationsResponse?.results ?? []

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      materials: {
        total: materials.length,
        available: materials.filter((m: any) => m.status === 'available').length,
        inUse: materials.filter((m: any) => m.status === 'in_use').length,
        lowStock: materials.filter((m: any) => m.is_low_stock).length,
      },
      loans: {
        active: loans.filter((l: any) => l.status === 'active').length,
        overdue: loans.filter((l: any) => l.is_overdue || l.status === 'overdue')
          .length,
        returned: loans.filter((l: any) => l.status === 'returned').length,
      },
      requests: {
        pending: requests.filter((r: any) => r.status === 'pending').length,
        approved: requests.filter((r: any) => r.status === 'approved').length,
        rejected: requests.filter((r: any) => r.status === 'rejected').length,
      },
      users: {
        total: users.length,
        inventaristas: users.filter((u: any) => u.user_type === 'inventarista')
          .length,
        empleados: users.filter((u: any) => u.user_type === 'empleado').length,
      },
      categories: categories.length,
      locations: locations.length,
    }
  }, [materials, loans, requests, users, categories, locations])

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities: any[] = []

    // Recent loans
    loans.slice(0, 3).forEach((loan: any) => {
      activities.push({
        type: 'loan',
        message: `Préstamo de ${loan.material_detail?.name || 'Material'} a ${
          loan.borrower_detail?.full_name || 'Usuario'
        }`,
        date: loan.created_at || loan.loan_date,
        status: loan.status,
      })
    })

    // Recent requests
    requests.slice(0, 3).forEach((req: any) => {
      activities.push({
        type: 'request',
        message: `Solicitud de ${req.requester_detail?.full_name || 'Usuario'}`,
        date: req.created_at || req.request_date,
        status: req.status,
      })
    })

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [loans, requests])

  // Chart data - Material Status Distribution
  const materialStatusData = useMemo(() => {
    return [
      { name: 'Disponibles', value: stats.materials.available, color: '#22c55e' },
      { name: 'En Uso', value: stats.materials.inUse, color: '#8b5cf6' },
      { name: 'Stock Bajo', value: stats.materials.lowStock, color: '#f59e0b' },
    ].filter(item => item.value > 0)
  }, [stats.materials])

  // Chart data - Loans by Status
  const loansStatusData = useMemo(() => {
    return [
      { name: 'Activos', count: stats.loans.active, color: '#22c55e' },
      { name: 'Vencidos', count: stats.loans.overdue, color: '#ef4444' },
      { name: 'Devueltos', count: stats.loans.returned, color: '#6b7280' },
    ]
  }, [stats.loans])

  // Chart data - Materials by Category
  const materialsByCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>()

    materials.forEach((material: any) => {
      const categoryName = material.category_detail?.name || 'Sin categoría'
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
    })

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [materials])

  // Chart data - Loan Trends (last 7 days)
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
        préstamos: dayLoans.length,
        activos: dayLoans.filter((l: any) => l.status === 'active').length,
        devueltos: dayLoans.filter((l: any) => l.status === 'returned').length,
      }
    })
  }, [loans])

  // Colors for charts
  const CHART_COLORS = {
    primary: '#8b5cf6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    muted: '#6b7280',
  }

  const isLoading =
    materialsLoading || loansLoading || requestsLoading || usersLoading

  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'approved':
      case 'active':
      case 'returned':
        return 'success'
      case 'pending':
        return 'warning'
      case 'rejected':
      case 'overdue':
        return 'danger'
      default:
        return 'default'
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutGrid className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Resumen general del sistema
            </p>
          </div>
        </div>

        {/* Account Info Card */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle>Información de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Empresa</p>
                  <p className="font-medium text-foreground">
                    {user.account?.company_name || 'N/D'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Plan</p>
                  <p className="font-medium text-foreground capitalize">
                    {user.account?.subscription_plan || 'N/D'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="font-medium text-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Rol</p>
                  <Badge variant="default" className="capitalize">
                    {user.user_type}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alert Cards */}
        {!isLoading &&
          (stats.materials.lowStock > 0 ||
            stats.loans.overdue > 0 ||
            stats.requests.pending > 0) && (
            <div className="grid md:grid-cols-3 gap-4">
              {stats.materials.lowStock > 0 && (
                <Link href="/materials">
                  <Card className="border-l-4 border-l-warning hover:shadow-md transition cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            <p className="font-semibold text-foreground">
                              Stock Bajo
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {stats.materials.lowStock} materiales requieren
                            atención
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {stats.loans.overdue > 0 && (
                <Link href="/loans">
                  <Card className="border-l-4 border-l-destructive hover:shadow-md transition cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-5 w-5 text-destructive" />
                            <p className="font-semibold text-foreground">
                              Préstamos Vencidos
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {stats.loans.overdue} préstamos retrasados
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {stats.requests.pending > 0 && (
                <Link href="/loans">
                  <Card className="border-l-4 border-l-warning hover:shadow-md transition cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Bell className="h-5 w-5 text-warning" />
                            <p className="font-semibold text-foreground">
                              Solicitudes Pendientes
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {stats.requests.pending} por revisar
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          )}

        {/* Main Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Materials Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Materiales
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {stats.materials.total}
              </div>
              <div className="flex gap-3 text-sm">
                <div>
                  <span className="text-success font-semibold">
                    {stats.materials.available}
                  </span>
                  <span className="text-muted-foreground"> disponibles</span>
                </div>
                <div>
                  <span className="text-primary font-semibold">
                    {stats.materials.inUse}
                  </span>
                  <span className="text-muted-foreground"> en uso</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loans Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Préstamos
                </div>
                <ArrowLeftRight className="h-8 w-8 text-success" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {stats.loans.active}
              </div>
              <div className="flex gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground font-semibold">
                    {stats.loans.returned}
                  </span>
                  <span className="text-muted-foreground"> devueltos</span>
                </div>
                <div>
                  <span className="text-destructive font-semibold">
                    {stats.loans.overdue}
                  </span>
                  <span className="text-muted-foreground"> vencidos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Solicitudes
                </div>
                <FileText className="h-8 w-8 text-warning" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {stats.requests.pending}
              </div>
              <div className="flex gap-3 text-sm">
                <div>
                  <span className="text-success font-semibold">
                    {stats.requests.approved}
                  </span>
                  <span className="text-muted-foreground"> aprobadas</span>
                </div>
                <div>
                  <span className="text-destructive font-semibold">
                    {stats.requests.rejected}
                  </span>
                  <span className="text-muted-foreground"> rechazadas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Usuarios
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {stats.users.total}
              </div>
              <div className="flex gap-3 text-sm">
                <div>
                  <span className="text-primary font-semibold">
                    {stats.users.inventaristas}
                  </span>
                  <span className="text-muted-foreground"> admin</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">
                    {stats.users.empleados}
                  </span>
                  <span className="text-muted-foreground"> empleados</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Loan Trends Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tendencia de Préstamos</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Últimos 7 días
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={loanTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="préstamos"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.primary, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="activos"
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.success, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="devueltos"
                    stroke={CHART_COLORS.muted}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.muted, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Loans by Status Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Préstamos por Estado</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribución actual
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loansStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {loansStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Materials by Category Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Materiales por Categoría</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Top 6 categorías
                  </p>
                </div>
                <Tag className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={materialsByCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Material Status Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Estado de Materiales</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribución por estado
                  </p>
                </div>
                <Package className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={materialStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {materialStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {materialStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay actividad reciente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 pb-4 border-b border-border last:border-0"
                      >
                        <div className="mt-1.5">
                          {activity.type === 'loan' ? (
                            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            {activity.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.date).toLocaleDateString(
                              'es-ES',
                              {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(activity.status)}>
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Categorías
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {stats.categories}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Ubicaciones
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {stats.locations}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Materiales con stock bajo
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      stats.materials.lowStock > 0
                        ? 'text-warning'
                        : 'text-success'
                    }`}
                  >
                    {stats.materials.lowStock}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Préstamos vencidos
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      stats.loans.overdue > 0 ? 'text-destructive' : 'text-success'
                    }`}
                  >
                    {stats.loans.overdue}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Acceso Rápido
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Link href="/materials">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Materiales
                    </h3>
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Gestionar inventario
                  </p>
                  <div className="text-2xl font-bold text-primary">
                    {stats.materials.total}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/categories">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Categorías
                    </h3>
                    <Tag className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Tipos de materiales
                  </p>
                  <div className="text-2xl font-bold text-primary">
                    {stats.categories}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/locations">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Ubicaciones
                    </h3>
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Almacenes y bodegas
                  </p>
                  <div className="text-2xl font-bold text-primary">
                    {stats.locations}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/loans">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Préstamos
                    </h3>
                    <ArrowLeftRight className="h-8 w-8 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Préstamos activos
                  </p>
                  <div className="text-2xl font-bold text-success">
                    {stats.loans.active}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/users">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Usuarios
                    </h3>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Total usuarios
                  </p>
                  <div className="text-2xl font-bold text-primary">
                    {stats.users.total}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/reports">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Reportes
                    </h3>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Estadísticas
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Ver detalles →
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/labels">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Etiquetas QR
                    </h3>
                    <QrCode className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generar e imprimir
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Imprimir →
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings">
              <Card className="hover:shadow-md transition cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
                      Configuración
                    </h3>
                    <Settings className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Cuenta y seguridad
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Configurar →
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
