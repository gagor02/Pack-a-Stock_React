'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface CategoryFormData {
  name: string
  is_consumable: boolean
}

export default function CategoriesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    is_consumable: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/materials/categories/')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await api.post('/materials/categories/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría creada exitosamente')
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear categoría'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormData }) => {
      const response = await api.put(`/materials/categories/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría actualizada exitosamente')
      setShowForm(false)
      setEditingId(null)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar categoría'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/materials/categories/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar categoría'
      toast.error(message)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      is_consumable: false,
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

  const handleEdit = (category: any) => {
    setEditingId(category.id)
    setFormData({
      name: category.name,
      is_consumable: category.is_consumable,
    })
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta categoría?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Volver
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Nueva Categoría
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm ? (
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <h2 className="text-xl font-semibold mb-6">
              {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ej: Herramientas, Electrónica, Consumibles"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_consumable"
                  checked={formData.is_consumable}
                  onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_consumable" className="ml-2 block text-sm text-gray-900">
                  Es consumible (se descuenta automáticamente al prestar)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingId
                    ? 'Actualizar'
                    : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay categorías</h3>
            <p className="mt-1 text-sm text-gray-500">
              Crea categorías para organizar tus materiales.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Agregar Categoría
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category: any) => (
              <div key={category.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  {category.is_consumable && (
                    <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                      Consumible
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
