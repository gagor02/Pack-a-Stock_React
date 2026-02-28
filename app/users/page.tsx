'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCog,
  User,
  Shield,
  AlertTriangle,
  Mail,
  UserCheck,
  UserX,
  X,
  Package,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface UserItem {
  id: number
  email: string
  full_name?: string
  user_type: 'inventarista' | 'employee'
  is_active: boolean
  is_blocked?: boolean
  blocked_reason?: string
  blocked_until?: string | null
}

interface UserFormData {
  email: string
  full_name: string
  password: string
  user_type: 'inventarista' | 'employee'
  is_active: boolean
}

interface BlockFormData {
  days: number
  customDays: string
  reason: string
}

const DAY_PRESETS = [1, 3, 7, 15, 30]

export default function UsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; activeLoans: number; pendingRequests: number; loanMaterials: string[] } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [blockModal, setBlockModal] = useState<{ id: number; name: string } | null>(null)
  const [blockForm, setBlockForm] = useState<BlockFormData>({ days: 7, customDays: '', reason: '' })
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    password: '',
    user_type: 'employee',
    is_active: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: usersResponse = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/auth/users/')
      return response.data
    },
  })

  const users: UserItem[] = Array.isArray(usersResponse)
    ? usersResponse
    : usersResponse?.results ?? []

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get('/accounts/accounts/')
      return response.data
    },
  })

  const account = (() => {
    const accs = Array.isArray(accountsResponse) ? accountsResponse : accountsResponse?.results ?? []
    return accs.length > 0 ? accs[0] : null
  })()

  const maxUsers = account?.max_users ?? 0
  const isAtUserLimit = maxUsers !== -1 && users.length >= maxUsers

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.user_type === 'inventarista').length,
    employees: users.filter((u) => u.user_type === 'employee').length,
    inactive: users.filter((u) => !u.is_active).length,
    blocked: users.filter((u) => u.is_blocked).length,
  }), [users])

  const filteredUsers = users.filter((user: UserItem) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const payload = {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        user_type: data.user_type,
      }
      const response = await api.post('/auth/users/', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario creado exitosamente')
      resetForm()
      setShowForm(false)
    },
    onError: (error: any) => {
      const data = error.response?.data
      const msg = data?.message || data?.error || (typeof data === 'object' ? JSON.stringify(data) : null) || 'Error al crear usuario'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserFormData }) => {
      const payload = {
        full_name: data.full_name,
        user_type: data.user_type,
        is_active: data.is_active,
      }
      const response = await api.patch(`/auth/users/${id}/`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario actualizado exitosamente')
      resetForm()
      setEditingId(null)
      setShowForm(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al actualizar usuario')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/auth/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario eliminado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al eliminar usuario')
    },
  })

  const blockMutation = useMutation({
    mutationFn: async ({ id, days, reason }: { id: number; days: number; reason: string }) => {
      const blocked_until = new Date()
      blocked_until.setDate(blocked_until.getDate() + days)
      const response = await api.put(`/auth/users/${id}/block/`, {
        is_blocked: true,
        blocked_reason: reason,
        blocked_until: blocked_until.toISOString(),
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario penalizado')
      setBlockModal(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al penalizar usuario')
    },
  })

  const unblockMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.put(`/auth/users/${id}/block/`, {
        is_blocked: false,
        blocked_reason: '',
        blocked_until: null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Penalización removida')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al desbloquear usuario')
    },
  })

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      user_type: 'employee',
      is_active: true,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (user: UserItem) => {
    setEditingId(user.id)
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      user_type: user.user_type,
      is_active: user.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = async (user: UserItem) => {
    setDeleteLoading(true)
    try {
      const response = await api.get(`/auth/users/${user.id}/check_delete/`)
      setDeleteConfirm({
        id: user.id,
        name: user.full_name || user.email,
        activeLoans: response.data.active_loans_count,
        pendingRequests: response.data.pending_requests_count,
        loanMaterials: response.data.loan_material_names,
      })
    } catch {
      setDeleteConfirm({ id: user.id, name: user.full_name || user.email, activeLoans: 0, pendingRequests: 0, loanMaterials: [] })
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const handleOpenBlockModal = (user: UserItem) => {
    setBlockForm({ days: 7, customDays: '', reason: '' })
    setBlockModal({ id: user.id, name: user.full_name || user.email })
  }

  const confirmBlock = () => {
    if (!blockModal) return
    const days = blockForm.customDays ? parseInt(blockForm.customDays) : blockForm.days
    if (!days || days < 1 || !blockForm.reason.trim()) return
    blockMutation.mutate({ id: blockModal.id, days, reason: blockForm.reason })
  }

  const handleCancel = () => {
    resetForm()
    setEditingId(null)
    setShowForm(false)
  }

  const statCards = [
    { label: 'Total', value: stats.total, icon: UsersIcon, color: 'text-primary', bg: 'bg-primary/20' },
    { label: 'Administradores', value: stats.admins, icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Empleados', value: stats.employees, icon: User, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Inactivos', value: stats.inactive, icon: UserX, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Penalizados', value: stats.blocked, icon: Lock, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <UsersIcon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Usuarios</h1>
              <p className="text-base text-muted-foreground mt-1">
                Administra los usuarios del sistema
              </p>
            </div>
          </div>
          {!showForm && (
            <div className="flex items-center gap-4">
              {account && maxUsers !== -1 && (
                <Badge variant={isAtUserLimit ? 'danger' : 'secondary'} className="text-sm px-3 py-1">
                  {users.length}/{maxUsers} usuarios
                </Badge>
              )}
              <Button
                onClick={() => {
                  if (isAtUserLimit) {
                    toast.error(`Has alcanzado el limite de ${maxUsers} usuarios para tu plan`)
                    return
                  }
                  setShowForm(true)
                }}
                size="lg"
                disabled={isAtUserLimit}
                className="text-base px-6"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Usuario
              </Button>
            </div>
          )}
        </div>

        {/* Limit Warning */}
        {isAtUserLimit && !showForm && (
          <div className="p-4 bg-yellow-900/20 border-2 border-yellow-500/30 rounded-xl flex items-center gap-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="text-base text-yellow-300">
              Has alcanzado el limite de {maxUsers} usuarios para tu plan <strong>{{ freemium: 'Freemium', monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' }[(account?.subscription_plan || '') as string] || account?.subscription_plan}</strong>.
              Actualiza tu plan para agregar mas usuarios.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        {!showForm && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="p-5 rounded-xl border-2 border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <span className={`text-3xl font-bold ${color}`}>
                    {value}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {!showForm && users.length > 0 && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar usuarios por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>
        )}

        {showForm ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {editingId ? <Edit2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                </div>
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Nombre completo *
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={Boolean(editingId)}
                    />
                  </div>

                  {!editingId && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                        Contrasena *
                      </label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={8}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Tipo de usuario *
                    </label>
                    <Input
                      as="select"
                      value={formData.user_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, user_type: e.target.value as UserFormData['user_type'] })}
                    >
                      <option value="inventarista">Inventarista</option>
                      <option value="employee">Empleado</option>
                    </Input>
                  </div>

                  {editingId && (
                    <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-xl border border-border/50">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <label htmlFor="is_active" className="text-base text-foreground cursor-pointer font-medium">
                        Usuario activo
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    size="lg"
                    className="text-base px-8"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Guardando...'
                      : editingId
                      ? 'Actualizar Usuario'
                      : 'Crear Usuario'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="secondary"
                    size="lg"
                    className="text-base px-6"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
                <UserCog className="h-14 w-14 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {users.length === 0 ? 'No hay usuarios' : 'No se encontraron resultados'}
              </h3>
              <p className="text-base text-muted-foreground mb-6 max-w-sm mx-auto">
                {users.length === 0
                  ? 'Crea usuarios para gestionar el acceso al sistema.'
                  : 'Intenta con otros terminos de busqueda.'}
              </p>
              {users.length === 0 && (
                <Button onClick={() => setShowForm(true)} size="lg" className="text-base px-6">
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Usuario
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredUsers.map((user: UserItem) => {
              const isAdmin = user.user_type === 'inventarista'
              const isCurrentUser = currentUser?.id === user.id
              const isBlocked = user.is_blocked === true
              const blockedUntil = user.blocked_until ? new Date(user.blocked_until) : null
              const daysLeft = blockedUntil
                ? Math.max(0, Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 0
              return (
                <Card
                  key={user.id}
                  className={`border-l-4 ${isBlocked ? 'border-l-orange-500' : isAdmin ? 'border-l-blue-500' : 'border-l-green-500'} ${!user.is_active ? 'opacity-60' : ''} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-4 p-5">
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        {/* Name + Badges */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2.5 rounded-xl ${isBlocked ? 'bg-orange-500/10' : isAdmin ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                            {isBlocked ? (
                              <Lock className="h-6 w-6 text-orange-400" />
                            ) : isAdmin ? (
                              <Shield className="h-6 w-6 text-blue-400" />
                            ) : (
                              <User className="h-6 w-6 text-green-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              {user.full_name || user.email}
                            </h3>
                          </div>
                          <div className="flex gap-2 ml-auto lg:ml-0 flex-wrap">
                            <Badge
                              variant={isAdmin ? 'default' : 'secondary'}
                              className="text-sm px-3 py-1"
                            >
                              {isAdmin ? 'Admin' : 'Empleado'}
                            </Badge>
                            {!user.is_active && (
                              <Badge variant="danger" className="text-sm px-3 py-1">
                                Inactivo
                              </Badge>
                            )}
                            {isBlocked && (
                              <Badge className="text-sm px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                Penalizado
                              </Badge>
                            )}
                            {isCurrentUser && (
                              <Badge variant="default" className="text-sm px-3 py-1 bg-primary/20 text-primary border border-primary/30">
                                Tu cuenta
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</p>
                              <p className="text-base font-medium text-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <UserCheck className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estado</p>
                              <p className={`text-base font-medium ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                {user.is_active ? 'Activo' : 'Inactivo'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Penalty Info */}
                        {isBlocked && (
                          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-3">
                            <Lock className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-orange-300">
                                {user.blocked_reason || 'Sin motivo especificado'}
                              </p>
                              {blockedUntil && (
                                <p className="text-xs text-orange-400/70 mt-0.5">
                                  {daysLeft > 0
                                    ? `Termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} · ${blockedUntil.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                    : 'Expirada — pendiente de revisión'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isCurrentUser && (
                        <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-3'} gap-3 w-full pt-2 border-t border-border/30 mt-2`}>
                          <Button
                            onClick={() => handleEdit(user)}
                            variant="secondary"
                            size="lg"
                            className="w-full text-base py-3"
                          >
                            <Edit2 className="h-5 w-5 mr-2" />
                            Editar
                          </Button>
                          {!isAdmin && (
                            isBlocked ? (
                              <Button
                                onClick={() => unblockMutation.mutate(user.id)}
                                disabled={unblockMutation.isPending}
                                size="lg"
                                className="w-full text-base py-3 bg-green-600 hover:bg-green-700 text-white border-0"
                              >
                                <Unlock className="h-5 w-5 mr-2" />
                                Desbloquear
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleOpenBlockModal(user)}
                                size="lg"
                                className="w-full text-base py-3 bg-orange-600 hover:bg-orange-700 text-white border-0"
                              >
                                <Lock className="h-5 w-5 mr-2" />
                                Penalizar
                              </Button>
                            )
                          )}
                          <Button
                            onClick={() => handleDelete(user)}
                            disabled={deleteLoading}
                            variant="destructive"
                            size="lg"
                            className="w-full text-base py-3"
                          >
                            <Trash2 className="h-5 w-5 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2 shadow-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    Eliminar Usuario
                  </CardTitle>
                  <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base text-foreground">
                  ¿Estás seguro de eliminar a <strong>{deleteConfirm.name}</strong>?
                </p>

                {(deleteConfirm.activeLoans > 0 || deleteConfirm.pendingRequests > 0) && (
                  <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-3">
                    {deleteConfirm.activeLoans > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-amber-400" />
                          <p className="text-sm font-medium text-amber-300">
                            {deleteConfirm.activeLoans} préstamo(s) activo(s)
                          </p>
                        </div>
                        <div className="space-y-1">
                          {deleteConfirm.loanMaterials.map((name, i) => (
                            <p key={i} className="text-sm text-foreground/80 pl-7">• {name}</p>
                          ))}
                        </div>
                      </>
                    )}
                    {deleteConfirm.pendingRequests > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-400" />
                        <p className="text-sm font-medium text-amber-300">
                          {deleteConfirm.pendingRequests} solicitud(es) pendiente(s)
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-amber-400/80 pl-7">
                      Los préstamos y solicitudes de este usuario se mantendrán en el historial.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    onClick={() => setDeleteConfirm(null)}
                    variant="secondary"
                    size="lg"
                    className="text-base py-3"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmDelete}
                    variant="destructive"
                    size="lg"
                    className="text-base py-3"
                  >
                    <Trash2 className="h-5 w-5 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Block / Penalize Modal */}
        {blockModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2 shadow-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-xl">
                      <Lock className="h-6 w-6 text-orange-400" />
                    </div>
                    Penalizar Usuario
                  </CardTitle>
                  <button onClick={() => setBlockModal(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-base text-foreground">
                  Penalizar a <strong>{blockModal.name}</strong>. No podrá crear solicitudes durante la penalización.
                </p>

                {/* Duration presets */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 uppercase tracking-wider">
                    Duración
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {DAY_PRESETS.map((d) => {
                      const isSelected = !blockForm.customDays && blockForm.days === d
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setBlockForm(prev => ({ ...prev, days: d, customDays: '' }))}
                          className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                              : 'border-border bg-secondary/20 text-muted-foreground hover:border-orange-500/50'
                          }`}
                        >
                          {d} día{d !== 1 ? 's' : ''}
                        </button>
                      )
                    })}
                  </div>
                  <Input
                    type="number"
                    placeholder="Otro número de días..."
                    value={blockForm.customDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setBlockForm(prev => ({ ...prev, customDays: e.target.value, days: parseInt(e.target.value) || 0 }))
                    }
                    min={1}
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Motivo *
                  </label>
                  <textarea
                    className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
                    placeholder="Ej: Préstamo no devuelto a tiempo..."
                    rows={3}
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={() => setBlockModal(null)}
                    variant="secondary"
                    size="lg"
                    className="text-base py-3"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmBlock}
                    disabled={
                      blockMutation.isPending ||
                      !blockForm.reason.trim() ||
                      (blockForm.customDays ? parseInt(blockForm.customDays) < 1 : blockForm.days < 1)
                    }
                    size="lg"
                    className="text-base py-3 bg-orange-600 hover:bg-orange-700 text-white border-0"
                  >
                    <Lock className="h-5 w-5 mr-2" />
                    {blockMutation.isPending ? 'Penalizando...' : 'Penalizar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
