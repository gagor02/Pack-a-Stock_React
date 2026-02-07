'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  BarChart3,
  Download,
  FileText,
  Package,
  ArrowLeftRight,
  Users,
  Calendar,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type ReportType = 'materials' | 'loans' | 'users' | 'overview'

export default function ReportsPage() {
  const router = useRouter()
  const [selectedReport, setSelectedReport] = useState<ReportType>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

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

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      materials: {
        total: materials.length,
        available: materials.filter((m: any) => m.status === 'available').length,
        inUse: materials.filter((m: any) => m.status === 'in_use').length,
        lowStock: materials.filter((m: any) => m.is_low_stock).length,
        byCategory: categories.map((cat: any) => ({
          name: cat.name,
          count: materials.filter((m: any) => m.category === cat.id).length,
        })),
      },
      loans: {
        total: loans.length,
        active: loans.filter((l: any) => l.status === 'active').length,
        overdue: loans.filter((l: any) => l.status === 'overdue' || l.is_overdue).length,
        returned: loans.filter((l: any) => l.status === 'returned').length,
      },
      requests: {
        total: requests.length,
        pending: requests.filter((r: any) => r.status === 'pending').length,
        approved: requests.filter((r: any) => r.status === 'approved').length,
        rejected: requests.filter((r: any) => r.status === 'rejected').length,
      },
      users: {
        total: users.length,
        inventaristas: users.filter((u: any) => u.user_type === 'inventarista').length,
        empleados: users.filter((u: any) => u.user_type === 'empleado').length,
      },
    }
  }, [materials, loans, requests, users, categories])

  // Top borrowed materials
  const topBorrowedMaterials = useMemo(() => {
    const materialLoans = new Map<number, { name: string; count: number }>()

    loans.forEach((loan: any) => {
      const materialId = loan.material
      const materialName = loan.material_detail?.name || 'Desconocido'

      if (materialLoans.has(materialId)) {
        materialLoans.get(materialId)!.count++
      } else {
        materialLoans.set(materialId, { name: materialName, count: 1 })
      }
    })

    return Array.from(materialLoans.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [loans])

  // Most active borrowers
  const mostActiveBorrowers = useMemo(() => {
    const borrowerLoans = new Map<number, { name: string; count: number }>()

    loans.forEach((loan: any) => {
      const borrowerId = loan.borrower
      const borrowerName = loan.borrower_detail?.full_name || 'Desconocido'

      if (borrowerLoans.has(borrowerId)) {
        borrowerLoans.get(borrowerId)!.count++
      } else {
        borrowerLoans.set(borrowerId, { name: borrowerName, count: 1 })
      }
    })

    return Array.from(borrowerLoans.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [loans])

  // Loan trends by month
  const loanTrendsByMonth = useMemo(() => {
    const monthlyData = new Map<string, number>()

    loans.forEach((loan: any) => {
      const date = new Date(loan.created_at || loan.issued_at)
      const monthKey = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })

      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1)
    })

    return Array.from(monthlyData.entries())
      .map(([month, count]) => ({ month, préstamos: count }))
      .slice(-6)
  }, [loans])

  // Request approval rate
  const requestStats = useMemo(() => {
    return [
      { name: 'Aprobadas', value: stats.requests.approved, color: '#22c55e' },
      { name: 'Rechazadas', value: stats.requests.rejected, color: '#ef4444' },
      { name: 'Pendientes', value: stats.requests.pending, color: '#f59e0b' },
    ].filter(item => item.value > 0)
  }, [stats.requests])

  const isLoading = materialsLoading || loansLoading || requestsLoading || usersLoading

  // Export function placeholder
  const handleExport = (format: 'excel' | 'pdf') => {
    // TODO: Implement actual export functionality
    alert(`Exportando reporte en formato ${format.toUpperCase()}...`)
  }

  // Filter materials by search
  const filteredMaterials = useMemo(() => {
    return materials.filter((m: any) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [materials, searchTerm])

  // Filter loans by search
  const filteredLoans = useMemo(() => {
    return loans.filter((l: any) =>
      l.material_detail?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.borrower_detail?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [loans, searchTerm])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reportes y Análisis</h1>
              <p className="text-sm text-muted-foreground">
                Estadísticas y métricas del sistema
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('excel')} variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={() => handleExport('pdf')} variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              selectedReport === 'overview'
                ? 'border-primary shadow-md'
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedReport('overview')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Vista General</p>
                  <p className="text-xs text-muted-foreground">Resumen completo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              selectedReport === 'materials'
                ? 'border-primary shadow-md'
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedReport('materials')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Materiales</p>
                  <p className="text-xs text-muted-foreground">{stats.materials.total} items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              selectedReport === 'loans'
                ? 'border-primary shadow-md'
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedReport('loans')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <ArrowLeftRight className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Préstamos</p>
                  <p className="text-xs text-muted-foreground">{stats.loans.total} registros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              selectedReport === 'users'
                ? 'border-primary shadow-md'
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedReport('users')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Usuarios</p>
                  <p className="text-xs text-muted-foreground">{stats.users.total} usuarios</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overview Report */}
        {selectedReport === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      Total Materiales
                    </div>
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {stats.materials.total}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success">{stats.materials.available} disponibles</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      Préstamos Activos
                    </div>
                    <ArrowLeftRight className="h-8 w-8 text-success" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {stats.loans.active}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">{stats.loans.overdue} vencidos</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      Solicitudes Pendientes
                    </div>
                    <FileText className="h-8 w-8 text-warning" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {stats.requests.pending}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-success">{stats.requests.approved} aprobadas</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      Stock Bajo
                    </div>
                    <AlertCircle className="h-8 w-8 text-warning" />
                  </div>
                  <div className="text-3xl font-bold text-warning mb-2">
                    {stats.materials.lowStock}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">Requiere atención</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Loan Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia de Préstamos (6 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={loanTrendsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="préstamos"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Request Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Solicitudes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={requestStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        dataKey="value"
                      >
                        {requestStats.map((entry, index) => (
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
                </CardContent>
              </Card>
            </div>

            {/* Top Lists Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Borrowed Materials */}
              <Card>
                <CardHeader>
                  <CardTitle>Materiales Más Prestados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topBorrowedMaterials.slice(0, 5).map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between pb-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {item.name}
                          </span>
                        </div>
                        <Badge variant="default">{item.count} préstamos</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Active Borrowers */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuarios Más Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mostActiveBorrowers.slice(0, 5).map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between pb-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success font-semibold text-sm">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {item.name}
                          </span>
                        </div>
                        <Badge variant="success">{item.count} préstamos</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Materials Report */}
        {selectedReport === 'materials' && (
          <>
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar materiales por nombre o SKU..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="secondary">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Materials Table */}
            <Card>
              <CardHeader>
                <CardTitle>Inventario de Materiales ({filteredMaterials.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border">
                      <tr className="text-left">
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Material
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          SKU
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Categoría
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Stock
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Disponible
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.slice(0, 20).map((material: any) => (
                        <tr key={material.id} className="border-b border-border last:border-0">
                          <td className="py-3 text-sm font-medium text-foreground">
                            {material.name}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {material.sku || 'N/A'}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {material.category_detail?.name || 'Sin categoría'}
                          </td>
                          <td className="py-3 text-sm text-foreground">{material.quantity}</td>
                          <td className="py-3 text-sm text-foreground">
                            {material.available_quantity}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                material.is_low_stock
                                  ? 'warning'
                                  : material.status === 'available'
                                  ? 'success'
                                  : 'default'
                              }
                            >
                              {material.is_low_stock
                                ? 'Stock Bajo'
                                : material.status === 'available'
                                ? 'Disponible'
                                : material.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Materials by Category Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Materiales por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.materials.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}

        {/* Loans Report */}
        {selectedReport === 'loans' && (
          <>
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar préstamos por material o usuario..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="secondary">
                    <Calendar className="h-4 w-4 mr-2" />
                    Rango de Fechas
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loans Table */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Préstamos ({filteredLoans.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border">
                      <tr className="text-left">
                        <th className="pb-3 text-sm font-medium text-muted-foreground">ID</th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Material
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Solicitante
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Cantidad
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Fecha Préstamo
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Fecha Retorno
                        </th>
                        <th className="pb-3 text-sm font-medium text-muted-foreground">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoans.slice(0, 20).map((loan: any) => (
                        <tr key={loan.id} className="border-b border-border last:border-0">
                          <td className="py-3 text-sm font-medium text-foreground">
                            #{loan.id}
                          </td>
                          <td className="py-3 text-sm text-foreground">
                            {loan.material_detail?.name || 'N/A'}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {loan.borrower_detail?.full_name || 'N/A'}
                          </td>
                          <td className="py-3 text-sm text-foreground">
                            {loan.quantity_loaned}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {new Date(loan.issued_at || loan.created_at).toLocaleDateString(
                              'es-ES'
                            )}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {loan.expected_return_date
                              ? new Date(loan.expected_return_date).toLocaleDateString('es-ES')
                              : 'N/A'}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                loan.status === 'active'
                                  ? 'success'
                                  : loan.status === 'overdue'
                                  ? 'danger'
                                  : loan.status === 'returned'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {loan.status === 'active'
                                ? 'Activo'
                                : loan.status === 'overdue'
                                ? 'Vencido'
                                : loan.status === 'returned'
                                ? 'Devuelto'
                                : loan.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Users Report */}
        {selectedReport === 'users' && (
          <>
            {/* User Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      Total Usuarios
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{stats.users.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      Inventaristas
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {stats.users.inventaristas}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">Empleados</div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {stats.users.empleados}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Most Active Users */}
            <Card>
              <CardHeader>
                <CardTitle>Usuarios Más Activos (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={mostActiveBorrowers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
