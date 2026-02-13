'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import AdminLayout from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  Users, Search, Shield, User, Building2, Calendar, Ban,
} from 'lucide-react'
import { useAdminUsers } from '@/hooks/useAdmin'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/login'); return }
    if (user && !user.is_superuser) { router.push('/dashboard'); return }
  }, [router, user])

  const { data: users = [], isLoading } = useAdminUsers()

  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === '' ? true : u.user_type === filterType
    return matchesSearch && matchesFilter
  })

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  return (
    <AdminLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl border border-blue-500/20">
            <Users className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Usuarios</h1>
            <p className="text-base text-muted-foreground mt-1">
              Todos los usuarios del sistema ({users.length})
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors md:w-52"
          >
            <option value="">Todos</option>
            <option value="inventarista">Inventaristas</option>
            <option value="employee">Empleados</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <Users className="h-14 w-14 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">No se encontraron usuarios</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredUsers.map((u: any) => {
              const isAdmin = u.user_type === 'inventarista'
              return (
                <Card
                  key={u.id}
                  className={`border-l-4 ${isAdmin ? 'border-l-blue-500' : 'border-l-green-500'} ${u.is_blocked ? 'opacity-60' : ''} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2.5 rounded-xl ${isAdmin ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                            {isAdmin ? (
                              <Shield className={`h-6 w-6 text-blue-400`} />
                            ) : (
                              <User className={`h-6 w-6 text-green-400`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-foreground truncate">{u.full_name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                            <Badge variant={isAdmin ? 'info' : 'default'} className="text-sm px-3 py-1">
                              {isAdmin ? 'Inventarista' : 'Empleado'}
                            </Badge>
                            {u.is_blocked && (
                              <Badge variant="danger" className="text-sm px-3 py-1">
                                <Ban className="h-3 w-3 mr-1" />
                                Bloqueado
                              </Badge>
                            )}
                            <Badge variant={u.is_active ? 'success' : 'danger'} className="text-sm px-3 py-1">
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <Building2 className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Empresa</p>
                              <p className="text-base font-medium text-foreground truncate">{u.account?.company_name || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                              <Shield className="h-4 w-4 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Plan</p>
                              <p className="text-base font-medium text-foreground">{u.account?.subscription_plan || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                              <Calendar className="h-4 w-4 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Registro</p>
                              <p className="text-sm font-medium text-foreground">{formatDate(u.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
