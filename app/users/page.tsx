'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

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
      toast.success('Usuario creado')
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
      toast.success('Usuario actualizado')
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
      toast.success('Usuario eliminado')
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Volver
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Nuevo Usuario
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                <input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  required
                  disabled={Boolean(editingId)}
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    required
                    minLength={8}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de usuario</label>
                <select
                  value={formData.user_type}
                  onChange={(e) => setFormData({ ...formData, user_type: e.target.value as UserFormData['user_type'] })}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="inventarista">Inventarista</option>
                  <option value="empleado">Empleado</option>
                </select>
              </div>
              {editingId && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Usuario activo</span>
                </div>
              )}
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingId ? 'Guardar cambios' : 'Crear usuario'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="border px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Lista de usuarios</h2>
          </div>
          {isLoading ? (
            <div className="p-6">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-gray-600">No hay usuarios registrados.</div>
          ) : (
            <div className="divide-y">
              {users.map((user: UserItem) => (
                <div key={user.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {user.full_name || user.email}
                    </div>
                    <div className="text-sm text-gray-600">
                      {user.email} · {user.user_type}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="px-3 py-2 text-sm rounded-lg bg-amber-500 text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
