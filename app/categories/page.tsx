'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Layers,
  Package,
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

  const stats = useMemo(() => ({
    total: categories.length,
    consumable: categories.filter((c: any) => c.is_consumable).length,
    nonConsumable: categories.filter((c: any) => !c.is_consumable).length,
  }), [categories])

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
      toast.success('Categoria creada exitosamente')
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear categoria'
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
      toast.success('Categoria actualizada exitosamente')
      setShowForm(false)
      setEditingId(null)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar categoria'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/materials/categories/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoria eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar categoria'
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
    if (confirm('¿Estas seguro de eliminar esta categoria?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  const statCards = [
    { label: 'Total', value: stats.total, icon: Layers, color: 'text-primary', bg: 'bg-primary/20' },
    { label: 'Consumibles', value: stats.consumable, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/20' },
    { label: 'No Consumibles', value: stats.nonConsumable, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <FolderOpen className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Categorias</h1>
              <p className="text-base text-muted-foreground mt-1">
                Organiza tus materiales por categorias
              </p>
            </div>
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              size="lg"
              className="text-base px-6"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nueva Categoria
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        {!showForm && (
          <div className="grid grid-cols-3 gap-4">
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

        {/* Search and Filter */}
        {!showForm && categories.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar categorias por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors md:w-52"
            >
              <option value="">Todas</option>
              <option value="consumable">Consumibles</option>
              <option value="non-consumable">No Consumibles</option>
            </select>
          </div>
        )}

        {showForm ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {editingId ? <Edit2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                </div>
                {editingId ? 'Editar Categoria' : 'Nueva Categoria'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Nombre *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Herramientas, Electronica, Consumibles"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-xl border border-border/50">
                  <input
                    type="checkbox"
                    id="is_consumable"
                    checked={formData.is_consumable}
                    onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_consumable" className="text-base text-foreground cursor-pointer font-medium">
                    <Flame className="h-4 w-4 inline mr-2 text-orange-400" />
                    Es consumible (se descuenta automaticamente al prestar)
                  </label>
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
                      ? 'Actualizar Categoria'
                      : 'Crear Categoria'}
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
            <p className="text-base text-muted-foreground">Cargando categorias...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
                <PackageX className="h-14 w-14 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {categories.length === 0 ? 'No hay categorias' : 'No se encontraron resultados'}
              </h3>
              <p className="text-base text-muted-foreground mb-6 max-w-sm mx-auto">
                {categories.length === 0
                  ? 'Crea categorias para organizar tus materiales.'
                  : 'Intenta con otros terminos de busqueda.'}
              </p>
              {categories.length === 0 && (
                <Button onClick={() => setShowForm(true)} size="lg" className="text-base px-6">
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Categoria
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredCategories.map((category: any) => (
              <Card
                key={category.id}
                className={`border-l-4 ${category.is_consumable ? 'border-l-orange-500' : 'border-l-blue-500'} hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-5">
                    {/* Category Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + Badge */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2.5 rounded-xl ${category.is_consumable ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                          {category.is_consumable ? (
                            <Flame className="h-6 w-6 text-orange-400" />
                          ) : (
                            <Tag className="h-6 w-6 text-blue-400" />
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                          {category.name}
                        </h3>
                        <div className="ml-auto">
                          <Badge
                            variant={category.is_consumable ? 'warning' : 'default'}
                            className="text-sm px-3 py-1"
                          >
                            {category.is_consumable ? 'Consumible' : 'No Consumible'}
                          </Badge>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className={`p-2 rounded-lg ${category.is_consumable ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                            <FolderOpen className={`h-4 w-4 ${category.is_consumable ? 'text-orange-400' : 'text-blue-400'}`} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tipo</p>
                            <p className="text-base font-medium text-foreground">
                              {category.is_consumable ? 'Se descuenta al prestar' : 'Retornable'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Layers className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Categoria</p>
                            <p className="text-base font-medium text-foreground">{category.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-border/30 mt-2">
                      <Button
                        onClick={() => handleEdit(category)}
                        variant="secondary"
                        size="lg"
                        className="w-full text-base py-3"
                      >
                        <Edit2 className="h-5 w-5 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(category.id)}
                        variant="destructive"
                        size="lg"
                        className="w-full text-base py-3"
                      >
                        <Trash2 className="h-5 w-5 mr-2" />
                        Eliminar
                      </Button>
                    </div>
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
