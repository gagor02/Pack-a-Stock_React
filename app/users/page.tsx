'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'

interface UserItem {
  id: number
  email: string
  full_name?: string
  user_type: 'inventarista' | 'empleado'
  is_active: boolean
}

interface UserFormData {
  email: string
  full_name: string
  password: string
  user_type: 'inventarista' | 'empleado'
  is_active: boolean
}

export default function UsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    password: '',
    user_type: 'empleado',
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

  const users = Array.isArray(usersResponse)
    ? usersResponse
    : usersResponse?.results ?? []

  // Filter users
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
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al crear usuario')
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

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      user_type: 'empleado',
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

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este usuario?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    resetForm()
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UsersIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
              <p className="text-sm text-muted-foreground">
                Administra los usuarios del sistema
              </p>
            </div>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Usuario
            </Button>
          )}
        </div>

        {/* Search */}
        {!showForm && users.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nombre completo *
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
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
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Contraseña *
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
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tipo de usuario *
                    </label>
                    <Input
                      as="select"
                      value={formData.user_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, user_type: e.target.value as UserFormData['user_type'] })}
                    >
                      <option value="inventarista">Inventarista</option>
                      <option value="empleado">Empleado</option>
                    </Input>
                  </div>

                  {editingId && (
                    <div className="flex items-center gap-2 p-4 bg-secondary/20 rounded-lg">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <label htmlFor="is_active" className="text-sm text-foreground cursor-pointer">
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
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserCog className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {users.length === 0 ? 'No hay usuarios' : 'No se encontraron resultados'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {users.length === 0
                  ? 'Crea usuarios para gestionar el acceso al sistema.'
                  : 'Intenta con otros términos de búsqueda.'}
              </p>
              {users.length === 0 && (
                <Button onClick={() => setShowForm(true)} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Usuario
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user: UserItem) => (
              <Card key={user.id} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {user.user_type === 'inventarista' ? (
                        <Shield className="h-6 w-6 text-primary" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={user.user_type === 'inventarista' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.user_type === 'inventarista' ? 'Admin' : 'Empleado'}
                      </Badge>
                      {!user.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* User Name */}
                  <h3 className="font-semibold text-foreground text-lg mb-1">
                    {user.full_name || user.email}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {user.email}
                  </p>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleEdit(user)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(user.id)}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
