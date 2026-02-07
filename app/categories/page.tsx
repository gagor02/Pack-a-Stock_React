'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  FolderOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  PackageX,
  Flame,
} from 'lucide-react'

interface CategoryFormData {
  name: string
  is_consumable: boolean
}

export default function CategoriesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
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

  const { data: categoriesResponse = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/materials/categories/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse?.results ?? []

  // Filter categories
  const filteredCategories = categories.filter((category: any) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filterType === ''
        ? true
        : filterType === 'consumable'
        ? category.is_consumable
        : !category.is_consumable
    return matchesSearch && matchesFilter
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
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
              <p className="text-sm text-muted-foreground">
                Organiza tus materiales por categorías
              </p>
            </div>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nueva Categoría
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        {!showForm && categories.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar categorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter */}
                <Input
                  as="select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="md:w-48"
                >
                  <option value="">Todas</option>
                  <option value="consumable">Consumibles</option>
                  <option value="non-consumable">No Consumibles</option>
                </Input>
              </div>
            </CardContent>
          </Card>
        )}

        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Herramientas, Electrónica, Consumibles"
                  />
                </div>

                <div className="flex items-center gap-2 p-4 bg-secondary/20 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_consumable"
                    checked={formData.is_consumable}
                    onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_consumable" className="text-sm text-foreground cursor-pointer">
                    <Flame className="h-4 w-4 inline mr-1 text-warning" />
                    Es consumible (se descuenta automáticamente al prestar)
                  </label>
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
                      ? 'Actualizar Categoría'
                      : 'Crear Categoría'}
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
        ) : filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <PackageX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {categories.length === 0 ? 'No hay categorías' : 'No se encontraron resultados'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {categories.length === 0
                  ? 'Crea categorías para organizar tus materiales.'
                  : 'Intenta con otros términos de búsqueda.'}
              </p>
              {categories.length === 0 && (
                <Button onClick={() => setShowForm(true)} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Categoría
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((category: any) => (
              <Card key={category.id} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {category.is_consumable ? (
                        <Flame className="h-6 w-6 text-warning" />
                      ) : (
                        <Tag className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    {category.is_consumable && (
                      <Badge variant="warning" className="text-xs">
                        Consumible
                      </Badge>
                    )}
                  </div>

                  {/* Category Name */}
                  <h3 className="font-semibold text-foreground text-lg mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {category.is_consumable
                      ? 'Se descuenta al prestar'
                      : 'Retornable'}
                  </p>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleEdit(category)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(category.id)}
                      variant="danger"
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
