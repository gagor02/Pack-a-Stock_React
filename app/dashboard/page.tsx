'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  // Fetch all data
  const { data: materialsResponse, isLoading: materialsLoading, error: materialsError } = useQuery({
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

  const handleLogout = () => {
    logout()
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.push('/login')
  }

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
    const today = new Date()
    
    return {
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
    }
  }, [materials, loans, requests, users, categories, locations])

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities: any[] = []

    // Recent loans
    loans.slice(0, 3).forEach((loan: any) => {
      activities.push({
        type: 'loan',
        message: `Préstamo de ${loan.material_detail?.name || 'Material'} a ${loan.borrower_detail?.full_name || 'Usuario'}`,
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

    return activities.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 5)
  }, [loans, requests])

  const isLoading = materialsLoading || loansLoading || requestsLoading || usersLoading

  // Show loading state briefly, then continue if data is taking too long
  if (isLoading && !materialsResponse && !loansResponse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pack-a-Stock</h1>
            <p className="text-sm text-gray-500 mt-1">Panel de Control</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Info */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-4">Información de la Cuenta</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Empresa</p>
              <p className="font-semibold text-lg">{user.account?.company_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Plan</p>
              <p className="font-semibold text-lg capitalize">{user.account?.subscription_plan || 'N/A'}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Email</p>
              <p className="font-semibold text-lg truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Rol</p>
              <p className="font-semibold text-lg capitalize">{user.user_type}</p>
            </div>
          </div>
        </div>

        {/* Alert Cards */}
        {!isLoading && (stats.materials.lowStock > 0 || stats.loans.overdue > 0 || stats.requests.pending > 0) && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {stats.materials.lowStock > 0 && (
              <Link href="/materials" className="bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-800 font-semibold">Stock Bajo</p>
                    <p className="text-amber-600 text-sm">{stats.materials.lowStock} materiales requieren atención</p>
                  </div>
                  <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </Link>
            )}
            {stats.loans.overdue > 0 && (
              <Link href="/loans" className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-800 font-semibold">Préstamos Vencidos</p>
                    <p className="text-red-600 text-sm">{stats.loans.overdue} préstamos retrasados</p>
                  </div>
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </Link>
            )}
            {stats.requests.pending > 0 && (
              <Link href="/requests" className="bg-orange-50 border-l-4 border-orange-500 rounded-lg shadow p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-800 font-semibold">Solicitudes Pendientes</p>
                    <p className="text-orange-600 text-sm">{stats.requests.pending} por revisar</p>
                  </div>
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Materials Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-500">Materiales</div>
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.materials.total}</div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-green-600 font-semibold">{stats.materials.available}</span>
                <span className="text-gray-500"> disponibles</span>
              </div>
              <div>
                <span className="text-blue-600 font-semibold">{stats.materials.inUse}</span>
                <span className="text-gray-500"> en uso</span>
              </div>
            </div>
          </div>

          {/* Loans Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-500">Préstamos</div>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.loans.active}</div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-600 font-semibold">{stats.loans.returned}</span>
                <span className="text-gray-500"> devueltos</span>
              </div>
              <div>
                <span className="text-red-600 font-semibold">{stats.loans.overdue}</span>
                <span className="text-gray-500"> vencidos</span>
              </div>
            </div>
          </div>

          {/* Requests Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-500">Solicitudes</div>
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 8H7a2 2 0 01-2-2V6a2 2 0 012-2h7l5 5v9a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.requests.pending}</div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-green-600 font-semibold">{stats.requests.approved}</span>
                <span className="text-gray-500"> aprobadas</span>
              </div>
              <div>
                <span className="text-red-600 font-semibold">{stats.requests.rejected}</span>
                <span className="text-gray-500"> rechazadas</span>
              </div>
            </div>
          </div>

          {/* Users Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-500">Usuarios</div>
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.users.total}</div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-indigo-600 font-semibold">{stats.users.inventaristas}</span>
                <span className="text-gray-500"> admin</span>
              </div>
              <div>
                <span className="text-gray-600 font-semibold">{stats.users.empleados}</span>
                <span className="text-gray-500"> empleados</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
            </div>
            <div className="p-6">
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay actividad reciente</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className={`mt-1 w-2 h-2 rounded-full ${
                        activity.status === 'active' || activity.status === 'approved' ? 'bg-green-500' :
                        activity.status === 'pending' ? 'bg-orange-500' :
                        activity.status === 'rejected' || activity.status === 'overdue' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.date).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        activity.status === 'active' || activity.status === 'approved' ? 'bg-green-100 text-green-700' :
                        activity.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        activity.status === 'rejected' || activity.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Resumen</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Categorías</span>
                <span className="text-lg font-bold text-gray-900">{stats.categories}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ubicaciones</span>
                <span className="text-lg font-bold text-gray-900">{stats.locations}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-gray-600">Materiales con stock bajo</span>
                <span className={`text-lg font-bold ${stats.materials.lowStock > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {stats.materials.lowStock}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Préstamos vencidos</span>
                <span className={`text-lg font-bold ${stats.loans.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.loans.overdue}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acceso Rápido</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Link
              href="/materials"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">Materiales</h3>
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Gestionar inventario</p>
              <div className="mt-3 text-2xl font-bold text-blue-600">{stats.materials.total}</div>
            </Link>

            <Link
              href="/categories"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-indigo-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition">Categorías</h3>
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Tipos de materiales</p>
              <div className="mt-3 text-2xl font-bold text-indigo-600">{stats.categories}</div>
            </Link>

            <Link
              href="/locations"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-amber-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-600 transition">Ubicaciones</h3>
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Almacenes y bodegas</p>
              <div className="mt-3 text-2xl font-bold text-amber-600">{stats.locations}</div>
            </Link>

            <Link
              href="/loans"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-green-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition">Préstamos</h3>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Préstamos activos</p>
              <div className="mt-3 text-2xl font-bold text-green-600">{stats.loans.active}</div>
            </Link>

            <Link
              href="/requests"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-orange-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition">Solicitudes</h3>
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 8H7a2 2 0 01-2-2V6a2 2 0 012-2h7l5 5v9a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Por revisar</p>
              <div className="mt-3 text-2xl font-bold text-orange-600">{stats.requests.pending}</div>
            </Link>

            <Link
              href="/users"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-purple-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition">Usuarios</h3>
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Total usuarios</p>
              <div className="mt-3 text-2xl font-bold text-purple-600">{stats.users.total}</div>
            </Link>

            <Link
              href="/reports"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-sky-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-sky-600 transition">Reportes</h3>
                <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10V4M5 21h14" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Estadísticas</p>
              <div className="mt-3 text-sm text-gray-500">Ver detalles →</div>
            </Link>

            <Link
              href="/labels"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-emerald-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition">Etiquetas QR</h3>
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5h4v4H5V5zm10 0h4v4h-4V5zM5 15h4v4H5v-4zm10 4h4v-4h-4v4z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Generar e imprimir</p>
              <div className="mt-3 text-sm text-gray-500">Imprimir →</div>
            </Link>

            <Link
              href="/settings"
              className="group bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-gray-500 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition">Configuración</h3>
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Cuenta y seguridad</p>
              <div className="mt-3 text-sm text-gray-500">Configurar →</div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
